/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks One request on the success path of every route the server
 * registers, run in order against a single app (later steps use keys the
 * earlier ones generate). The response-contract test records the shape of
 * each answer, so a response schema that drops or retypes a field fails
 * it.
 */

import type { FastifyInstance, InjectOptions } from "fastify";
import * as openpgp from "openpgp";
import * as path from "path";
import { readFileSync } from "fs";
import { protocols } from "@sebastienrousseau/crypto-lib";
import {
  generateEd25519KeyPair,
  mlDsaKeygen,
  signIso20022Payment,
} from "@sebastienrousseau/crypto-lib";

const { pake } = protocols;

/** The crypto-lib test keystore (passphrase "123456789abcdef"). */
export const FIXTURE_KEYS = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "crypto-lib",
  "__tests__",
  "fixtures",
  "keys",
);

/** Passphrase of the fixture keystore. */
export const FIXTURE_PASSPHRASE = "123456789abcdef";

/** One observed answer. */
export interface Observation {
  /** `"<METHOD> <route>"`, with `#<variant>` when a route is called twice. */
  readonly name: string;
  readonly status: number;
  /** Media type, without parameters. */
  readonly mediaType: string;
  /** Parsed JSON body, or the raw text for a non-JSON answer. */
  readonly body: unknown;
}

/** Values earlier steps hand to later ones. */
type Context = Record<string, string>;

/** A request, possibly built from the context. */
interface Step {
  readonly name: string;
  readonly request: (ctx: Context) => InjectOptions | Promise<InjectOptions>;
  /** Copy values from the parsed answer into the context. */
  readonly keep?: (
    body: { data?: Record<string, unknown> },
    ctx: Context,
  ) => void;
}

const HEX32 =
  "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
const HEX16 = "000102030405060708090a0b0c0d0e0f";

const post = (url: string, payload: object): InjectOptions => ({
  method: "POST",
  url,
  payload,
});

const get = (url: string): InjectOptions => ({ method: "GET", url });

/** Keep `data.<field>` as `ctx[as]`. */
const keepField =
  (pairs: Record<string, string>) =>
  (body: { data?: Record<string, unknown> }, ctx: Context): void => {
    for (const [as, field] of Object.entries(pairs)) {
      ctx[as] = String(body.data?.[field]);
    }
  };

/** Metadata, probe and compliance routes. */
const META_STEPS: Step[] = [
  { name: "GET /", request: () => get("/") },
  { name: "GET /v2/algorithms", request: () => get("/v2/algorithms") },
  {
    name: "GET /v2/compliance/dora",
    request: () => get("/v2/compliance/dora"),
  },
  {
    name: "GET /v2/compliance/cbom",
    request: () => get("/v2/compliance/cbom"),
  },
  { name: "GET /health", request: () => get("/health") },
  { name: "GET /live", request: () => get("/live") },
  { name: "GET /ready", request: () => get("/ready") },
  { name: "GET /metrics", request: () => get("/metrics") },
];

/** Stateless symmetric, hashing and MAC routes. */
const SYMMETRIC_STEPS: Step[] = [
  {
    name: "POST /v2/encrypt",
    request: () => post("/v2/encrypt", { key: HEX32, plaintext: "hello" }),
    keep: keepField({ aead: "ciphertext" }),
  },
  {
    name: "POST /v2/decrypt",
    request: (c) => post("/v2/decrypt", { key: HEX32, ciphertext: c["aead"]! }),
  },
  {
    name: "POST /v2/hash",
    request: () => post("/v2/hash", { algorithm: "sha256", data: "abc" }),
  },
  {
    name: "POST /v2/kdf",
    request: () =>
      post("/v2/kdf", {
        algorithm: "hkdf-sha256",
        password: "password",
        salt: HEX16,
        keyLength: 32,
      }),
  },
  {
    name: "POST /v2/hmac",
    request: () =>
      post("/v2/hmac", { algorithm: "sha256", key: HEX32, data: "abc" }),
    keep: keepField({ mac: "mac" }),
  },
  {
    name: "POST /v2/hmac/verify",
    request: (c) =>
      post("/v2/hmac/verify", {
        algorithm: "sha256",
        key: HEX32,
        data: "abc",
        mac: c["mac"]!,
      }),
  },
  {
    name: "POST /v2/secretbox/seal",
    request: () =>
      post("/v2/secretbox/seal", { key: HEX32, plaintext: "hi", aad: "ctx" }),
    keep: keepField({ sealed: "sealed" }),
  },
  {
    name: "POST /v2/secretbox/open",
    request: (c) =>
      post("/v2/secretbox/open", {
        key: HEX32,
        ciphertext: c["sealed"]!,
        aad: "ctx",
      }),
  },
  {
    name: "POST /v2/keys/wrap",
    request: () => post("/v2/keys/wrap", { kek: HEX32, keyToWrap: HEX16 }),
    keep: keepField({ wrapped: "wrapped" }),
  },
  {
    name: "POST /v2/keys/unwrap",
    request: (c) =>
      post("/v2/keys/unwrap", { kek: HEX32, wrappedKey: c["wrapped"]! }),
  },
];

