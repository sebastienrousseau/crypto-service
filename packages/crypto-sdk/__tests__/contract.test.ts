/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Contract test: the SDK against the real crypto-server, in process. The
 * client's `fetch` forwards to Fastify's `app.inject`, so every request
 * goes through the server's schemas, authentication, scope policy, key
 * store and problem handlers exactly as over HTTP. A drift between an SDK
 * method and its route (path, field names, response shape) fails here.
 *
 * KDF and password routes (Argon2 / scrypt / PBKDF2 at the OWASP floors,
 * run on worker threads) are left out to keep the suite fast.
 */

import { expect } from "chai";
import { createHmac } from "crypto";
import { init } from "@sebastienrousseau/crypto-server";
import { CryptoClient, CryptoApiError } from "../src/index";

type App = Awaited<ReturnType<typeof init>>;

const JWT_SECRET = "contract-test-secret-0123456789abcdef";
const API_KEY = "contract-test-api-key";

/** Environment the server reads; saved and restored around the suite. */
const ENV: Record<string, string | undefined> = {
  JWT_SECRET,
  CRYPTO_API_KEY: API_KEY,
  RATE_LIMIT_MAX: "100000",
  ALLOW_ANONYMOUS: undefined,
  CRYPTO_KEY_OUT_DIR: undefined,
  JWT_ISSUER: undefined,
  JWT_AUDIENCE: undefined,
  JWT_MAX_AGE: undefined,
  NODE_ENV: "test",
};

