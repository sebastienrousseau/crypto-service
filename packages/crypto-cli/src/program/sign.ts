/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { readFile } from "node:fs/promises";
import { Command, Option } from "commander";
import {
  ed25519Sign,
  ed25519Verify,
  ed448Sign,
  ed448Verify,
  mlDsaSign,
  mlDsaVerify,
  p256Sign,
  p256Verify,
  p384Sign,
  p384Verify,
  type MlDsaLevel,
} from "@sebastienrousseau/crypto-lib/modern";
import {
  EXIT,
  emit,
  isStdin,
  readInput,
  UsageError,
  valueOrJsonField,
  type RunContext,
} from "./io";
import {
  KEY_FLAGS,
  requireSecret,
  withSecretOptions,
  type SecretSource,
} from "./secrets";

/** Sign and verify with one algorithm; keys and signatures are hex. */
interface Signer {
  sign: (privateKey: string, message: Uint8Array) => string;
  verify: (
    publicKey: string,
    message: Uint8Array,
    signature: string,
  ) => boolean;
}

/** An ML-DSA {@link Signer} for one security level. */
const mlDsa = (level: MlDsaLevel): Signer => ({
  sign: (key, msg) => mlDsaSign(level, key, msg).signature,
  verify: (key, msg, sig) => mlDsaVerify(level, key, msg, sig).valid,
});

/**
 * The signing algorithms of `crypto-cli keygen`, by the `algorithm` its
 * `--json` output records.
 */
const SIGNERS: Record<string, Signer> = {
  ed25519: {
    sign: (key, msg) => ed25519Sign(key, msg).signature,
    verify: (key, msg, sig) => ed25519Verify(key, msg, sig).valid,
  },
  ed448: {
    sign: (key, msg) => ed448Sign(key, msg).signature,
    verify: (key, msg, sig) => ed448Verify(key, msg, sig).valid,
  },
  p256: {
    sign: (key, msg) => p256Sign(key, msg).signature,
    verify: (key, msg, sig) => p256Verify(key, msg, sig).valid,
  },
  p384: {
    sign: (key, msg) => p384Sign(key, msg).signature,
    verify: (key, msg, sig) => p384Verify(key, msg, sig).valid,
  },
  "ml-dsa-44": mlDsa(44),
  "ml-dsa-65": mlDsa(65),
  "ml-dsa-87": mlDsa(87),
};

/** The algorithms `sign` and `verify` accept. */
export const SIGNING_ALGORITHMS = Object.keys(SIGNERS);

/** A whole number of bytes in hexadecimal. */
const HEX = /^(?:[0-9a-fA-F]{2})+$/;

/** A key from a key file, with the part one command needs. */
interface LoadedKey {
  algorithm: string;
  kid?: string | undefined;
  material: string;
  signer: Signer;
}

/** `value` as a record, or an empty one when it is not an object. */
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

/** The JSON value in a key file. */
const parseJson = (raw: Buffer): unknown => {
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new Error("the key file is not JSON from crypto-cli keygen --json");
  }
};

/**
 * The `algorithm` and `field` of a key file written by
 * `crypto-cli keygen --json`.
 *
 * @param raw - The key file contents.
 * @param field - `privateKey` to sign, `publicKey` to verify.
 * @throws When the file is not such a key, or not of a signing
 *   algorithm.
 */
export const parseKeyFile = (
  raw: Buffer,
  field: "privateKey" | "publicKey",
): LoadedKey => {
  const key = asRecord(parseJson(raw));
  const { algorithm, kid } = key;
  if (typeof algorithm !== "string" || !Object.hasOwn(SIGNERS, algorithm)) {
    throw new Error(
      `the key must be a signing key from crypto-cli keygen --json ` +
        `(${SIGNING_ALGORITHMS.join(", ")})`,
    );
  }
  const material = key[field];
  if (typeof material !== "string") {
    throw new Error(`the key file has no ${field}`);
  }
  return {
    algorithm,
    kid: typeof kid === "string" ? kid : undefined,
    material,
    signer: SIGNERS[algorithm],
  };
};

/** Options of `sign`. */
interface SignOptions {
  keyFile?: string;
  keyStdin?: boolean;
  json?: boolean;
}