/** Password hashing and password-based encryption (Argon2id, slow). */
const PASSWORD_STEPS: Step[] = [
  {
    name: "POST /v2/password/hash",
    request: () =>
      post("/v2/password/hash", {
        password: "pw",
        timeCost: 2,
        memoryCost: 19456,
        parallelism: 1,
      }),
    keep: (body, ctx) => {
      const d = body.data as Record<string, unknown>;
      ctx["pwHash"] = JSON.stringify(d);
    },
  },
  {
    name: "POST /v2/password/verify",
    request: (c) => {
      const h = JSON.parse(c["pwHash"]!) as Record<string, unknown>;
      return post("/v2/password/verify", {
        password: "pw",
        hash: h["hash"],
        salt: h["salt"],
        params: h["params"],
      });
    },
  },
  {
    name: "POST /v2/password/encrypt",
    request: () =>
      post("/v2/password/encrypt", { password: "pw", plaintext: "secret" }),
    keep: (body, ctx) => {
      ctx["pwCt"] = String((body.data as Record<string, unknown>)["encrypted"]);
    },
  },
  {
    name: "POST /v2/password/decrypt",
    request: (c) =>
      post("/v2/password/decrypt", { password: "pw", ciphertext: c["pwCt"]! }),
  },
];

/** Server-held keys: generation, signing, export and deletion. */
const KEY_STEPS: Step[] = [
  {
    name: "POST /v2/keys/generate",
    request: () =>
      post("/v2/keys/generate", {
        algorithm: "ed25519",
        metadata: { kid: "k1", use: "sig", exp: "2099-01-01T00:00:00Z" },
      }),
    keep: keepField({ edKeyId: "keyId", edPub: "publicKey" }),
  },
  {
    name: "POST /v2/keys/generate#x25519",
    request: () => post("/v2/keys/generate", { algorithm: "x25519" }),
    keep: keepField({ xKeyId: "keyId", xPub: "publicKey" }),
  },
  {
    name: "POST /v2/sign",
    request: (c) => post("/v2/sign", { keyId: c["edKeyId"]!, message: "m" }),
    keep: keepField({ edSig: "signature" }),
  },
  {
    name: "POST /v2/verify",
    request: (c) =>
      post("/v2/verify", {
        publicKey: c["edPub"]!,
        message: "m",
        signature: c["edSig"]!,
      }),
  },
  {
    name: "POST /v2/verify#invalid",
    request: (c) =>
      post("/v2/verify", {
        publicKey: c["edPub"]!,
        message: "other",
        signature: c["edSig"]!,
      }),
  },
  {
    name: "POST /v2/stream/sign",
    request: (c) =>
      post("/v2/stream/sign", {
        items: [{ id: "a", message: "m", keyId: c["edKeyId"]! }],
      }),
  },
  {
    name: "POST /v2/stream/verify",
    request: (c) =>
      post("/v2/stream/verify", {
        items: [
          {
            id: "a",
            message: "m",
            signature: c["edSig"]!,
            publicKey: c["edPub"]!,
          },
          { id: "b", message: "x", signature: "zz", publicKey: c["edPub"]! },
        ],
      }),
  },
  {
    name: "POST /v2/sealedbox/seal",
    request: (c) =>
      post("/v2/sealedbox/seal", {
        recipientPublicKey: c["xPub"]!,
        plaintext: "sealed",
      }),
    keep: keepField({ box: "sealed" }),
  },
  {
    name: "POST /v2/sealedbox/open",
    request: (c) =>
      post("/v2/sealedbox/open", { keyId: c["xKeyId"]!, sealed: c["box"]! }),
  },
  {
    name: "POST /v2/multi-recipient/encrypt",
    request: (c) =>
      post("/v2/multi-recipient/encrypt", {
        plaintext: "multi",
        recipients: [
          { type: "classical", publicKey: c["xPub"]! },
          {
            type: "pq",
            publicKey: c["hyX"]!,
            mlKemPublicKey: c["hyMl"]!,
          },
        ],
      }),
  },
  {
    name: "POST /v2/keys/export",
    request: (c) => post("/v2/keys/export", { keyId: c["edKeyId"]! }),
  },
  {
    name: "POST /v2/keys/delete",
    request: (c) => post("/v2/keys/delete", { keyId: c["edKeyId"]! }),
  },
];