/** Set each variable in `values` (deleting undefined ones); return the old values. */
function setEnv(
  values: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(values)) {
    saved[name] = process.env[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  return saved;
}

/** A short-lived HS256 JWT with the given subject and scopes. */
function jwt(sub: string, scopes: string[]): string {
  const encode = (part: object) =>
    Buffer.from(JSON.stringify(part)).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub,
    scopes,
    iat,
    exp: iat + 300,
  })}`;
  const signature = createHmac("sha256", JWT_SECRET)
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

/** A `fetch` that hands each request to `app.inject` instead of the network. */
function injectFetch(app: App): typeof globalThis.fetch {
  return (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const res = await app.inject({
      method: (init?.method ?? "GET") as "GET" | "POST",
      url: url.pathname + url.search,
      headers: (init?.headers ?? {}) as Record<string, string>,
      ...(typeof init?.body === "string" ? { payload: init.body } : {}),
    });
    const headers = new Headers();
    for (const [name, value] of Object.entries(res.headers)) {
      if (value !== undefined) headers.set(name, String(value));
    }
    return new Response(res.body, { status: res.statusCode, headers });
  }) as typeof globalThis.fetch;
}

describe("contract: CryptoClient against crypto-server", () => {
  let app: App;
  let savedEnv: Record<string, string | undefined>;
  /** JWT principal holding every scope, including crypto:keys:export. */
  let client: CryptoClient;
  /** API-key principal (crypto:admin, which does not imply export). */
  let apiKeyClient: CryptoClient;

  before(async function () {
    this.timeout(30_000);
    savedEnv = setEnv(ENV);
    app = await init();
    const fetch = injectFetch(app);
    const baseUrl = "http://crypto-server.test";
    client = new CryptoClient({
      baseUrl,
      fetch,
      token: jwt("contract-test", ["crypto:admin", "crypto:keys:export"]),
    });
    apiKeyClient = new CryptoClient({ baseUrl, fetch, apiKey: API_KEY });
  });

  after(async () => {
    await app?.close();
    setEnv(savedEnv);
  });

  it("health and algorithms", async () => {
    const health = await client.health();
    expect(health.statusCode).to.equal(200);
    expect(health.status).to.equal("ok");

    const { data } = await client.algorithms();
    expect(data["hashing"]).to.include("sha256");
  });

  it("hash", async () => {
    const { data } = await client.hash({ algorithm: "sha256", data: "abc" });
    expect(data).to.deep.equal({
      digest:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      algorithm: "sha256",
      length: 32,
    });
  });

  it("encrypt -> decrypt and secretbox seal -> open", async () => {
    const key = "11".repeat(32);
    const enc = await client.encrypt({ key, plaintext: "aead" });
    expect(enc.data.algorithm).to.equal("xchacha20-poly1305");
    const dec = await client.decrypt({ key, ciphertext: enc.data.ciphertext });
    expect(dec.data.plaintext).to.equal("aead");

    const box = await client.secretboxSeal({ key, plaintext: "box", aad: "a" });
    expect(box.data.algorithm).to.equal("xchacha20-poly1305");
    const opened = await client.secretboxOpen({
      key,
      ciphertext: box.data.sealed,
      aad: "a",
    });
    expect(opened.data).to.equal("box");
  });

  it("mac -> macVerify and keyWrap -> keyUnwrap", async () => {
    const key = "22".repeat(32);
    const mac = await client.mac({ algorithm: "sha256", key, data: "m" });
    const check = await client.macVerify({
      algorithm: "sha256",
      key,
      data: "m",
      mac: mac.data.mac,
    });
    expect(check.data).to.deep.equal({ valid: true, algorithm: "sha256" });

    const keyToWrap = "33".repeat(16);
    const wrapped = await client.keyWrap({ kek: key, keyToWrap });
    expect(wrapped.data.algorithm).to.equal("aes-kw");
    const unwrapped = await client.keyUnwrap({
      kek: key,
      wrappedKey: wrapped.data.wrapped,
    });
    expect(unwrapped.data).to.equal(keyToWrap);
  });

  it("generateKeyPair -> sign by keyId -> verify", async () => {
    const { data: key } = await client.generateKeyPair({
      algorithm: "ed25519",
      metadata: { use: "sig" },
    });
    expect(key.keyId).to.match(/^k_[A-Za-z0-9_-]{22}$/);
    expect(key.algorithm).to.equal("ed25519");
    expect(key.metadata.use).to.equal("sig");
    expect(key).to.not.have.property("privateKey");

    const signed = await client.sign({ keyId: key.keyId, message: "hello" });
    const { data } = await client.verify({
      publicKey: key.publicKey,
      message: "hello",
      signature: signed.data.signature,
    });
    expect(data).to.deep.equal({ valid: true, algorithm: "ed25519" });
  });

  it("exportKey returns private parts with crypto:keys:export", async () => {
    const { data: key } = await client.generateKeyPair();
    const { data } = await client.exportKey({ keyId: key.keyId });
    expect(data.keyId).to.equal(key.keyId);
    expect(data.publicKey).to.equal(key.publicKey);
    expect(data["privateKey"]).to.match(/^[0-9a-f]{64}$/);
  });

  it("pqSignKeygen -> pqSign by keyId -> pqVerify (ML-DSA)", async () => {
    const { data: key } = await client.pqSignKeygen({ level: 65 });
    expect(key.algorithm).to.equal("ml-dsa-65");
    expect(key).to.not.have.property("secretKey");

    const signed = await client.pqSign({ keyId: key.keyId, message: "pq" });
    expect(signed.data.algorithm).to.equal("ml-dsa-65");
    const { data } = await client.pqVerify({
      level: 65,
      publicKey: key.publicKey,
      message: "pq",
      signature: signed.data.signature,
    });
    expect(data.valid).to.equal(true);
  });

  it("pqHashSignKeygen -> pqHashSign by keyId -> pqHashVerify (SLH-DSA)", async () => {
    const { data: key } = await client.pqHashSignKeygen({
      variant: "shake-128f",
    });
    expect(key.algorithm).to.equal("slh-dsa-shake-128f");

    const signed = await client.pqHashSign({ keyId: key.keyId, message: "h" });
    const { data } = await client.pqHashVerify({
      variant: "shake-128f",
      publicKey: key.publicKey,
      message: "h",
      signature: signed.data.signature,
    });
    expect(data.valid).to.equal(true);
  });

  it("sealedboxSeal -> sealedboxOpen by keyId", async () => {
    const { data: key } = await client.generateKeyPair({ algorithm: "x25519" });
    const sealed = await client.sealedboxSeal({
      recipientPublicKey: key.publicKey,
      plaintext: "sealed secret",
    });
    expect(sealed.data.algorithm).to.equal("x25519-xchacha20-poly1305");
    const opened = await client.sealedboxOpen({
      keyId: key.keyId,
      sealed: sealed.data.sealed,
    });
    expect(opened.data).to.equal("sealed secret");
  });

  it("mlKemGenerateKeyPair -> mlKemEncapsulate -> mlKemDecapsulate", async () => {
    const { data: key } = await client.mlKemGenerateKeyPair();
    expect(key.algorithm).to.equal("ml-kem-768");
    const enc = await client.mlKemEncapsulate({ publicKey: key.publicKey });
    const dec = await client.mlKemDecapsulate({
      keyId: key.keyId,
      ciphertext: enc.data.ciphertext,
    });
    expect(dec.data.sharedSecret).to.equal(enc.data.sharedSecret);
  });

  it("pqGenerateKeyPair -> pqEncapsulate -> pqDecapsulate, and the PQ sealed box", async () => {
    const { data: key } = await client.pqGenerateKeyPair();
    expect(key.algorithm).to.equal("x25519-ml-kem-768");
    expect(key).to.not.have.property("x25519PrivateKey");
    expect(key).to.not.have.property("mlKemSecretKey");

    const enc = await client.pqEncapsulate({
      x25519PublicKey: key.x25519PublicKey,
      mlKemPublicKey: key.mlKemPublicKey,
    });
    const dec = await client.pqDecapsulate({
      keyId: key.keyId,
      x25519EphemeralPublic: enc.data.x25519EphemeralPublic,
      mlKemCiphertext: enc.data.mlKemCiphertext,
    });
    expect(dec.data.sharedSecret).to.equal(enc.data.sharedSecret);

    const sealed = await client.sealedboxSealPq({
      x25519PublicKey: key.x25519PublicKey,
      mlKemPublicKey: key.mlKemPublicKey,
      plaintext: "pq sealed",
    });
    const opened = await client.sealedboxOpenPq({
      keyId: key.keyId,
      sealed: sealed.data.sealed,
    });
    expect(opened.data).to.equal("pq sealed");
  });

  it("compliance endpoints", async () => {
    const dora = await client.getDoraCompliance();
    expect(dora.data.standard).to.equal("DORA (EU 2022/2554)");
    const cbom = await client.getCbom();
    expect(cbom.bomFormat).to.equal("CycloneDX");
    expect(cbom.specVersion).to.equal("1.6");
  });

  describe("errors are RFC 9457 problems", () => {
    /** The CryptoApiError a call rejects with. */
    async function rejection(call: Promise<unknown>): Promise<CryptoApiError> {
      const err = await call.then(
        () => expect.fail("expected the call to fail"),
        (e: unknown) => e,
      );
      expect(err).to.be.an.instanceOf(CryptoApiError);
      return err as CryptoApiError;
    }

    it("unknown keyId -> 404 key-not-found with code", async () => {
      const err = await rejection(
        client.sign({ keyId: "k_AAAAAAAAAAAAAAAAAAAAAA", message: "x" }),
      );
      expect(err.status).to.equal(404);
      expect(err.body).to.deep.equal({
        type: "urn:crypto-service:problem:key-not-found",
        title: "Key not found",
        status: 404,
        detail: "Key not found",
        instance: "/v2/sign",
        code: "KEY_NOT_FOUND",
      });
      expect(err.message).to.equal("API Error 404: Key not found");
    });

    it("another principal's key -> 404, as for an unknown key", async () => {
      const { data: key } = await client.generateKeyPair();
      const err = await rejection(
        apiKeyClient.sign({ keyId: key.keyId, message: "x" }),
      );
      expect(err.body.type).to.equal(
        "urn:crypto-service:problem:key-not-found",
      );
    });

    it("export without crypto:keys:export -> 403 forbidden", async () => {
      const { data: key } = await apiKeyClient.generateKeyPair();
      const err = await rejection(apiKeyClient.exportKey({ keyId: key.keyId }));
      expect(err.status).to.equal(403);
      expect(err.body.type).to.equal("urn:crypto-service:problem:forbidden");
      expect(err.body.detail).to.equal(
        "Missing required scope: crypto:keys:export",
      );
      expect(err.body.instance).to.equal("/v2/keys/export");
    });

    it("wrong key algorithm -> 400 key-algorithm-mismatch", async () => {
      const { data: key } = await client.generateKeyPair({
        algorithm: "x25519",
      });
      const err = await rejection(
        client.pqSign({ keyId: key.keyId, message: "x" }),
      );
      expect(err.status).to.equal(400);
      expect(err.body.code).to.equal("KEY_ALGORITHM_MISMATCH");
    });

    it("schema violation -> 400 validation-failed with errors", async () => {
      const err = await rejection(
        client.verify({ publicKey: "00", message: "m", signature: "00" }),
      );
      expect(err.status).to.equal(400);
      expect(err.body.type).to.equal(
        "urn:crypto-service:problem:validation-failed",
      );
      expect(err.body.errors?.[0]?.field).to.equal("/publicKey");
    });

    it("no credentials -> 401 unauthorized", async () => {
      const anonymous = new CryptoClient({
        baseUrl: "http://crypto-server.test",
        fetch: injectFetch(app),
      });
      const err = await rejection(anonymous.algorithms());
      expect(err.status).to.equal(401);
      expect(err.body.type).to.equal("urn:crypto-service:problem:unauthorized");
    });
  });
});
