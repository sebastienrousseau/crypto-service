/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command, Option } from "commander";
import { protocols } from "@sebastienrousseau/crypto-lib";
import { emit, UsageError, type RunContext } from "./io";
import {
  PASSWORD_FLAGS,
  readSecret,
  withSecretOptions,
  type SecretSource,
} from "./secrets";

const { pake } = protocols;
type SuiteId = protocols.pake.SuiteId;

const SUITE_CHOICES: readonly SuiteId[] = [
  "P256-SHA256",
  "ristretto255-SHA512",
];

const DEFAULT_SERVER_URL = "http://localhost:3000";

/** Options accepted by `opaque` subcommands. */
interface OpaqueOptions {
  serverUrl?: string;
  suite?: SuiteId;
  passwordFile?: string;
  passwordStdin?: boolean;
  json?: boolean;
}

/** Convert a hex string to Uint8Array. */
function parseHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/** Convert a Uint8Array to lowercase hex string. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** Resolve the effective server URL from options or environment. */
function getServerUrl(opts: OpaqueOptions): string {
  return (
    opts.serverUrl || process.env["CRYPTO_SERVER_URL"] || DEFAULT_SERVER_URL
  );
}

/** Send a POST request with JSON body and return parsed response data. */
async function postJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `failed to connect to server at ${url}: ${(err as Error).message}`,
      { cause: err },
    );
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (parseErr) {
    throw new Error(
      `server returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 100)}`,
      { cause: parseErr },
    );
  }
  if (!res.ok) {
    const p = json as { detail?: string; title?: string };
    const msg = p.detail ?? p.title ?? `HTTP ${res.status}`;
    throw new Error(`OPAQUE server error (${res.status}): ${msg}`);
  }
  return json as T;
}

/** Prompt for password on terminal. */
async function promptPassword(
  ctx: RunContext,
  confirm: boolean,
): Promise<string> {
  const ask = ctx.io.promptSecret;
  if (ask === undefined) {
    throw new UsageError(
      "missing password: pass --password-file <path> or " +
        "--password-stdin (a prompt needs a terminal on stdin)",
    );
  }
  const password = (await ask("Password")) ?? "";
  if (confirm && (await ask("Repeat the password")) !== password) {
    throw new Error("the passwords do not match");
  }
  return password;
}

/** Read password from options or terminal prompt. */
async function readPassword(
  ctx: RunContext,
  opts: OpaqueOptions,
  confirm: boolean,
): Promise<string> {
  const source: SecretSource = {
    file: opts.passwordFile,
    stdin: opts.passwordStdin,
  };
  const raw = await readSecret({
    io: ctx.io,
    source,
    flags: PASSWORD_FLAGS,
    dataOnStdin: false,
    checkMode: true,
  });
  const password =
    raw === undefined
      ? await promptPassword(ctx, confirm)
      : raw.toString("utf8").replace(/\r?\n$/, "");
  if (password === "") throw new Error("the password is empty");
  return password;
}