/** Post-quantum KEMs, sealed boxes and streams. */
const PQ_KEM_STEPS: Step[] = [
  {
    name: "POST /v2/pq/keygen",
    request: () => post("/v2/pq/keygen", {}),
    keep: keepField({ kemKeyId: "keyId", kemPub: "publicKey" }),
  },
  {
    name: "POST /v2/pq/encapsulate",
    request: (c) => post("/v2/pq/encapsulate", { publicKey: c["kemPub"]! }),
    keep: keepField({ kemCt: "ciphertext" }),
  },
  {
    name: "POST /v2/pq/decapsulate",
    request: (c) =>
      post("/v2/pq/decapsulate", {
        keyId: c["kemKeyId"]!,
        ciphertext: c["kemCt"]!,
      }),
  },
  {
    name: "POST /v2/pq/hybrid/keygen",
    request: () => post("/v2/pq/hybrid/keygen", {}),
    keep: keepField({
      hyKeyId: "keyId",
      hyX: "x25519PublicKey",
      hyMl: "mlKemPublicKey",
    }),
  },
  {
    // An ML-KEM key's private part is `secretKey`.
    name: "POST /v2/keys/export#ml-kem",
    request: (c) => post("/v2/keys/export", { keyId: c["kemKeyId"]! }),
  },
  {
    // A hybrid key has other public and private part names.
    name: "POST /v2/keys/export#hybrid",
    request: (c) => post("/v2/keys/export", { keyId: c["hyKeyId"]! }),
  },
  {
    name: "POST /v2/pq/hybrid/encapsulate",
    request: (c) =>
      post("/v2/pq/hybrid/encapsulate", {
        x25519PublicKey: c["hyX"]!,
        mlKemPublicKey: c["hyMl"]!,
      }),
    keep: keepField({
      hyEph: "x25519EphemeralPublic",
      hyCt: "mlKemCiphertext",
    }),
  },
  {
    name: "POST /v2/pq/hybrid/decapsulate",
    request: (c) =>
      post("/v2/pq/hybrid/decapsulate", {
        keyId: c["hyKeyId"]!,
        x25519EphemeralPublic: c["hyEph"]!,
        mlKemCiphertext: c["hyCt"]!,
      }),
  },
  {
    name: "POST /v2/sealedbox/seal-pq",
    request: (c) =>
      post("/v2/sealedbox/seal-pq", {
        x25519PublicKey: c["hyX"]!,
        mlKemPublicKey: c["hyMl"]!,
        plaintext: "pq sealed",
      }),
    keep: keepField({ pqBox: "sealed" }),
  },
  {
    name: "POST /v2/sealedbox/open-pq",
    request: (c) =>
      post("/v2/sealedbox/open-pq", {
        keyId: c["hyKeyId"]!,
        sealed: c["pqBox"]!,
      }),
  },
  {
    name: "POST /v2/stream/pq-encrypt",
    request: (c) =>
      post("/v2/stream/pq-encrypt", {
        x25519PublicKey: c["hyX"]!,
        mlKemPublicKey: c["hyMl"]!,
        plaintext: "stream",
      }),
    keep: keepField({ streamCt: "ciphertext" }),
  },
  {
    name: "POST /v2/stream/pq-decrypt",
    request: (c) =>
      post("/v2/stream/pq-decrypt", {
        keyId: c["hyKeyId"]!,
        ciphertext: c["streamCt"]!,
      }),
  },
  {
    name: "POST /v2/stream/multi-pq-encrypt",
    request: (c) =>
      post("/v2/stream/multi-pq-encrypt", {
        recipients: [
          {
            recipientId: "alice",
            x25519PublicKey: c["hyX"]!,
            mlKemPublicKey: c["hyMl"]!,
          },
        ],
        plaintext: "multi stream",
      }),
    keep: keepField({ multiCt: "ciphertext" }),
  },
  {
    name: "POST /v2/stream/multi-pq-decrypt",
    request: (c) =>
      post("/v2/stream/multi-pq-decrypt", {
        keyId: c["hyKeyId"]!,
        recipientId: "alice",
        ciphertext: c["multiCt"]!,
      }),
  },
];

