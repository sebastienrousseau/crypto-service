/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import {
  CryptoClient,
  CryptoApiError,
  ClientOptions,
  ApiError,
  ApiResponse,
  HashResult,
  AeadResult,
  KdfResult,
  Ed25519KeyPair,
  SignResult,
  VerifyResult,
  HybridKeyPair,
  HybridEncapsulateResult,
} from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock fetch function that returns the given JSON body with the
 * specified HTTP status code.
 */
function mockFetch(status: number, body: unknown): typeof globalThis.fetch {
  return (async (_url: RequestInfo | URL, _init?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as typeof globalThis.fetch;
}

/**
 * Creates a mock fetch that captures the request arguments so we can assert
 * on them later.
 */
function capturingFetch(
  status: number,
  body: unknown,
): {
  fetch: typeof globalThis.fetch;
  calls: Array<{ url: RequestInfo | URL; init?: RequestInit }>;
} {
  const calls: Array<{ url: RequestInfo | URL; init?: RequestInit }> = [];
  const fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

function clientWith(
  status: number,
  body: unknown,
  extra?: Partial<ClientOptions>,
): CryptoClient {
  return new CryptoClient({
    baseUrl: "http://localhost:3000",
    fetch: mockFetch(status, body),
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CryptoApiError", () => {
  it("should set name, status, body, and message", () => {
    const apiError: ApiError = {
      error: "bad request",
      details: [{ field: "key", message: "required" }],
    };
    const err = new CryptoApiError(400, apiError);

    expect(err).to.be.an.instanceOf(Error);
    expect(err).to.be.an.instanceOf(CryptoApiError);
    expect(err.name).to.equal("CryptoApiError");
    expect(err.status).to.equal(400);
    expect(err.body).to.deep.equal(apiError);
    expect(err.message).to.equal("API Error 400: bad request");
  });

  it("should work without details field", () => {
    const apiError: ApiError = { error: "not found" };
    const err = new CryptoApiError(404, apiError);

    expect(err.status).to.equal(404);
    expect(err.body.details).to.be.undefined;
    expect(err.message).to.equal("API Error 404: not found");
  });
});

describe("CryptoClient", () => {
  // -----------------------------------------------------------------------
  // Constructor / Authentication headers
  // -----------------------------------------------------------------------

  describe("constructor", () => {
    it("should strip trailing slash from baseUrl", () => {
      const { fetch, calls } = capturingFetch(200, { data: {} });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000/",
        fetch,
      });
      client.health();
      // Wait for the promise to settle so the call is captured
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(calls[0].url).to.equal("http://localhost:3000/health");
          resolve();
        }, 0);
      });
    });

    it("should set Content-Type header on all requests", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { digest: "abc", algorithm: "sha256", length: 3 },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.hash({ algorithm: "sha256", data: "hello" });

      expect(calls[0].init?.headers).to.have.property(
        "Content-Type",
        "application/json",
      );
    });

    it("should set x-api-key header when apiKey is provided", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { digest: "abc", algorithm: "sha256", length: 3 },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        apiKey: "my-secret-key",
        fetch,
      });
      await client.hash({ algorithm: "sha256", data: "hello" });

      const headers = calls[0].init?.headers as Record<string, string>;
      expect(headers["x-api-key"]).to.equal("my-secret-key");
    });

    it("should set Authorization Bearer header when token is provided", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { digest: "abc", algorithm: "sha256", length: 3 },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        token: "jwt-token-123",
        fetch,
      });
      await client.hash({ algorithm: "sha256", data: "hello" });

      const headers = calls[0].init?.headers as Record<string, string>;
      expect(headers["Authorization"]).to.equal("Bearer jwt-token-123");
    });

    it("should set both apiKey and token headers when both are provided", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { digest: "abc", algorithm: "sha256", length: 3 },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        apiKey: "key-456",
        token: "tok-789",
        fetch,
      });
      await client.hash({ algorithm: "sha256", data: "hello" });

      const headers = calls[0].init?.headers as Record<string, string>;
      expect(headers["x-api-key"]).to.equal("key-456");
      expect(headers["Authorization"]).to.equal("Bearer tok-789");
    });

    it("should not set auth headers when neither apiKey nor token is provided", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { digest: "abc", algorithm: "sha256", length: 3 },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.hash({ algorithm: "sha256", data: "hello" });

      const headers = calls[0].init?.headers as Record<string, string>;
      expect(headers).to.not.have.property("x-api-key");
      expect(headers).to.not.have.property("Authorization");
    });

    it("should use global fetch when custom fetch is not provided", () => {
      // Just verify the constructor does not throw
      // (global fetch is available in Node 22+)
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
      });
      expect(client).to.be.an.instanceOf(CryptoClient);
    });
  });

  // -----------------------------------------------------------------------
  // Private request method - error handling
  // -----------------------------------------------------------------------

  describe("request (error handling)", () => {
    it("should throw CryptoApiError on non-ok response", async () => {
      const errorBody: ApiError = {
        error: "validation failed",
        details: [{ field: "algorithm", message: "unsupported" }],
      };
      const client = clientWith(400, errorBody);

      try {
        await client.hash({ algorithm: "unknown", data: "test" });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(CryptoApiError);
        const apiErr = err as CryptoApiError;
        expect(apiErr.status).to.equal(400);
        expect(apiErr.body).to.deep.equal(errorBody);
      }
    });

    it("should throw CryptoApiError on 500 response", async () => {
      const client = clientWith(500, { error: "internal server error" });

      try {
        await client.encrypt({ key: "k", plaintext: "p" });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(CryptoApiError);
        expect((err as CryptoApiError).status).to.equal(500);
      }
    });

    it("should throw CryptoApiError on 401 response", async () => {
      const client = clientWith(401, { error: "unauthorized" });

      try {
        await client.algorithms();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(CryptoApiError);
        expect((err as CryptoApiError).status).to.equal(401);
      }
    });
  });

  // -----------------------------------------------------------------------
  // request method - URL and body serialisation
  // -----------------------------------------------------------------------

  describe("request (URL and body)", () => {
    it("should send POST with JSON-stringified body", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { ciphertext: "ct", algorithm: "aes-256-gcm" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.encrypt({ key: "mykey", plaintext: "hello" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/encrypt");
      expect(calls[0].init?.method).to.equal("POST");
      expect(calls[0].init?.body).to.equal(
        JSON.stringify({ key: "mykey", plaintext: "hello" }),
      );
    });

    it("should send GET without body for algorithms endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { hash: ["sha256"], cipher: ["aes-256-gcm"] },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.algorithms();

      expect(calls[0].url).to.equal("http://localhost:3000/v2/algorithms");
      expect(calls[0].init?.method).to.equal("GET");
      expect(calls[0].init?.body).to.be.undefined;
    });
  });

  // -----------------------------------------------------------------------
  // Encrypt / Decrypt
  // -----------------------------------------------------------------------

  describe("encrypt()", () => {
    it("should return AeadResult on success", async () => {
      const responseData: AeadResult = {
        ciphertext: "encrypted-data",
        algorithm: "aes-256-gcm",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.encrypt({
        key: "32-byte-key",
        plaintext: "secret",
      });

      expect(result.data).to.deep.equal(responseData);
    });
  });

  describe("decrypt()", () => {
    it("should return plaintext on success", async () => {
      const responseData = { plaintext: "decrypted-data" };
      const client = clientWith(200, { data: responseData });
      const result = await client.decrypt({
        key: "32-byte-key",
        ciphertext: "ct-data",
      });

      expect(result.data.plaintext).to.equal("decrypted-data");
    });

    it("should call the correct endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { plaintext: "p" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.decrypt({ key: "k", ciphertext: "c" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/decrypt");
      expect(calls[0].init?.method).to.equal("POST");
    });
  });

  // -----------------------------------------------------------------------
  // Hash
  // -----------------------------------------------------------------------

  describe("hash()", () => {
    it("should return HashResult on success", async () => {
      const responseData: HashResult = {
        digest: "abc123",
        algorithm: "sha256",
        length: 32,
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.hash({
        algorithm: "sha256",
        data: "hello",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should call /v2/hash endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { digest: "d", algorithm: "sha256", length: 32 },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.hash({ algorithm: "sha256", data: "world" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/hash");
      expect(calls[0].init?.body).to.equal(
        JSON.stringify({ algorithm: "sha256", data: "world" }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // KDF
  // -----------------------------------------------------------------------

  describe("kdf()", () => {
    it("should return KdfResult on success", async () => {
      const responseData: KdfResult = {
        derivedKey: "dk-hex",
        salt: "salt-hex",
        algorithm: "argon2id",
        keyLength: 32,
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.kdf({
        algorithm: "argon2id",
        password: "passw0rd",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should send optional params", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          derivedKey: "dk",
          salt: "s",
          algorithm: "argon2id",
          keyLength: 64,
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.kdf({
        algorithm: "argon2id",
        password: "pw",
        salt: "custom-salt",
        keyLength: 64,
        params: { iterations: 3 },
      });

      const body = JSON.parse(calls[0].init?.body as string);
      expect(body.salt).to.equal("custom-salt");
      expect(body.keyLength).to.equal(64);
      expect(body.params.iterations).to.equal(3);
    });

    it("should call /v2/kdf endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          derivedKey: "dk",
          salt: "s",
          algorithm: "argon2id",
          keyLength: 32,
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.kdf({ algorithm: "argon2id", password: "pw" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/kdf");
    });
  });

  // -----------------------------------------------------------------------
  // Signing: generateKeyPair, sign, verify
  // -----------------------------------------------------------------------

  describe("generateKeyPair()", () => {
    it("should return Ed25519KeyPair on success", async () => {
      const responseData: Ed25519KeyPair = {
        privateKey: "priv-hex",
        publicKey: "pub-hex",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.generateKeyPair();

      expect(result.data).to.deep.equal(responseData);
    });

    it("should POST to /v2/keys/generate with ed25519 algorithm", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { privateKey: "p", publicKey: "q" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.generateKeyPair();

      expect(calls[0].url).to.equal("http://localhost:3000/v2/keys/generate");
      expect(calls[0].init?.method).to.equal("POST");
      const body = JSON.parse(calls[0].init?.body as string);
      expect(body.algorithm).to.equal("ed25519");
    });
  });

  describe("sign()", () => {
    it("should return SignResult on success", async () => {
      const responseData: SignResult = {
        signature: "sig-hex",
        algorithm: "ed25519",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.sign({
        privateKey: "priv",
        message: "hello",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should call /v2/sign endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { signature: "s", algorithm: "ed25519" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.sign({ privateKey: "pk", message: "msg" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/sign");
    });
  });

  describe("verify()", () => {
    it("should return VerifyResult on success", async () => {
      const responseData: VerifyResult = {
        valid: true,
        algorithm: "ed25519",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.verify({
        publicKey: "pub",
        message: "hello",
        signature: "sig",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should return valid=false when signature is invalid", async () => {
      const responseData: VerifyResult = {
        valid: false,
        algorithm: "ed25519",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.verify({
        publicKey: "pub",
        message: "hello",
        signature: "bad-sig",
      });

      expect(result.data.valid).to.equal(false);
    });

    it("should call /v2/verify endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { valid: true, algorithm: "ed25519" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.verify({
        publicKey: "pub",
        message: "m",
        signature: "s",
      });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/verify");
    });
  });

  // -----------------------------------------------------------------------
  // Post-Quantum
  // -----------------------------------------------------------------------

  describe("pqGenerateKeyPair()", () => {
    it("should return HybridKeyPair on success", async () => {
      const responseData: HybridKeyPair = {
        x25519PrivateKey: "x-priv",
        x25519PublicKey: "x-pub",
        mlKemPublicKey: "ml-pub",
        mlKemSecretKey: "ml-sec",
        algorithm: "x25519-ml-kem-768",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.pqGenerateKeyPair();

      expect(result.data).to.deep.equal(responseData);
    });

    it("should POST to /v2/pq/hybrid/keygen with empty body", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          x25519PrivateKey: "a",
          x25519PublicKey: "b",
          mlKemPublicKey: "c",
          mlKemSecretKey: "d",
          algorithm: "x25519-ml-kem-768",
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqGenerateKeyPair();

      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hybrid/keygen",
      );
      expect(calls[0].init?.method).to.equal("POST");
      expect(calls[0].init?.body).to.equal(JSON.stringify({}));
    });
  });

  describe("pqEncapsulate()", () => {
    it("should return HybridEncapsulateResult on success", async () => {
      const responseData: HybridEncapsulateResult = {
        x25519EphemeralPublic: "eph-pub",
        mlKemCiphertext: "ml-ct",
        sharedSecret: "shared",
        algorithm: "x25519-ml-kem-768",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.pqEncapsulate({
        x25519PublicKey: "x-pub",
        mlKemPublicKey: "ml-pub",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should call /v2/pq/hybrid/encapsulate endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          x25519EphemeralPublic: "e",
          mlKemCiphertext: "c",
          sharedSecret: "s",
          algorithm: "x25519-ml-kem-768",
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqEncapsulate({
        x25519PublicKey: "xp",
        mlKemPublicKey: "mp",
      });

      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hybrid/encapsulate",
      );
    });
  });

  describe("pqDecapsulate()", () => {
    it("should return sharedSecret and algorithm on success", async () => {
      const responseData = {
        sharedSecret: "decapsulated-secret",
        algorithm: "x25519-ml-kem-768",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.pqDecapsulate({
        x25519PrivateKey: "x-priv",
        mlKemSecretKey: "ml-sec",
        x25519EphemeralPublic: "eph-pub",
        mlKemCiphertext: "ml-ct",
      });

      expect(result.data.sharedSecret).to.equal("decapsulated-secret");
      expect(result.data.algorithm).to.equal("x25519-ml-kem-768");
    });

    it("should call /v2/pq/hybrid/decapsulate endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { sharedSecret: "s", algorithm: "x25519-ml-kem-768" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqDecapsulate({
        x25519PrivateKey: "a",
        mlKemSecretKey: "b",
        x25519EphemeralPublic: "c",
        mlKemCiphertext: "d",
      });

      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hybrid/decapsulate",
      );
      expect(calls[0].init?.method).to.equal("POST");
    });
  });

  // -----------------------------------------------------------------------
  // New Methods: PQ Signatures, Secretbox, Sealedbox, Password, Key Wrap, MAC
  // -----------------------------------------------------------------------

  describe("pqSign()", () => {
    it("should call /v2/pq/dsa/sign", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { signature: "s", algorithm: "ml-dsa-65" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqSign({ level: 65, secretKey: "sk", message: "msg" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/dsa/sign");
    });
  });

  describe("pqVerify()", () => {
    it("should call /v2/pq/dsa/verify", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { valid: true, algorithm: "ml-dsa-65" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqVerify({
        level: 65,
        publicKey: "pk",
        message: "msg",
        signature: "sig",
      });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/dsa/verify");
    });
  });

  describe("pqSignKeygen()", () => {
    it("should call /v2/pq/dsa/keygen", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { publicKey: "p", secretKey: "s", algorithm: "ml-dsa-44" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqSignKeygen({ level: 44 });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/dsa/keygen");
    });
  });

  describe("pqHashSign()", () => {
    it("should call /v2/pq/hash-sign/sign", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { signature: "s", algorithm: "slh-dsa" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqHashSign({
        variant: "shake-128f",
        secretKey: "sk",
        message: "m",
      });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hash-sign/sign",
      );
    });
  });

  describe("pqHashVerify()", () => {
    it("should call /v2/pq/hash-sign/verify", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { valid: true, algorithm: "slh-dsa" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqHashVerify({
        variant: "shake-128f",
        publicKey: "pk",
        message: "m",
        signature: "s",
      });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hash-sign/verify",
      );
    });
  });

  describe("pqHashSignKeygen()", () => {
    it("should call /v2/pq/hash-sign/keygen", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { publicKey: "p", secretKey: "s", algorithm: "slh-dsa" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqHashSignKeygen({ variant: "shake-128f" });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hash-sign/keygen",
      );
    });
  });

  describe("secretboxSeal()", () => {
    it("should call /v2/secretbox/seal", async () => {
      const { fetch, calls } = capturingFetch(200, { data: { sealed: "ct" } });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.secretboxSeal({ key: "k", plaintext: "p" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/secretbox/seal");
    });
  });

  describe("secretboxOpen()", () => {
    it("should call /v2/secretbox/open", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { plaintext: "pt" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.secretboxOpen({ key: "k", ciphertext: "ct" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/secretbox/open");
    });
  });

  describe("sealedboxSeal()", () => {
    it("should call /v2/sealedbox/seal", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { sealed: "s", ephemeralPublicKey: "e" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.sealedboxSeal({ recipientPublicKey: "pk", plaintext: "p" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/sealedbox/seal");
    });
  });

  describe("sealedboxOpen()", () => {
    it("should call /v2/sealedbox/open", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { plaintext: "pt" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.sealedboxOpen({ recipientSecretKey: "sk", sealed: "s" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/sealedbox/open");
    });
  });

  describe("passwordEncrypt()", () => {
    it("should call /v2/password/encrypt", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { ciphertext: "ct" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.passwordEncrypt({ password: "pw", plaintext: "pt" });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/password/encrypt",
      );
    });
  });

  describe("passwordDecrypt()", () => {
    it("should call /v2/password/decrypt", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { plaintext: "pt" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.passwordDecrypt({ password: "pw", ciphertext: "ct" });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/password/decrypt",
      );
    });
  });

  describe("passwordHash()", () => {
    it("should call /v2/password/hash", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          hash: "h",
          salt: "s",
          params: { t: 3, m: 65536, p: 4 },
          algorithm: "argon2id",
          phc: "$argon2id$...",
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.passwordHash({ password: "pw" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/password/hash");
    });
  });

  describe("passwordVerify()", () => {
    it("should call /v2/password/verify", async () => {
      const { fetch, calls } = capturingFetch(200, { data: { valid: true } });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.passwordVerify({
        password: "pw",
        hash: "h",
        salt: "s",
        params: { t: 3, m: 65536, p: 4 },
      });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/password/verify");
    });
  });

  describe("mac()", () => {
    it("should call /v2/hmac", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { mac: "m", algorithm: "hmac-sha256" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.mac({ algorithm: "hmac-sha256", key: "k", data: "d" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/hmac");
    });
  });

  describe("macVerify()", () => {
    it("should call /v2/hmac/verify", async () => {
      const { fetch, calls } = capturingFetch(200, { data: { valid: true } });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.macVerify({
        algorithm: "hmac-sha256",
        key: "k",
        data: "d",
        mac: "m",
      });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/hmac/verify");
    });
  });

  describe("keyWrap()", () => {
    it("should call /v2/keys/wrap", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { wrappedKey: "wk" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.keyWrap({ kek: "k", keyToWrap: "kw" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/keys/wrap");
    });
  });

  describe("keyUnwrap()", () => {
    it("should call /v2/keys/unwrap", async () => {
      const { fetch, calls } = capturingFetch(200, { data: { key: "k" } });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.keyUnwrap({ kek: "k", wrappedKey: "wk" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/keys/unwrap");
    });
  });

  // -----------------------------------------------------------------------
  // Utility: algorithms, health
  // -----------------------------------------------------------------------

  describe("algorithms()", () => {
    it("should return algorithm map on success", async () => {
      const responseData = {
        hash: ["sha256", "sha512"],
        cipher: ["aes-256-gcm"],
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.algorithms();

      expect(result.data).to.deep.equal(responseData);
    });

    it("should use GET method", async () => {
      const { fetch, calls } = capturingFetch(200, { data: {} });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.algorithms();

      expect(calls[0].init?.method).to.equal("GET");
    });
  });

  describe("health()", () => {
    it("should return statusCode on success", async () => {
      const client = clientWith(200, { statusCode: 200 });
      const result = await client.health();

      expect(result.statusCode).to.equal(200);
    });

    it("should call /health endpoint directly (no /v2 prefix)", async () => {
      const { fetch, calls } = capturingFetch(200, { statusCode: 200 });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.health();

      expect(calls[0].url).to.equal("http://localhost:3000/health");
    });

    it("should not send method/headers/body via request()", async () => {
      const { fetch, calls } = capturingFetch(200, { statusCode: 200 });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.health();

      // health() calls fetchFn directly without RequestInit options
      expect(calls[0].init).to.be.undefined;
    });

    it("should work even when server returns non-ok status", async () => {
      // health() does not go through the private request() method,
      // so it does not throw CryptoApiError on non-ok responses.
      const client = clientWith(503, { statusCode: 503 });
      const result = await client.health();

      expect(result.statusCode).to.equal(503);
    });
  });
});

// ---------------------------------------------------------------------------
// Interface type-checking (compile-time verification)
// ---------------------------------------------------------------------------

describe("Exported interfaces (compile-time checks)", () => {
  it("should allow constructing all interface types", () => {
    // These assignments verify the interfaces are properly exported
    // and structurally sound. They run at compile-time via ts-node.
    const opts: ClientOptions = { baseUrl: "http://localhost:3000" };
    const resp: ApiResponse<string> = { data: "hello" };
    const apiErr: ApiError = { error: "err" };
    const apiErrDetailed: ApiError = {
      error: "err",
      details: [{ field: "f", message: "m" }],
    };
    const hashRes: HashResult = {
      digest: "d",
      algorithm: "sha256",
      length: 32,
    };
    const aeadRes: AeadResult = {
      ciphertext: "ct",
      algorithm: "aes-256-gcm",
    };
    const kdfRes: KdfResult = {
      derivedKey: "dk",
      salt: "s",
      algorithm: "argon2id",
      keyLength: 32,
    };
    const ed25519: Ed25519KeyPair = {
      privateKey: "priv",
      publicKey: "pub",
    };
    const signRes: SignResult = {
      signature: "sig",
      algorithm: "ed25519",
    };
    const verifyRes: VerifyResult = { valid: true, algorithm: "ed25519" };
    const hybridKp: HybridKeyPair = {
      x25519PrivateKey: "a",
      x25519PublicKey: "b",
      mlKemPublicKey: "c",
      mlKemSecretKey: "d",
      algorithm: "x25519-ml-kem-768",
    };
    const hybridEncap: HybridEncapsulateResult = {
      x25519EphemeralPublic: "e",
      mlKemCiphertext: "f",
      sharedSecret: "g",
      algorithm: "x25519-ml-kem-768",
    };

    // Just verify they are all defined (prevents dead-code elimination)
    expect(opts).to.exist;
    expect(resp).to.exist;
    expect(apiErr).to.exist;
    expect(apiErrDetailed).to.exist;
    expect(hashRes).to.exist;
    expect(aeadRes).to.exist;
    expect(kdfRes).to.exist;
    expect(ed25519).to.exist;
    expect(signRes).to.exist;
    expect(verifyRes).to.exist;
    expect(hybridKp).to.exist;
    expect(hybridEncap).to.exist;
  });
});