/** Options of `verify`. */
interface VerifyOptions extends SignOptions {
  signature?: string;
  signatureFile?: string;
}

/** Read and parse the key of a `sign` or `verify` run. */
const readKey = async (
  ctx: RunContext,
  opts: SignOptions,
  file: string | undefined,
  field: "privateKey" | "publicKey",
) => {
  const source: SecretSource = { file: opts.keyFile, stdin: opts.keyStdin };
  const raw = await requireSecret(
    {
      io: ctx.io,
      source,
      flags: KEY_FLAGS,
      dataOnStdin: isStdin(file),
      // A public key is not a secret.
      checkMode: field === "privateKey",
    },
    "key",
  );
  return parseKeyFile(raw, field);
};

/** The `--json` option. */
const JSON_OPTION = ["--json", "print the result as one line of JSON"] as const;

/** Add the `[file]` and key arguments of `sign` or `verify`. */
const signatureCommand = (
  program: Command,
  name: string,
  description: string,
  key: { what: string; format: string },
) =>
  withSecretOptions(
    program
      .command(name)
      .description(description)
      .argument(
        "[file]",
        `file to ${name}; '-' or omitted reads standard input`,
      ),
    KEY_FLAGS,
    { ...key, takesData: true },
  );

/**
 * Register `sign [file]`: sign with the private key of a
 * `keygen --json` file and print the signature in hex.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerSign = (program: Command, ctx: RunContext) =>
  signatureCommand(
    program,
    "sign",
    "Sign a file with a key pair from keygen --json and print the " +
      "signature in hex",
    {
      what: "key pair",
      format: `keygen --json output (${SIGNING_ALGORITHMS.join(", ")})`,
    },
  )
    .option(...JSON_OPTION)
    .action(async (file: string | undefined, opts: SignOptions) => {
      const key = await readKey(ctx, opts, file, "privateKey");
      const signature = key.signer.sign(
        key.material,
        await readInput(file, ctx.io),
      );
      const result = { signature, algorithm: key.algorithm, kid: key.kid };
      emit(ctx.io, Boolean(opts.json), result, signature);
    });

/**
 * The signature of a `verify` run: `--signature <hex>`, or a file with
 * the hex `sign` printed or its `--json` line.
 */
const readSignature = async (opts: VerifyOptions) => {
  if (opts.signature !== undefined) return opts.signature.trim();
  if (opts.signatureFile === undefined) {
    throw new UsageError(
      "missing signature: pass --signature <hex> or --signature-file <path>",
    );
  }
  return valueOrJsonField(await readFile(opts.signatureFile), "signature");
};

/** Whether `signature` verifies, false when a primitive rejects it. */
const checkSignature = (key: LoadedKey, data: Buffer, signature: string) => {
  if (!HEX.test(signature)) return false;
  try {
    return key.signer.verify(key.material, data, signature);
  } catch {
    return false;
  }
};

/**
 * Register `verify [file]`: exit code 1 and `valid: false` when the
 * signature does not verify.
 *
 * @param program - The root command.
 * @param ctx - The run context.
 */
export const registerVerify = (program: Command, ctx: RunContext) =>
  signatureCommand(
    program,
    "verify",
    "Verify a signature from sign; exits 1 when it is not valid",
    {
      what: "public key",
      format: "keygen --json output, or JSON with algorithm and publicKey",
    },
  )
    .addOption(
      new Option("--signature <hex>", "the signature, in hex").conflicts(
        "signatureFile",
      ),
    )
    .option(
      "--signature-file <path>",
      "read the signature from a file (sign output or its --json line)",
    )
    .option(...JSON_OPTION)
    .action(async (file: string | undefined, opts: VerifyOptions) => {
      const signature = await readSignature(opts);
      const key = await readKey(ctx, opts, file, "publicKey");
      const valid = checkSignature(
        key,
        await readInput(file, ctx.io),
        signature,
      );
      const result = { valid, algorithm: key.algorithm, kid: key.kid };
      emit(ctx.io, Boolean(opts.json), result, valid ? "valid" : "invalid");
      if (!valid) ctx.exitCode = EXIT.FAILURE;
    });