/** Generate server long-term secrets and fake record. */
async function handleSetup(
  ctx: RunContext,
  opts: OpaqueOptions,
): Promise<void> {
  const suite = opts.suite as SuiteId;
  const setup = pake.createServerSetup({ suite });
  const fake = pake.createFakeRecord({ suite });
  const result = {
    suite,
    serverPublicKey: toHex(setup.serverPublicKey),
    serverPrivateKey: toHex(setup.serverPrivateKey),
    oprfSeed: toHex(setup.oprfSeed),
    fakeRecord: toHex(pake.serializeRegistrationRecord(fake)),
  };
  const formatted = [
    `OPAQUE Server Setup (${suite}):`,
    `Server Public Key:  ${result.serverPublicKey}`,
    `Server Private Key: ${result.serverPrivateKey}`,
    `OPRF Seed:          ${result.oprfSeed}`,
    `Fake Record:        ${result.fakeRecord}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), result, formatted);
}

/** Perform client-side registration with OPAQUE server. */
async function handleRegister(
  id: string,
  ctx: RunContext,
  opts: OpaqueOptions,
): Promise<void> {
  const suite = opts.suite as SuiteId;
  const serverUrl = getServerUrl(opts);
  const password = await readPassword(ctx, opts, true);

  const { request, blind } = pake.createRegistrationRequest(password, {
    suite,
  });
  const initRes = await postJson<{ data: { response: string } }>(
    serverUrl,
    "/v2/opaque/register/init",
    {
      credentialIdentifier: id,
      request: toHex(pake.serializeRegistrationRequest(request)),
      suite,
    },
  );

  const responseBytes = parseHex(initRes.data.response);
  const regResponse = pake.deserializeRegistrationResponse(
    responseBytes,
    suite,
  );
  const { record, exportKey } = pake.finalizeRegistrationRequest(
    password,
    blind,
    regResponse,
    {},
    { suite },
  );

  await postJson(serverUrl, "/v2/opaque/register/finish", {
    credentialIdentifier: id,
    record: toHex(pake.serializeRegistrationRecord(record)),
    suite,
  });

  const result = {
    status: "registered",
    credentialIdentifier: id,
    suite,
    exportKey: toHex(exportKey),
  };
  emit(
    ctx.io,
    Boolean(opts.json),
    result,
    `Registered credential '${id}' successfully`,
  );
}

/** Perform client-side login handshake with OPAQUE server. */
async function handleLogin(
  id: string,
  ctx: RunContext,
  opts: OpaqueOptions,
): Promise<void> {
  const suite = opts.suite as SuiteId;
  const serverUrl = getServerUrl(opts);
  const password = await readPassword(ctx, opts, false);

  const client = pake.generateKE1(password, { suite });
  const initRes = await postJson<{ data: { sessionId: string; ke2: string } }>(
    serverUrl,
    "/v2/opaque/login/init",
    {
      credentialIdentifier: id,
      ke1: toHex(pake.serializeKE1(client.ke1)),
      suite,
    },
  );

  const ke2Bytes = parseHex(initRes.data.ke2);
  const ke2 = pake.deserializeKE2(ke2Bytes, suite);
  const { ke3, sessionKey, exportKey } = pake.generateKE3(
    client.state,
    ke2,
    {},
  );

  const finishRes = await postJson<{ data: { sessionKey: string } }>(
    serverUrl,
    "/v2/opaque/login/finish",
    {
      sessionId: initRes.data.sessionId,
      ke3: toHex(pake.serializeKE3(ke3)),
    },
  );

  const expectedKey = toHex(sessionKey);
  if (finishRes.data.sessionKey !== expectedKey) {
    throw new Error("server session key does not match client session key");
  }

  const result = {
    status: "authenticated",
    credentialIdentifier: id,
    suite,
    sessionKey: expectedKey,
    exportKey: toHex(exportKey),
  };
  emit(
    ctx.io,
    Boolean(opts.json),
    result,
    `Authenticated as '${id}'. Session key: ${expectedKey}`,
  );
}

/** Register `opaque setup`. */
function registerSetup(parent: Command, ctx: RunContext): void {
  parent
    .command("setup")
    .description("Generate server long-term keys and fake record")
    .addOption(
      new Option("-s, --suite <name>", "ciphersuite")
        .choices(SUITE_CHOICES)
        .default("P256-SHA256"),
    )
    .option("--json", "print result as JSON")
    .action(async (opts: OpaqueOptions) => handleSetup(ctx, opts));
}

/** Register `opaque register <id>`. */
function registerRegister(parent: Command, ctx: RunContext): void {
  withSecretOptions(
    parent
      .command("register <id>")
      .description("Register a password with an OPAQUE server")
      .option("-u, --server-url <url>", "server base URL")
      .addOption(
        new Option("-s, --suite <name>", "ciphersuite")
          .choices(SUITE_CHOICES)
          .default("P256-SHA256"),
      )
      .option("--json", "print result as JSON"),
    PASSWORD_FLAGS,
    {
      what: "password",
      format: "one trailing line break is ignored",
      takesData: false,
    },
  ).action(async (id: string, opts: OpaqueOptions) =>
    handleRegister(id, ctx, opts),
  );
}

/** Register `opaque login <id>`. */
function registerLogin(parent: Command, ctx: RunContext): void {
  withSecretOptions(
    parent
      .command("login <id>")
      .description("Authenticate against an OPAQUE server")
      .option("-u, --server-url <url>", "server base URL")
      .addOption(
        new Option("-s, --suite <name>", "ciphersuite")
          .choices(SUITE_CHOICES)
          .default("P256-SHA256"),
      )
      .option("--json", "print result as JSON"),
    PASSWORD_FLAGS,
    {
      what: "password",
      format: "one trailing line break is ignored",
      takesData: false,
    },
  ).action(async (id: string, opts: OpaqueOptions) =>
    handleLogin(id, ctx, opts),
  );
}

/** Register the `opaque` command group. */
export const registerOpaque = (program: Command, ctx: RunContext): Command => {
  const opaque = program
    .command("opaque")
    .description("OPAQUE zero-knowledge password authentication (RFC 9807)")
    .helpCommand(false);
  registerSetup(opaque, ctx);
  registerRegister(opaque, ctx);
  registerLogin(opaque, ctx);
  return opaque;
};
