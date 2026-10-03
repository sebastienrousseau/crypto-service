/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
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
  KeyGenerateResult,
  KeyExportResult,
  SignResult,
  VerifyResult,
  HybridKeyPair,
  HybridEncapsulateResult,
  KemDecapsulateResult,
  MlKemKeyPair,
  SealedboxSealResult,
} from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock fetch function that returns the given JSON body with the
 * specified HTTP status code.
 */
function mockFetch(status: number, body: unknown): typeof globalThis.fetch {
  return (async () => {
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
  calls: Array<{ url: string | URL; init?: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string | URL; init?: RequestInit | undefined }> =
    [];
  const fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

/**
 * Creates a mock fetch whose response body cannot be parsed as JSON, as
 * for an HTML error page from a proxy.
 */
function unparsableFetch(
  status: number,
  statusText: string,
): typeof globalThis.fetch {
  return (async () => {
    return {
      ok: false,
      status,
      statusText,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    } as unknown as Response;
  }) as typeof globalThis.fetch;
}

/** A problem body as crypto-server sends it. */
const PROBLEM: ApiError = {
  type: "urn:crypto-service:problem:validation-failed",
  title: "Validation failed",
  status: 400,
  detail: "body/algorithm must be equal to one of the allowed values",
  instance: "/v2/hash",
  errors: [
    {
      field: "/algorithm",
      message: "must be equal to one of the allowed values",
    },
  ],
};

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
  it("should set name, status, body, and message from the problem", () => {
    const err = new CryptoApiError(400, PROBLEM);

    expect(err).to.be.an.instanceOf(Error);
    expect(err).to.be.an.instanceOf(CryptoApiError);
    expect(err.name).to.equal("CryptoApiError");
    expect(err.status).to.equal(400);
    expect(err.body).to.deep.equal(PROBLEM);
    expect(err.message).to.equal(
      "API Error 400: body/algorithm must be equal to one of the allowed values",
    );
  });

  it("should keep extension members such as code", () => {
    const problem: ApiError = {
      type: "urn:crypto-service:problem:key-not-found",
      title: "Key not found",
      status: 404,
      detail: "Key not found",
      code: "KEY_NOT_FOUND",
    };
    const err = new CryptoApiError(404, problem);

    expect(err.body.code).to.equal("KEY_NOT_FOUND");
    expect(err.body.errors).to.be.undefined;
    expect(err.message).to.equal("API Error 404: Key not found");
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
    it("should throw CryptoApiError carrying the problem body", async () => {
      const client = clientWith(400, PROBLEM);

      try {
        await client.hash({ algorithm: "sha256", data: "test" });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(CryptoApiError);
        const apiErr = err as CryptoApiError;
        expect(apiErr.status).to.equal(400);
        expect(apiErr.body).to.deep.equal(PROBLEM);
      }
    });

    it("should throw CryptoApiError on 500 response", async () => {
      const client = clientWith(500, {
        type: "urn:crypto-service:problem:internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred",
      });

      try {
        await client.encrypt({ key: "k", plaintext: "p" });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(CryptoApiError);
        expect((err as CryptoApiError).status).to.equal(500);
        expect((err as CryptoApiError).body.detail).to.equal(
          "An unexpected error occurred",
        );
      }
    });

    it("should build an about:blank problem from a non-problem JSON body", async () => {
      // The pre-RFC 9457 `{ error }` shape, or any other JSON without `detail`.
      const client = clientWith(401, { error: "unauthorized" });

      try {
        await client.algorithms();
        expect.fail("should have thrown");
      } catch (err) {
        const apiErr = err as CryptoApiError;
        expect(apiErr.status).to.equal(401);
        expect(apiErr.body).to.deep.equal({
          type: "about:blank",
          title: "HTTP error",
          status: 401,
          detail: "The server answered 401 without a problem body",
        });
      }
    });

    it("should build an about:blank problem from a null JSON body", async () => {
      const client = clientWith(502, null);

      const err = await client.algorithms().catch((e: unknown) => e);
      expect((err as CryptoApiError).body.type).to.equal("about:blank");
    });

    it("should use the status text for a body that is not JSON", async () => {
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch: unparsableFetch(502, "Bad Gateway"),
      });

      const err = await client.algorithms().catch((e: unknown) => e);
      expect(err).to.be.an.instanceOf(CryptoApiError);
      expect((err as CryptoApiError).body).to.deep.equal({
        type: "about:blank",
        title: "Bad Gateway",
        status: 502,
        detail: "The server answered 502 without a problem body",
      });
      expect((err as CryptoApiError).message).to.equal(
        "API Error 502: The server answered 502 without a problem body",
      );
    });

    it("should attach AbortSignal when timeout is configured", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { hash: ["sha256"] },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
        timeout: 5000,
      });
      await client.algorithms();
      expect(calls[0].init?.signal).to.be.an.instanceOf(AbortSignal);
    });

    describe("retry on transient errors", () => {
      it("should retry on 429 and succeed when retry succeeds", async () => {
        let callCount = 0;
        const mockFetch = async () => {
          callCount++;
          if (callCount === 1) {
            return {
              ok: false,
              status: 429,
              statusText: "Too Many Requests",
              headers: new Headers({ "retry-after": "0.01" }),
              json: async () => ({
                type: "urn:crypto-service:problem:rate-limited",
                title: "Too Many Requests",
                status: 429,
                detail: "Rate limit exceeded",
              }),
            } as unknown as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { digest: "ok" } }),
          } as unknown as Response;
        };

        const client = new CryptoClient({
          baseUrl: "http://localhost:3000",
          fetch: mockFetch as typeof globalThis.fetch,
          retry: { maxRetries: 2, initialDelayMs: 5, maxDelayMs: 20 },
        });

        const res = await client.hash({ algorithm: "sha256", data: "test" });
        expect(callCount).to.equal(2);
        expect(res.data.digest).to.equal("ok");
      });

      it("should handle non-numeric retry-after header gracefully", async () => {
        let callCount = 0;
        const mockFetch = async () => {
          callCount++;
          if (callCount === 1) {
            return {
              ok: false,
              status: 429,
              statusText: "Too Many Requests",
              headers: new Headers({ "retry-after": "not-a-number" }),
              json: async () => ({
                type: "urn:crypto-service:problem:rate-limited",
                title: "Too Many Requests",
                status: 429,
                detail: "Rate limit exceeded",
              }),
            } as unknown as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { digest: "ok" } }),
          } as unknown as Response;
        };

        const client = new CryptoClient({
          baseUrl: "http://localhost:3000",
          fetch: mockFetch as typeof globalThis.fetch,
          retry: { maxRetries: 1, initialDelayMs: 5 },
        });

        const res = await client.hash({ algorithm: "sha256", data: "test" });
        expect(callCount).to.equal(2);
        expect(res.data.digest).to.equal("ok");
      });

      it("should not retry on non-transient 400 errors", async () => {
        let callCount = 0;
        const mockFetch = async () => {
          callCount++;
          return {
            ok: false,
            status: 400,
            statusText: "Bad Request",
            json: async () => PROBLEM,
          } as unknown as Response;
        };

        const client = new CryptoClient({
          baseUrl: "http://localhost:3000",
          fetch: mockFetch as typeof globalThis.fetch,
          retry: { maxRetries: 3, initialDelayMs: 5 },
        });

        const err = await client
          .hash({ algorithm: "sha256", data: "test" })
          .catch((e) => e);
        expect(callCount).to.equal(1);
        expect(err).to.be.an.instanceOf(CryptoApiError);
        expect((err as CryptoApiError).status).to.equal(400);
      });

      it("should exhaust retries on persistent 503 and throw CryptoApiError", async () => {
        let callCount = 0;
        const mockFetch = async () => {
          callCount++;
          return {
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            json: async () => ({
              type: "about:blank",
              title: "Service Unavailable",
              status: 503,
              detail: "Service Unavailable",
            }),
          } as unknown as Response;
        };

        const client = new CryptoClient({
          baseUrl: "http://localhost:3000",
          fetch: mockFetch as typeof globalThis.fetch,
          retry: { maxRetries: 2, initialDelayMs: 5, maxDelayMs: 20 },
        });

        const err = await client
          .hash({ algorithm: "sha256", data: "test" })
          .catch((e) => e);
        expect(callCount).to.equal(3);
        expect(err).to.be.an.instanceOf(CryptoApiError);
        expect((err as CryptoApiError).status).to.equal(503);
      });

      it("should retry on network fetch errors and succeed", async () => {
        let callCount = 0;
        const mockFetch = async () => {
          callCount++;
          if (callCount === 1) {
            throw new TypeError("Failed to fetch");
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { digest: "recovered" } }),
          } as unknown as Response;
        };

        const client = new CryptoClient({
          baseUrl: "http://localhost:3000",
          fetch: mockFetch as typeof globalThis.fetch,
          retry: { maxRetries: 1, initialDelayMs: 5 },
        });

        const res = await client.hash({ algorithm: "sha256", data: "test" });
        expect(callCount).to.equal(2);
        expect(res.data.digest).to.equal("recovered");
      });

      it("should rethrow network error if retries are exhausted", async () => {
        let callCount = 0;
        const mockFetch = async () => {
          callCount++;
          throw new TypeError("Connection refused");
        };

        const client = new CryptoClient({
          baseUrl: "http://localhost:3000",
          fetch: mockFetch as typeof globalThis.fetch,
          retry: { maxRetries: 2, initialDelayMs: 5 },
        });

        const err = await client
          .hash({ algorithm: "sha256", data: "test" })
          .catch((e) => e);
        expect(callCount).to.equal(3);
        expect(err).to.be.an.instanceOf(TypeError);
        expect((err as TypeError).message).to.equal("Connection refused");
      });
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
        algorithm: "pbkdf2-sha256",
        keyLength: 32,
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.kdf({
        algorithm: "pbkdf2-sha256",
        password: "passw0rd",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should send optional params", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          derivedKey: "dk",
          salt: "s",
          algorithm: "pbkdf2-sha256",
          keyLength: 64,
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.kdf({
        algorithm: "pbkdf2-sha256",
        password: "pw",
        salt: "custom-salt",
        keyLength: 64,
        params: { iterations: 600_000 },
      });

      const body = JSON.parse(calls[0].init?.body as string);
      expect(body.salt).to.equal("custom-salt");
      expect(body.keyLength).to.equal(64);
      expect(body.params.iterations).to.equal(600_000);
    });

    it("should call /v2/kdf endpoint", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          derivedKey: "dk",
          salt: "s",
          algorithm: "pbkdf2-sha256",
          keyLength: 32,
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.kdf({ algorithm: "pbkdf2-sha256", password: "pw" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/kdf");
    });
  });

  // -----------------------------------------------------------------------
  // Signing: generateKeyPair, sign, verify
  // -----------------------------------------------------------------------

  describe("generateKeyPair()", () => {
    it("should return KeyGenerateResult (keyId, no private key) on success", async () => {
      const responseData: KeyGenerateResult = {
        keyId: "k_AAAAAAAAAAAAAAAAAAAAAA",
        algorithm: "ed25519",
        publicKey: "pub-hex",
        kid: "kid",
        metadata: { kid: "kid" },
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.generateKeyPair();

      expect(result.data).to.deep.equal(responseData);
    });

    it("should POST to /v2/keys/generate with ed25519 algorithm", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { keyId: "k", algorithm: "ed25519", publicKey: "q" },
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

    it("should send the requested algorithm and metadata", async () => {
      const { fetch, calls } = capturingFetch(200, { data: {} });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.generateKeyPair({
        algorithm: "x25519",
        metadata: { use: "enc" },
      });

      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        algorithm: "x25519",
        metadata: { use: "enc" },
      });
    });
  });

  describe("exportKey()", () => {
    it("should POST the keyId to /v2/keys/export", async () => {
      const responseData: KeyExportResult = {
        keyId: "k_AAAAAAAAAAAAAAAAAAAAAA",
        algorithm: "ed25519",
        publicKey: "pub",
        privateKey: "priv",
      };
      const { fetch, calls } = capturingFetch(200, { data: responseData });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.exportKey({ keyId: responseData.keyId });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/keys/export");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: responseData.keyId,
      });
      expect(result.data).to.deep.equal(responseData);
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
        keyId: "k_AAAAAAAAAAAAAAAAAAAAAA",
        message: "hello",
      });

      expect(result.data).to.deep.equal(responseData);
    });

    it("should send keyId and message to /v2/sign", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { signature: "s", algorithm: "ed25519" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.sign({ keyId: "k1", message: "msg" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/sign");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: "k1",
        message: "msg",
      });
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

  describe("mlKemGenerateKeyPair()", () => {
    it("should POST an empty body to /v2/pq/keygen", async () => {
      const responseData: MlKemKeyPair = {
        keyId: "k1",
        algorithm: "ml-kem-768",
        publicKey: "pub",
      };
      const { fetch, calls } = capturingFetch(200, { data: responseData });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.mlKemGenerateKeyPair();

      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/keygen");
      expect(calls[0].init?.body).to.equal(JSON.stringify({}));
      expect(result.data).to.deep.equal(responseData);
    });
  });

  describe("mlKemEncapsulate()", () => {
    it("should POST the public key to /v2/pq/encapsulate", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { ciphertext: "c", sharedSecret: "s", algorithm: "ml-kem-768" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.mlKemEncapsulate({ publicKey: "pub" });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/encapsulate");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        publicKey: "pub",
      });
    });
  });

  describe("mlKemDecapsulate()", () => {
    it("should POST keyId and ciphertext to /v2/pq/decapsulate", async () => {
      const responseData: KemDecapsulateResult = {
        sharedSecret: "s",
        algorithm: "ml-kem-768",
      };
      const { fetch, calls } = capturingFetch(200, { data: responseData });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.mlKemDecapsulate({
        keyId: "k1",
        ciphertext: "c",
      });

      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/decapsulate");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: "k1",
        ciphertext: "c",
      });
      expect(result.data).to.deep.equal(responseData);
    });
  });

  describe("pqGenerateKeyPair()", () => {
    it("should return HybridKeyPair on success", async () => {
      const responseData: HybridKeyPair = {
        keyId: "k_AAAAAAAAAAAAAAAAAAAAAA",
        x25519PublicKey: "x-pub",
        mlKemPublicKey: "ml-pub",
        algorithm: "x25519-ml-kem-768",
      };
      const client = clientWith(200, { data: responseData });
      const result = await client.pqGenerateKeyPair();

      expect(result.data).to.deep.equal(responseData);
    });

    it("should POST to /v2/pq/hybrid/keygen with empty body", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          keyId: "k1",
          x25519PublicKey: "b",
          mlKemPublicKey: "c",
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
        keyId: "k_AAAAAAAAAAAAAAAAAAAAAA",
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
        keyId: "k1",
        x25519EphemeralPublic: "c",
        mlKemCiphertext: "d",
      });

      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/hybrid/decapsulate",
      );
      expect(calls[0].init?.method).to.equal("POST");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: "k1",
        x25519EphemeralPublic: "c",
        mlKemCiphertext: "d",
      });
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
      await client.pqSign({ keyId: "k1", message: "msg" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/dsa/sign");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: "k1",
        message: "msg",
      });
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
        data: { keyId: "k1", publicKey: "p", algorithm: "ml-dsa-44" },
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
    it("should call /v2/pq/slh-dsa/sign with keyId", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { signature: "s", algorithm: "slh-dsa-shake-128f" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqHashSign({ keyId: "k1", message: "m" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/pq/slh-dsa/sign");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: "k1",
        message: "m",
      });
    });
  });

  describe("pqHashVerify()", () => {
    it("should call /v2/pq/slh-dsa/verify", async () => {
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
        "http://localhost:3000/v2/pq/slh-dsa/verify",
      );
    });
  });

  describe("pqHashSignKeygen()", () => {
    it("should call /v2/pq/slh-dsa/keygen", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { keyId: "k1", publicKey: "p", algorithm: "slh-dsa-shake-128f" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.pqHashSignKeygen({ variant: "shake-128f" });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/pq/slh-dsa/keygen",
      );
    });
  });

  describe("secretboxSeal()", () => {
    it("should call /v2/secretbox/seal", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { sealed: "ct", algorithm: "xchacha20-poly1305" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.secretboxSeal({ key: "k", plaintext: "p" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/secretbox/seal");
    });
  });

  describe("secretboxOpen()", () => {
    it("should call /v2/secretbox/open and return the plaintext as data", async () => {
      const { fetch, calls } = capturingFetch(200, { data: "pt" });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.secretboxOpen({ key: "k", ciphertext: "ct" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/secretbox/open");
      expect(result.data).to.equal("pt");
    });
  });

  describe("sealedboxSeal()", () => {
    it("should call /v2/sealedbox/seal", async () => {
      const responseData: SealedboxSealResult = {
        sealed: "s",
        algorithm: "x25519-xchacha20-poly1305",
      };
      const { fetch, calls } = capturingFetch(200, { data: responseData });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.sealedboxSeal({ recipientPublicKey: "pk", plaintext: "p" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/sealedbox/seal");
    });
  });

  describe("sealedboxOpen()", () => {
    it("should call /v2/sealedbox/open with keyId", async () => {
      const { fetch, calls } = capturingFetch(200, { data: "pt" });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.sealedboxOpen({ keyId: "k1", sealed: "s" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/sealedbox/open");
      expect(JSON.parse(calls[0].init?.body as string)).to.deep.equal({
        keyId: "k1",
        sealed: "s",
      });
      expect(result.data).to.equal("pt");
    });
  });

  describe("sealedboxSealPq()", () => {
    it("should call /v2/sealedbox/seal-pq", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: {
          sealed: "s",
          algorithm: "x25519-ml-kem-768-xchacha20-poly1305",
        },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.sealedboxSealPq({
        x25519PublicKey: "x",
        mlKemPublicKey: "m",
        plaintext: "p",
      });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/sealedbox/seal-pq",
      );
    });
  });

  describe("sealedboxOpenPq()", () => {
    it("should call /v2/sealedbox/open-pq with keyId", async () => {
      const { fetch, calls } = capturingFetch(200, { data: "pt" });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.sealedboxOpenPq({ keyId: "k1", sealed: "s" });
      expect(calls[0].url).to.equal(
        "http://localhost:3000/v2/sealedbox/open-pq",
      );
      expect(result.data).to.equal("pt");
    });
  });

  describe("passwordEncrypt()", () => {
    it("should call /v2/password/encrypt", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { encrypted: "ct", algorithm: "argon2id-xchacha20-poly1305" },
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
      const { fetch, calls } = capturingFetch(200, { data: "pt" });
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
        data: { mac: "m", algorithm: "sha256" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.mac({ algorithm: "sha256", key: "k", data: "d" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/hmac");
    });
  });

  describe("macVerify()", () => {
    it("should call /v2/hmac/verify", async () => {
      const { fetch, calls } = capturingFetch(200, {
        data: { valid: true, algorithm: "sha256" },
      });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      await client.macVerify({
        algorithm: "sha256",
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
        data: { wrapped: "wk", algorithm: "aes-kw" },
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
      const { fetch, calls } = capturingFetch(200, { data: "00ff" });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });
      const result = await client.keyUnwrap({ kek: "k", wrappedKey: "wk" });
      expect(calls[0].url).to.equal("http://localhost:3000/v2/keys/unwrap");
      expect(result.data).to.equal("00ff");
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

  describe("getDoraCompliance()", () => {
    it("should fetch DORA compliance scorecard from /v2/compliance/dora", async () => {
      const mockScorecard = {
        standard: "DORA (EU 2022/2554)",
        article: "Article 9 & Article 13",
        status: "Self-assessment (not a compliance verdict)",
        disclaimer: "Not a compliance verdict.",
        quantumResistanceRatio: 78.5,
        activePrimitivesCount: 52,
        postQuantumPrimitivesCount: 18,
        algorithmDeprecationSchedule: [],
        cryptographicInventory: [],
        timestamp: "2026-09-29T12:00:00Z",
      };
      const { fetch, calls } = capturingFetch(200, { data: mockScorecard });
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });

      const res = await client.getDoraCompliance();
      expect(calls[0].url).to.equal("http://localhost:3000/v2/compliance/dora");
      expect(calls[0].init?.method).to.equal("GET");
      expect(res.data.status).to.equal(
        "Self-assessment (not a compliance verdict)",
      );
      expect(res.data.disclaimer).to.equal("Not a compliance verdict.");
    });
  });

  describe("getCbom()", () => {
    it("should fetch CycloneDX 1.6 CBOM from /v2/compliance/cbom", async () => {
      const mockCbom = {
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        serialNumber: "urn:uuid:mock-uuid",
        version: 1,
        metadata: {},
        components: [],
      };
      // The route returns the CycloneDX document itself, without `{ data }`.
      const { fetch, calls } = capturingFetch(200, mockCbom);
      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch,
      });

      const res = await client.getCbom();
      expect(calls[0].url).to.equal("http://localhost:3000/v2/compliance/cbom");
      expect(calls[0].init?.method).to.equal("GET");
      expect(res).to.deep.equal(mockCbom);
    });
  });

  describe("negotiateAlgorithm()", () => {
    const client = new CryptoClient({ baseUrl: "http://localhost:3000" });

    it("defaults to category 1 with standard fallback", () => {
      const res = client.negotiateAlgorithm();
      expect(res.selectedAlgorithm).to.equal("x448-mlkem1024");
      expect(res.securityCategory).to.equal(5);
      expect(res.isHybrid).to.be.true;
      expect(res.compliancePosture.doraArticle13Compliant).to.be.true;
    });

    it("negotiates within MTU constraints (e.g. 1500 bytes payload)", () => {
      const res = client.negotiateAlgorithm({ maxPayloadBytes: 1500 });
      expect(res.selectedAlgorithm).to.equal("x25519-mlkem768");
      expect(res.ciphertextBytes).to.be.at.most(1500);
      expect(res.fitsWithinMtu).to.be.true;
    });

    it("respects requireHybrid requirement", () => {
      const res = client.negotiateAlgorithm({
        securityCategoryMin: 3,
        requireHybrid: true,
      });
      expect(res.isHybrid).to.be.true;
      expect(res.cipherCategory).to.equal("hybrid-kem");
      expect(res.selectedAlgorithm).to.equal("x448-mlkem1024");
    });

    it("respects clientSupportedAlgorithms whitelist", () => {
      const res = client.negotiateAlgorithm({
        clientSupportedAlgorithms: ["ml-kem-512", "x25519"],
      });
      expect(res.selectedAlgorithm).to.equal("ml-kem-512");
      expect(res.securityCategory).to.equal(1);
    });

    it("falls back to classical ecdh when tightly constrained", () => {
      const res = client.negotiateAlgorithm({
        maxPayloadBytes: 100,
        securityCategoryMin: 1,
      });
      expect(res.selectedAlgorithm).to.equal("x25519");
      expect(res.fitsWithinMtu).to.be.true;
    });

    it("handles fallback when no eligible candidate fits MTU", () => {
      const res = client.negotiateAlgorithm({
        securityCategoryMin: 5,
        maxPayloadBytes: 500,
      });
      expect(res.fitsWithinMtu).to.be.false;
      expect(res.selectedAlgorithm).to.equal("x448-mlkem1024");
    });

    it("falls back to baseline cipher when client provides no matching algorithms", () => {
      const res = client.negotiateAlgorithm({
        clientSupportedAlgorithms: ["unknown-algorithm-xyz"],
      });
      expect(res.selectedAlgorithm).to.equal("x25519");
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
    const apiErr: ApiError = {
      type: "about:blank",
      title: "t",
      status: 500,
      detail: "d",
    };
    const apiErrDetailed: ApiError = PROBLEM;
    const hashRes: HashResult = {
      digest: "d",
      algorithm: "sha256",
      length: 32,
    };
    const aeadRes: AeadResult = {
      ciphertext: "ct",
      algorithm: "xchacha20-poly1305",
    };
    const kdfRes: KdfResult = {
      derivedKey: "dk",
      salt: "s",
      algorithm: "pbkdf2-sha256",
      keyLength: 32,
    };
    const keyGen: KeyGenerateResult = {
      keyId: "k",
      algorithm: "ed25519",
      publicKey: "pub",
      kid: "kid",
      metadata: {},
    };
    const signRes: SignResult = {
      signature: "sig",
      algorithm: "ed25519",
    };
    const verifyRes: VerifyResult = { valid: true, algorithm: "ed25519" };
    const hybridKp: HybridKeyPair = {
      keyId: "k",
      x25519PublicKey: "b",
      mlKemPublicKey: "c",
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
    expect(keyGen).to.exist;
    expect(signRes).to.exist;
    expect(verifyRes).to.exist;
    expect(hybridKp).to.exist;
    expect(hybridEncap).to.exist;
  });
});