/** Post-quantum signatures and the ISO 20022 envelope check. */
const PQ_SIGN_STEPS: Step[] = [
  {
    name: "POST /v2/pq/dsa/keygen",
    request: () => post("/v2/pq/dsa/keygen", { level: 44 }),
    keep: keepField({ dsaKeyId: "keyId", dsaPub: "publicKey" }),
  },
  {
    name: "POST /v2/pq/dsa/sign",
    request: (c) =>
      post("/v2/pq/dsa/sign", { keyId: c["dsaKeyId"]!, message: "m" }),
    keep: keepField({ dsaSig: "signature" }),
  },
  {
    name: "POST /v2/pq/dsa/verify",
    request: (c) =>
      post("/v2/pq/dsa/verify", {
        level: 44,
        publicKey: c["dsaPub"]!,
        message: "m",
        signature: c["dsaSig"]!,
      }),
  },
  {
    name: "POST /v2/pq/slh-dsa/keygen",
    request: () => post("/v2/pq/slh-dsa/keygen", { variant: "sha2-128f" }),
    keep: keepField({ slhKeyId: "keyId", slhPub: "publicKey" }),
  },
  {
    name: "POST /v2/pq/slh-dsa/sign",
    request: (c) =>
      post("/v2/pq/slh-dsa/sign", { keyId: c["slhKeyId"]!, message: "m" }),
    keep: keepField({ slhSig: "signature" }),
  },
  {
    name: "POST /v2/pq/slh-dsa/verify",
    request: (c) =>
      post("/v2/pq/slh-dsa/verify", {
        variant: "sha2-128f",
        publicKey: c["slhPub"]!,
        message: "m",
        signature: c["slhSig"]!,
      }),
  },
  {
    name: "POST /v2/stream/iso20022",
    request: () => iso20022Request(false),
  },
  {
    name: "POST /v2/stream/iso20022#tampered",
    request: () => iso20022Request(true),
  },
];

/** An ISO 20022 verification request, optionally with a tampered payload. */
function iso20022Request(tampered: boolean): InjectOptions {
  const ed = generateEd25519KeyPair();
  const ml = mlDsaKeygen(44);
  const payment = { GrpHdr: { MsgId: "M-1" }, Amt: 100 };
  const envelope = signIso20022Payment({
    messageId: "M-1",
    messageType: "pacs.008",
    payload: payment,
    classicalKey: { privateKeyHex: ed.privateKey, publicKeyHex: ed.publicKey },
    postQuantumKey: {
      secretKeyHex: ml.secretKey,
      publicKeyHex: ml.publicKey,
      level: 44,
    },
  });
  return post("/v2/stream/iso20022", {
    envelope,
    payload: tampered ? { ...payment, Amt: 1 } : payment,
    trustedKeys: {
      classicalPublicKey: ed.publicKey,
      postQuantumPublicKey: ml.publicKey,
    },
  });
}

/** HPKE (classical X25519 suite: the shapes do not depend on the KEM). */
const HPKE_STEPS: Step[] = [
  {
    name: "POST /v2/hpke/keygen",
    request: () => post("/v2/hpke/keygen", { kem: "x25519" }),
    keep: keepField({ hpkeKeyId: "keyId", hpkePub: "publicKey" }),
  },
  {
    name: "POST /v2/hpke/seal",
    request: (c) =>
      post("/v2/hpke/seal", {
        recipientPublicKey: c["hpkePub"]!,
        plaintext: "hpke",
        kem: "x25519",
      }),
    keep: keepField({ hpkeEnc: "encapsulatedKey", hpkeCt: "ciphertext" }),
  },
  {
    name: "POST /v2/hpke/open",
    request: (c) =>
      post("/v2/hpke/open", {
        keyId: c["hpkeKeyId"]!,
        encapsulatedKey: c["hpkeEnc"]!,
        ciphertext: c["hpkeCt"]!,
      }),
  },
];

/** KMS on the in-memory local provider. */
const KMS_STEPS: Step[] = [
  {
    name: "POST /v2/kms/create-key",
    request: () => post("/v2/kms/create-key", { metadata: { env: "test" } }),
    keep: keepField({ kmsKeyId: "keyId" }),
  },
  {
    name: "POST /v2/kms/encrypt",
    request: (c) =>
      post("/v2/kms/encrypt", { keyId: c["kmsKeyId"]!, plaintext: "kms" }),
    keep: keepField({ kmsCt: "ciphertext" }),
  },
  {
    name: "POST /v2/kms/decrypt",
    request: (c) =>
      post("/v2/kms/decrypt", {
        keyId: c["kmsKeyId"]!,
        ciphertext: c["kmsCt"]!,
      }),
  },
  {
    name: "POST /v2/kms/generate-data-key",
    request: (c) =>
      post("/v2/kms/generate-data-key", { keyId: c["kmsKeyId"]! }),
  },
  {
    name: "POST /v2/kms/wrap",
    request: (c) =>
      post("/v2/kms/wrap", { keyId: c["kmsKeyId"]!, unwrappedKey: HEX32 }),
    keep: keepField({ kmsWrapped: "wrappedKey" }),
  },
  {
    name: "POST /v2/kms/unwrap",
    request: (c) =>
      post("/v2/kms/unwrap", {
        keyId: c["kmsKeyId"]!,
        wrappedKey: c["kmsWrapped"]!,
      }),
  },
];

/** Request headers every step sends (credentials). */
type Headers = Record<string, string>;

/** Run the steps in order, collecting what each answers. */
async function runSteps(
  app: FastifyInstance,
  steps: readonly Step[],
  ctx: Context,
  headers: Headers,
): Promise<Observation[]> {
  const out: Observation[] = [];
  for (const step of steps) {
    const options = await step.request(ctx);
    const res = await app.inject({ ...options, headers });
    const mediaType = String(res.headers["content-type"] ?? "").split(";")[0]!;
    const isJson = mediaType.endsWith("json");
    const body = isJson ? res.json() : res.payload;
    if (step.keep && isJson) step.keep(body, ctx);
    out.push({ name: step.name, status: res.statusCode, mediaType, body });
  }
  return out;
}

/** The OPAQUE registration and login handshake, end to end. */
async function runOpaque(
  app: FastifyInstance,
  headers: Headers,
): Promise<Observation[]> {
  // The caller's own subject (see the bearer token in
  // response-contract.test.ts).
  const id = "contract-user";
  const password = "contract-password";
  const { request, blind } = pake.createRegistrationRequest(password);
  const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");
  const out: Observation[] = [];
  const call = async (name: string, url: string, payload: object) => {
    const res = await app.inject({ ...post(url, payload), headers });
    const body = res.json();
    if (res.statusCode !== 200) throw new Error(`${name}: ${res.payload}`);
    out.push({
      name,
      status: res.statusCode,
      mediaType: String(res.headers["content-type"]).split(";")[0]!,
      body,
    });
    return body.data as Record<string, string>;
  };
  const init = await call(
    "POST /v2/opaque/register/init",
    "/v2/opaque/register/init",
    {
      credentialIdentifier: id,
      request: hex(pake.serializeRegistrationRequest(request)),
    },
  );
  const { record } = pake.finalizeRegistrationRequest(
    password,
    blind,
    pake.deserializeRegistrationResponse(Buffer.from(init["response"]!, "hex")),
  );
  await call("POST /v2/opaque/register/finish", "/v2/opaque/register/finish", {
    credentialIdentifier: id,
    record: hex(pake.serializeRegistrationRecord(record)),
  });
  const login = pake.generateKE1(password);
  const ke2 = await call(
    "POST /v2/opaque/login/init",
    "/v2/opaque/login/init",
    {
      credentialIdentifier: id,
      ke1: hex(pake.serializeKE1(login.ke1)),
    },
  );
  const { ke3 } = pake.generateKE3(
    login.state,
    pake.deserializeKE2(Buffer.from(ke2["ke2"]!, "hex")),
  );
  await call("POST /v2/opaque/login/finish", "/v2/opaque/login/finish", {
    sessionId: ke2["sessionId"]!,
    ke3: hex(pake.serializeKE3(ke3)),
  });
  return out;
}

/** The fixture public key, base64 of the armored key. */
const fixturePublicKeyB64 = (): string =>
  readFileSync(path.join(FIXTURE_KEYS, "rsa.pub"), "latin1").trim();

/**
 * The deprecated v1 OpenPGP routes. Needs `CRYPTO_KEY_DIR` pointing at
 * {@link FIXTURE_KEYS} (decrypt, revoke).
 */
async function v1Steps(): Promise<Step[]> {
  const { publicKey, privateKey } = await openpgp.generateKey({
    type: "ecc",
    curve: "curve25519",
    userIDs: [{ name: "Contract", email: "contract@example.com" }],
    passphrase: "pw-contract",
    format: "armored",
  });
  const signingKeys = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }),
    passphrase: "pw-contract",
  });
  const signed = (await openpgp.sign({
    message: await openpgp.createCleartextMessage({ text: "Verify me" }),
    signingKeys,
  })) as string;
  const serverPub = await openpgp.readKey({
    armoredKey: Buffer.from(fixturePublicKeyB64(), "base64").toString("latin1"),
  });
  const toServer = (await openpgp.encrypt({
    message: await openpgp.createMessage({ text: "for the server" }),
    encryptionKeys: serverPub,
  })) as string;
  const b64 = (s: string): string => Buffer.from(s).toString("base64");
  return [
    {
      name: "POST /v1/encrypt",
      request: () =>
        post("/v1/encrypt", {
          passphrase: "pw",
          message: "hi",
          publicKey: b64(publicKey),
        }),
    },
    {
      name: "POST /v1/decrypt",
      request: () =>
        post("/v1/decrypt", {
          passphrase: FIXTURE_PASSPHRASE,
          message: b64(toServer),
          publicKey: b64(publicKey),
        }),
    },
    {
      name: "POST /v1/verify",
      request: () =>
        post("/v1/verify", {
          date: new Date().toISOString(),
          message: signed,
          verificationKeys: b64(publicKey),
        }),
    },
    {
      name: "POST /v1/generate",
      request: () =>
        post("/v1/generate", {
          name: "Contract",
          email: "contract@example.com",
          type: "ecc",
          passphrase: "pw-gen",
          curve: "curve25519",
          format: "armored",
        }),
    },
    {
      name: "POST /v1/revoke",
      request: () =>
        post("/v1/revoke", {
          passphrase: FIXTURE_PASSPHRASE,
          flag: 0,
          reason: "contract test",
        }),
    },
  ];
}

/** Builds a fresh server; each group runs on its own (tenant quotas). */
export type AppFactory = () => Promise<FastifyInstance>;

/** Run `fn` on a fresh app, closing it after. */
async function onFreshApp<T>(
  makeApp: AppFactory,
  fn: (app: FastifyInstance) => Promise<T>,
): Promise<T> {
  const app = await makeApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
  }
}

/**
 * Call the success path of every route. Each group runs on a fresh app,
 * so no group exhausts the per-tenant quota of 60 requests a minute;
 * `ctx` carries public values (never key ids) across groups. `headers`
 * go with every request.
 * `CRYPTO_KEY_DIR` must point at {@link FIXTURE_KEYS} for the v1 steps.
 */
export async function runScenario(
  makeApp: AppFactory,
  headers: Headers = {},
): Promise<Observation[]> {
  const ctx: Context = {};
  const groups = [
    META_STEPS,
    SYMMETRIC_STEPS,
    PASSWORD_STEPS,
    PQ_KEM_STEPS,
    KEY_STEPS,
    PQ_SIGN_STEPS,
    HPKE_STEPS,
    KMS_STEPS,
    await v1Steps(),
  ];
  const out: Observation[] = [];
  for (const steps of groups) {
    out.push(
      ...(await onFreshApp(makeApp, (app) =>
        runSteps(app, steps, ctx, headers),
      )),
    );
  }
  out.push(...(await onFreshApp(makeApp, (app) => runOpaque(app, headers))));
  return out;
}
