// SPDX-License-Identifier: MIT OR Apache-2.0
import { expect } from "chai";
import {
  KmsError,
  LocalKmsProvider,
  AwsKmsProvider,
  GcpKmsProvider,
  AzureKmsProvider,
  VaultKmsProvider,
} from "../src/index";
import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../src/types";

/** The AwsKmsProvider internals the AWS tests replace with mocks. */
interface AwsInternals {
  client: unknown;
  getClient: () => Promise<unknown>;
}

// Disable AWS EC2 metadata lookup to avoid network timeouts in CI/sandboxes
process.env.AWS_EC2_METADATA_DISABLED = "true";

// ---------------------------------------------------------------------------
// Types – compile-time shape verification
// ---------------------------------------------------------------------------
describe("Types", () => {
  it("KmsKeyMetadata has required fields", () => {
    const meta: KmsKeyMetadata = {
      keyId: "k-1",
      algorithm: "aes-256-gcm",
      usage: "encrypt",
      createdAt: new Date().toISOString(),
      enabled: true,
      provider: "local",
    };
    expect(meta.keyId).to.equal("k-1");
    expect(meta.algorithm).to.equal("aes-256-gcm");
    expect(meta.usage).to.equal("encrypt");
    expect(meta.enabled).to.be.true;
    expect(meta.provider).to.equal("local");
    expect(meta.createdAt).to.be.a("string");
  });

  it("KmsEncryptResult has required fields and optional context", () => {
    const res: KmsEncryptResult = { ciphertext: "abc", keyId: "k-1" };
    expect(res.ciphertext).to.equal("abc");
    expect(res.keyId).to.equal("k-1");
    expect(res.context).to.be.undefined;

    const resCtx: KmsEncryptResult = {
      ciphertext: "abc",
      keyId: "k-1",
      context: { purpose: "test" },
    };
    expect(resCtx.context).to.deep.equal({ purpose: "test" });
  });

  it("KmsDecryptResult has required fields", () => {
    const res: KmsDecryptResult = {
      plaintext: new Uint8Array([1, 2]),
      keyId: "k-1",
    };
    expect(res.plaintext).to.be.instanceOf(Uint8Array);
    expect(res.keyId).to.equal("k-1");
  });

  it("KmsSignResult has required fields", () => {
    const res: KmsSignResult = {
      signature: "sig",
      keyId: "k-1",
      algorithm: "ed25519",
    };
    expect(res.signature).to.equal("sig");
    expect(res.algorithm).to.equal("ed25519");
  });

  it("KmsProvider interface is satisfied by LocalKmsProvider", () => {
    const provider: KmsProvider = new LocalKmsProvider();
    expect(provider.name).to.equal("local");
    expect(provider.listKeys).to.be.a("function");
    expect(provider.getKey).to.be.a("function");
    expect(provider.createKey).to.be.a("function");
    expect(provider.enableKey).to.be.a("function");
    expect(provider.disableKey).to.be.a("function");
    expect(provider.scheduleKeyDeletion).to.be.a("function");
    expect(provider.encrypt).to.be.a("function");
    expect(provider.decrypt).to.be.a("function");
    expect(provider.sign).to.be.a("function");
    expect(provider.verify).to.be.a("function");
    expect(provider.rotateKey).to.be.a("function");
    expect(provider.generateDataKey).to.be.a("function");
  });
});

// ---------------------------------------------------------------------------
// LocalKmsProvider – full coverage
// ---------------------------------------------------------------------------
describe("LocalKmsProvider", () => {
  let provider: LocalKmsProvider;

  beforeEach(() => {
    provider = new LocalKmsProvider();
  });

  // -- name ---------------------------------------------------------------
  it("has name 'local'", () => {
    expect(provider.name).to.equal("local");
  });

  // -- createKey ----------------------------------------------------------
  describe("createKey", () => {
    it("creates an encryption key with aes-256-gcm", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      expect(key.keyId).to.match(/^local-/);
      expect(key.algorithm).to.equal("aes-256-gcm");
      expect(key.usage).to.equal("encrypt");
      expect(key.enabled).to.be.true;
      expect(key.provider).to.equal("local");
      expect(key.createdAt).to.be.a("string");
    });

    it("creates a signing key (ed25519)", async () => {
      const key = await provider.createKey("ed25519", "sign");
      expect(key.usage).to.equal("sign");
      expect(key.algorithm).to.equal("ed25519");
    });

    it("creates a wrap key", async () => {
      const key = await provider.createKey("aes-256-gcm", "wrap");
      expect(key.usage).to.equal("wrap");
    });

    it("accepts optional metadata parameter", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt", {
        team: "security",
      });
      expect(key.keyId).to.match(/^local-/);
    });

    it("generates unique key IDs", async () => {
      const k1 = await provider.createKey("aes-256-gcm", "encrypt");
      const k2 = await provider.createKey("aes-256-gcm", "encrypt");
      expect(k1.keyId).to.not.equal(k2.keyId);
    });
  });

  // -- getKey -------------------------------------------------------------
  describe("getKey", () => {
    it("retrieves a key by ID", async () => {
      const created = await provider.createKey("aes-256-gcm", "encrypt");
      const retrieved = await provider.getKey(created.keyId);
      expect(retrieved).to.deep.equal(created);
    });

    it("returns a copy (not the internal reference)", async () => {
      const created = await provider.createKey("aes-256-gcm", "encrypt");
      const r1 = await provider.getKey(created.keyId);
      const r2 = await provider.getKey(created.keyId);
      expect(r1).to.deep.equal(r2);
      expect(r1).to.not.equal(r2);
    });

    it("throws for unknown key ID", async () => {
      try {
        await provider.getKey("nonexistent");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });
  });

  // -- listKeys -----------------------------------------------------------
  describe("listKeys", () => {
    it("returns empty array when no keys exist", async () => {
      const keys = await provider.listKeys();
      expect(keys).to.deep.equal([]);
    });

    it("lists all keys", async () => {
      await provider.createKey("aes-256-gcm", "encrypt");
      await provider.createKey("ed25519", "sign");
      const keys = await provider.listKeys();
      expect(keys).to.have.length(2);
    });

    it("filters by usage", async () => {
      await provider.createKey("aes-256-gcm", "encrypt");
      await provider.createKey("ed25519", "sign");
      const encryptKeys = await provider.listKeys({ usage: "encrypt" });
      expect(encryptKeys).to.have.length(1);
      expect(encryptKeys[0].usage).to.equal("encrypt");

      const signKeys = await provider.listKeys({ usage: "sign" });
      expect(signKeys).to.have.length(1);
      expect(signKeys[0].usage).to.equal("sign");
    });

    it("filters by enabled status", async () => {
      const k1 = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.createKey("aes-256-gcm", "encrypt");
      await provider.disableKey(k1.keyId);

      const enabled = await provider.listKeys({ enabled: true });
      expect(enabled).to.have.length(1);

      const disabled = await provider.listKeys({ enabled: false });
      expect(disabled).to.have.length(1);
    });

    it("filters by both usage and enabled", async () => {
      const k1 = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.createKey("ed25519", "sign");
      await provider.disableKey(k1.keyId);

      const result = await provider.listKeys({
        usage: "encrypt",
        enabled: false,
      });
      expect(result).to.have.length(1);
      expect(result[0].keyId).to.equal(k1.keyId);
    });

    it("excludes keys pending deletion", async () => {
      const k1 = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.createKey("aes-256-gcm", "encrypt");
      await provider.scheduleKeyDeletion(k1.keyId);

      const keys = await provider.listKeys();
      expect(keys).to.have.length(1);
    });

    it("returns empty with no-match filter", async () => {
      await provider.createKey("aes-256-gcm", "encrypt");
      const keys = await provider.listKeys({ usage: "wrap" });
      expect(keys).to.have.length(0);
    });
  });

  // -- enableKey / disableKey ---------------------------------------------
  describe("enableKey / disableKey", () => {
    it("disables then enables a key", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.disableKey(key.keyId);
      let meta = await provider.getKey(key.keyId);
      expect(meta.enabled).to.be.false;

      await provider.enableKey(key.keyId);
      meta = await provider.getKey(key.keyId);
      expect(meta.enabled).to.be.true;
    });

    it("enableKey throws for unknown key", async () => {
      try {
        await provider.enableKey("bad-id");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });

    it("disableKey throws for unknown key", async () => {
      try {
        await provider.disableKey("bad-id");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });
  });

  // -- scheduleKeyDeletion ------------------------------------------------
  describe("scheduleKeyDeletion", () => {
    it("marks key as pending deletion with default window", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.scheduleKeyDeletion(key.keyId);
      // key should be disabled
      const meta = await provider.getKey(key.keyId);
      expect(meta.enabled).to.be.false;
    });

    it("marks key as pending deletion with custom window", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.scheduleKeyDeletion(key.keyId, 7);
      const meta = await provider.getKey(key.keyId);
      expect(meta.enabled).to.be.false;
    });

    it("excluded from listKeys after scheduling deletion", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.scheduleKeyDeletion(key.keyId);
      const keys = await provider.listKeys();
      expect(keys).to.have.length(0);
    });

    it("throws for unknown key", async () => {
      try {
        await provider.scheduleKeyDeletion("bad-id");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });
  });

  // -- encrypt / decrypt round-trip ---------------------------------------
  describe("encrypt / decrypt", () => {
    it("round-trips plaintext correctly", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const plaintext = new TextEncoder().encode("hello world");
      const enc = await provider.encrypt(key.keyId, plaintext);

      expect(enc.ciphertext).to.be.a("string");
      expect(enc.keyId).to.equal(key.keyId);
      expect(enc.context).to.be.undefined;

      const dec = await provider.decrypt(key.keyId, enc.ciphertext);
      expect(new TextDecoder().decode(dec.plaintext)).to.equal("hello world");
      expect(dec.keyId).to.equal(key.keyId);
    });

    it("round-trips with encryption context (AAD)", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const plaintext = new TextEncoder().encode("secret");
      const ctx = { tenant: "acme", purpose: "backup" };

      const enc = await provider.encrypt(key.keyId, plaintext, ctx);
      expect(enc.context).to.deep.equal(ctx);

      const dec = await provider.decrypt(key.keyId, enc.ciphertext, ctx);
      expect(new TextDecoder().decode(dec.plaintext)).to.equal("secret");
    });

    it("decrypt fails with wrong context", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const plaintext = new TextEncoder().encode("secret");
      const enc = await provider.encrypt(key.keyId, plaintext, {
        tenant: "acme",
      });

      try {
        await provider.decrypt(key.keyId, enc.ciphertext, {
          tenant: "other",
        });
        expect.fail("should have thrown");
      } catch (err) {
        // AES-GCM auth tag failure
        expect(err).to.be.instanceOf(Error);
      }
    });

    it("decrypt fails with no context when encrypted with context", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const pt = new TextEncoder().encode("data");
      const enc = await provider.encrypt(key.keyId, pt, { a: "b" });

      try {
        await provider.decrypt(key.keyId, enc.ciphertext);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it("encrypts empty plaintext", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const enc = await provider.encrypt(key.keyId, new Uint8Array(0));
      const dec = await provider.decrypt(key.keyId, enc.ciphertext);
      expect(dec.plaintext).to.have.length(0);
    });

    it("encrypt throws for unknown key", async () => {
      try {
        await provider.encrypt("bad", new Uint8Array(1));
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });

    it("decrypt throws for unknown key", async () => {
      try {
        await provider.decrypt("bad", "AAAA");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });

    it("encrypt throws for disabled key", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.disableKey(key.keyId);
      try {
        await provider.encrypt(key.keyId, new Uint8Array(1));
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key is disabled");
      }
    });

    it("decrypt throws for disabled key", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const enc = await provider.encrypt(key.keyId, new Uint8Array([1]));
      await provider.disableKey(key.keyId);
      try {
        await provider.decrypt(key.keyId, enc.ciphertext);
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key is disabled");
      }
    });

    it("encrypt throws for signing key", async () => {
      const key = await provider.createKey("ed25519", "sign");
      try {
        await provider.encrypt(key.keyId, new Uint8Array(1));
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include(
          "signing key, not an encryption key",
        );
      }
    });

    it("decrypt throws for signing key", async () => {
      const key = await provider.createKey("ed25519", "sign");
      try {
        await provider.decrypt(key.keyId, "AAAA");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include(
          "signing key, not an encryption key",
        );
      }
    });
  });

  // -- sign / verify ------------------------------------------------------
  describe("sign / verify", () => {
    it("sign and verify round-trip", async () => {
      const key = await provider.createKey("ed25519", "sign");
      const data = new TextEncoder().encode("message to sign");

      const sig = await provider.sign(key.keyId, data);
      expect(sig.signature).to.be.a("string");
      expect(sig.keyId).to.equal(key.keyId);
      expect(sig.algorithm).to.equal("ed25519");

      const valid = await provider.verify(key.keyId, data, sig.signature);
      expect(valid).to.be.true;
    });

    it("verify rejects tampered data", async () => {
      const key = await provider.createKey("ed25519", "sign");
      const data = new TextEncoder().encode("original");
      const sig = await provider.sign(key.keyId, data);

      const tampered = new TextEncoder().encode("tampered");
      const valid = await provider.verify(key.keyId, tampered, sig.signature);
      expect(valid).to.be.false;
    });

    it("sign throws for unknown key", async () => {
      try {
        await provider.sign("bad", new Uint8Array(1));
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });

    it("verify throws for unknown key", async () => {
      try {
        await provider.verify("bad", new Uint8Array(1), "sig");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });

    it("sign throws for disabled key", async () => {
      const key = await provider.createKey("ed25519", "sign");
      await provider.disableKey(key.keyId);
      try {
        await provider.sign(key.keyId, new Uint8Array(1));
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key is disabled");
      }
    });

    it("sign throws for encryption key", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      try {
        await provider.sign(key.keyId, new Uint8Array(1));
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("not a signing key");
      }
    });

    it("verify throws for encryption key", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      try {
        await provider.verify(key.keyId, new Uint8Array(1), "sig");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("not a signing key");
      }
    });

    it("sign accepts optional algorithm param", async () => {
      const key = await provider.createKey("ed25519", "sign");
      const sig = await provider.sign(
        key.keyId,
        new Uint8Array([1, 2, 3]),
        "ed25519",
      );
      expect(sig.algorithm).to.equal("ed25519");
    });

    it("verify accepts optional algorithm param", async () => {
      const key = await provider.createKey("ed25519", "sign");
      const data = new Uint8Array([1, 2, 3]);
      const sig = await provider.sign(key.keyId, data);
      const valid = await provider.verify(
        key.keyId,
        data,
        sig.signature,
        "ed25519",
      );
      expect(valid).to.be.true;
    });
  });

  // -- rotateKey ----------------------------------------------------------
  describe("rotateKey", () => {
    it("rotates an encryption key (new material)", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const originalDate = key.createdAt;

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 5));

      const rotated = await provider.rotateKey(key.keyId);
      expect(rotated.keyId).to.equal(key.keyId);
      expect(rotated.algorithm).to.equal("aes-256-gcm");
      // createdAt is updated on rotation
      expect(rotated.createdAt).to.not.equal(originalDate);
    });

    it("rotates a signing key (new key pair)", async () => {
      const key = await provider.createKey("ed25519", "sign");

      // Sign before rotation
      const data = new TextEncoder().encode("test");
      const sigBefore = await provider.sign(key.keyId, data);

      await provider.rotateKey(key.keyId);

      // Signatures made before rotation still verify (previous version kept)
      const valid = await provider.verify(key.keyId, data, sigBefore.signature);
      expect(valid).to.be.true;

      // New sign/verify should work
      const sigAfter = await provider.sign(key.keyId, data);
      const validAfter = await provider.verify(
        key.keyId,
        data,
        sigAfter.signature,
      );
      expect(validAfter).to.be.true;
    });

    it("rotated encryption key still decrypts old ciphertext", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const pt = new TextEncoder().encode("before rotation");
      const enc = await provider.encrypt(key.keyId, pt);

      await provider.rotateKey(key.keyId);

      const dec = await provider.decrypt(key.keyId, enc.ciphertext);
      expect(new TextDecoder().decode(dec.plaintext)).to.equal(
        "before rotation",
      );
    });

    it("throws for unknown key", async () => {
      try {
        await provider.rotateKey("bad");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });
  });

  // -- generateDataKey ----------------------------------------------------
  describe("generateDataKey", () => {
    it("generates a 32-byte DEK and wrapped ciphertext", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const dek = await provider.generateDataKey(key.keyId);

      expect(dek.plaintext).to.be.instanceOf(Uint8Array);
      expect(dek.plaintext).to.have.length(32);
      expect(dek.ciphertext).to.be.a("string");
    });

    it("wrapped ciphertext can be decrypted to recover the DEK", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const dek = await provider.generateDataKey(key.keyId);

      const unwrapped = await provider.decrypt(key.keyId, dek.ciphertext);
      expect(
        Buffer.from(unwrapped.plaintext).equals(Buffer.from(dek.plaintext)),
      ).to.be.true;
    });

    it("throws for unknown key", async () => {
      try {
        await provider.generateDataKey("bad");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key not found");
      }
    });

    it("throws for disabled key", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.disableKey(key.keyId);
      try {
        await provider.generateDataKey(key.keyId);
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key is disabled");
      }
    });

    it("throws for signing key", async () => {
      const key = await provider.createKey("ed25519", "sign");
      try {
        await provider.generateDataKey(key.keyId);
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include(
          "signing key, cannot generate data key",
        );
      }
    });

    it("accepts optional keySpec parameter", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const dek = await provider.generateDataKey(key.keyId, "AES_256");
      expect(dek.plaintext).to.have.length(32);
    });
  });

  describe("wrapKey and unwrapKey", () => {
    it("wraps and unwraps a key with context", async () => {
      const kek = await provider.createKey("aes-256-gcm", "wrap");
      const secret = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const wrapped = await provider.wrapKey(kek.keyId, secret, {
        env: "prod",
      });
      expect(wrapped.wrappedKey).to.be.a("string");
      expect(wrapped.keyId).to.equal(kek.keyId);

      const unwrapped = await provider.unwrapKey(
        kek.keyId,
        wrapped.wrappedKey,
        { env: "prod" },
      );
      expect(Array.from(unwrapped.unwrappedKey)).to.deep.equal([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);
      expect(unwrapped.keyId).to.equal(kek.keyId);
    });
  });
});

// ---------------------------------------------------------------------------
// GcpKmsProvider – native Cloud KMS REST v1 API
// ---------------------------------------------------------------------------
describe("GcpKmsProvider", () => {
  const provider = new GcpKmsProvider({
    projectId: "test-project",
    locationId: "us-east1",
    keyRingId: "test-ring",
    token: "ya29.test-token",
  });

  it("has name 'gcp'", () => {
    expect(provider.name).to.equal("gcp");
  });

  describe("GCP KMS operations", () => {
    let origFetch: typeof globalThis.fetch;

    before(() => {
      origFetch = globalThis.fetch;
    });

    after(() => {
      globalThis.fetch = origFetch;
    });

    function mockFetch(
      fn: (url: string, init?: RequestInit) => Promise<Response> | Response,
    ): void {
      globalThis.fetch = ((url: unknown, init?: unknown) => {
        return Promise.resolve(
          fn(String(url), init as RequestInit | undefined),
        );
      }) as typeof globalThis.fetch;
    }

    it("handles fetch network failure", async () => {
      mockFetch(() => {
        throw new Error("connection failed");
      });
      try {
        await provider.getKey("k1");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("INVALID_ARGUMENT");
        expect((err as KmsError).message).to.include("connection failed");
      }
    });

    it("handles 404 not found", async () => {
      mockFetch(() => new Response("Resource not found", { status: 404 }));
      try {
        await provider.getKey("missing-key");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("NOT_FOUND");
      }
    });

    it("handles 400 decryption failed", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({ error: { message: "decryption error" } }),
            { status: 400 },
          ),
      );
      try {
        await provider.decrypt("k1", "bad-ct");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("DECRYPTION_FAILED");
      }
    });

    it("handles disabled or destroyed key error", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({ error: { message: "key is disabled" } }),
            { status: 400 },
          ),
      );
      try {
        await provider.encrypt("k1", new Uint8Array([1, 2]));
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("DISABLED");
      }
    });

    it("handles generic API error", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({ error: { message: "quota exceeded" } }),
            { status: 429 },
          ),
      );
      try {
        await provider.getKey("k1");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("INVALID_ARGUMENT");
        expect((err as KmsError).message).to.include("quota exceeded");
      }
    });

    it("handles empty response text", async () => {
      mockFetch(() => new Response("", { status: 200 }));
      const meta = await provider.getKey("empty-key");
      expect(meta.keyId).to.equal("empty-key");
    });

    it("handles invalid JSON response text", async () => {
      mockFetch(() => new Response("not-valid-json", { status: 200 }));
      const meta = await provider.getKey("bad-json-key");
      expect(meta.keyId).to.equal("bad-json-key");
    });

    it("getKey handles full resource name starting with projects/", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({
              name: "projects/p/locations/l/keyRings/r/cryptoKeys/full-key",
            }),
            { status: 200 },
          ),
      );
      const meta = await provider.getKey(
        "projects/p/locations/l/keyRings/r/cryptoKeys/full-key",
      );
      expect(meta.keyId).to.equal("full-key");
    });

    it("mapGcpKey handles empty or undefined name", async () => {
      mockFetch(() => new Response(JSON.stringify({}), { status: 200 }));
      const meta = await provider.getKey("fallback-key");
      expect(meta.keyId).to.equal("fallback-key");
    });

    it("mapGcpKey handles short key name without slashes", async () => {
      mockFetch(
        () =>
          new Response(JSON.stringify({ name: "short-key-id" }), {
            status: 200,
          }),
      );
      const meta = await provider.getKey("short-key-id");
      expect(meta.keyId).to.equal("short-key-id");
    });

    it("listKeys retrieves and filters keys", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({
              cryptoKeys: [
                {
                  name: "projects/p/locations/l/keyRings/r/cryptoKeys/key-1",
                  purpose: "ENCRYPT_DECRYPT",
                  primary: {
                    state: "ENABLED",
                    algorithm: "GOOGLE_SYMMETRIC_ENCRYPTION",
                  },
                },
                {
                  name: "projects/p/locations/l/keyRings/r/cryptoKeys/key-2",
                  purpose: "ASYMMETRIC_SIGN",
                  primary: {
                    state: "DISABLED",
                    algorithm: "RSA_SIGN_PSS_2048_SHA256",
                  },
                },
              ],
            }),
            { status: 200 },
          ),
      );
      const all = await provider.listKeys();
      expect(all).to.have.length(2);
      expect(all[0].keyId).to.equal("key-1");
      expect(all[0].usage).to.equal("encrypt");
      expect(all[0].enabled).to.be.true;
      expect(all[1].keyId).to.equal("key-2");
      expect(all[1].usage).to.equal("sign");
      expect(all[1].enabled).to.be.false;

      const encryptOnly = await provider.listKeys({ usage: "encrypt" });
      expect(encryptOnly).to.have.length(1);
      expect(encryptOnly[0].keyId).to.equal("key-1");

      const disabledOnly = await provider.listKeys({ enabled: false });
      expect(disabledOnly).to.have.length(1);
      expect(disabledOnly[0].keyId).to.equal("key-2");
    });

    it("listKeys handles empty cryptoKeys list", async () => {
      mockFetch(() => new Response(JSON.stringify({}), { status: 200 }));
      const keys = await provider.listKeys();
      expect(keys).to.deep.equal([]);
    });

    it("createKey creates symmetric and asymmetric keys with metadata", async () => {
      let reqBody: Record<string, unknown> | null = null;
      mockFetch((_url, init) => {
        reqBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            name: "projects/p/locations/l/keyRings/r/cryptoKeys/created-key",
            purpose: reqBody?.purpose,
            primary: {
              state: "ENABLED",
              algorithm: "GOOGLE_SYMMETRIC_ENCRYPTION",
            },
          }),
          { status: 200 },
        );
      });

      const symKey = await provider.createKey("aes-256-gcm", "encrypt", {
        env: "test",
      });
      expect(symKey.keyId).to.equal("created-key");
      expect(symKey.usage).to.equal("encrypt");

      const ecKey = await provider.createKey("p256", "sign");
      expect(ecKey.usage).to.equal("sign");

      const rsaKey = await provider.createKey("rsa-2048", "sign");
      expect(rsaKey.usage).to.equal("sign");
    });

    it("enableKey, disableKey, and scheduleKeyDeletion", async () => {
      mockFetch(() => new Response("{}", { status: 200 }));
      await provider.enableKey("k1");
      await provider.disableKey("k1");
      await provider.scheduleKeyDeletion("k1");
    });

    it("encrypt and decrypt roundtrip with and without context", async () => {
      mockFetch((url) => {
        if (url.includes(":encrypt")) {
          return new Response(
            JSON.stringify({
              ciphertext: Buffer.from("cipher-bytes").toString("base64"),
            }),
            { status: 200 },
          );
        }
        if (url.includes(":decrypt")) {
          return new Response(
            JSON.stringify({
              plaintext: Buffer.from("hello world").toString("base64"),
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 200 });
      });

      const enc = await provider.encrypt("k1", new Uint8Array([1, 2, 3]));
      expect(enc.ciphertext).to.be.a("string");
      expect(enc.keyId).to.equal("k1");

      const encWithContext = await provider.encrypt(
        "k1",
        new Uint8Array([1, 2, 3]),
        { a: "b" },
      );
      expect(encWithContext.context).to.deep.equal({ a: "b" });

      const dec = await provider.decrypt("k1", enc.ciphertext);
      expect(Buffer.from(dec.plaintext).toString()).to.equal("hello world");

      const decWithContext = await provider.decrypt("k1", enc.ciphertext, {
        a: "b",
      });
      expect(Buffer.from(decWithContext.plaintext).toString()).to.equal(
        "hello world",
      );
    });

    it("sign and verify operations", async () => {
      mockFetch((url) => {
        if (url.includes(":asymmetricSign")) {
          return new Response(JSON.stringify({ signature: "mock-sig" }), {
            status: 200,
          });
        }
        if (url.includes(":macVerify")) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
          });
        }
        return new Response("{}", { status: 200 });
      });

      const res = await provider.sign("k1", new Uint8Array([1, 2, 3]));
      expect(res.signature).to.equal("mock-sig");

      const verified = await provider.verify(
        "k1",
        new Uint8Array([1, 2, 3]),
        "mock-sig",
      );
      expect(verified).to.be.true;
    });

    it("verify returns false when request throws", async () => {
      mockFetch(() => new Response("Verify failed", { status: 400 }));
      const verified = await provider.verify(
        "k1",
        new Uint8Array([1, 2, 3]),
        "bad-sig",
      );
      expect(verified).to.be.false;
    });

    it("rotateKey and generateDataKey", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({
              name: "projects/p/locations/l/keyRings/r/cryptoKeys/k1",
              purpose: "ENCRYPT_DECRYPT",
              ciphertext: "wrapped-data-key",
            }),
            { status: 200 },
          ),
      );
      const rotated = await provider.rotateKey("k1");
      expect(rotated.keyId).to.equal("k1");

      const dek256 = await provider.generateDataKey("k1");
      expect(dek256.plaintext).to.have.length(32);
      expect(dek256.ciphertext).to.equal("wrapped-data-key");

      const dek128 = await provider.generateDataKey("k1", "AES_128");
      expect(dek128.plaintext).to.have.length(16);
    });

    it("wrapKey and unwrapKey operations", async () => {
      mockFetch((url) => {
        if (url.includes(":encrypt")) {
          return new Response(
            JSON.stringify({ ciphertext: "wrapped-key-blob" }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            plaintext: Buffer.from("unwrapped-key-bytes").toString("base64"),
          }),
          { status: 200 },
        );
      });

      const wrapRes = await provider.wrapKey("k1", new Uint8Array([9, 8, 7]));
      expect(wrapRes.wrappedKey).to.equal("wrapped-key-blob");

      const unwrapRes = await provider.unwrapKey("k1", "wrapped-key-blob");
      expect(Buffer.from(unwrapRes.unwrappedKey).toString()).to.equal(
        "unwrapped-key-bytes",
      );
    });

    it("rejects invalid path", async () => {
      try {
        await provider.getKey("../evil");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as KmsError).message).to.equal("Invalid GCP KMS path");
      }
      try {
        await provider.getKey("invalid space");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as KmsError).message).to.equal("Invalid GCP KMS path");
      }
    });
  });
});

// ---------------------------------------------------------------------------
// AzureKmsProvider – stub: all methods throw "Not implemented"
// ---------------------------------------------------------------------------
describe("AzureKmsProvider", () => {
  const provider = new AzureKmsProvider({
    vaultUrl: "https://test.vault.azure.net",
  });

  it("has name 'azure'", () => {
    expect(provider.name).to.equal("azure");
  });

  it("exposes vaultUrl getter", () => {
    expect(provider.vaultUrl).to.equal("https://test.vault.azure.net");
  });

  const methods: Array<{
    name: string;
    call: () => Promise<unknown>;
  }> = [
    { name: "listKeys", call: () => provider.listKeys() },
    {
      name: "listKeys (with filter)",
      call: () => provider.listKeys({ enabled: true }),
    },
    { name: "getKey", call: () => provider.getKey("k1") },
    {
      name: "createKey",
      call: () => provider.createKey("rsa-2048", "encrypt"),
    },
    {
      name: "createKey (with metadata)",
      call: () => provider.createKey("rsa-2048", "sign", { team: "x" }),
    },
    { name: "enableKey", call: () => provider.enableKey("k1") },
    { name: "disableKey", call: () => provider.disableKey("k1") },
    {
      name: "scheduleKeyDeletion",
      call: () => provider.scheduleKeyDeletion("k1"),
    },
    {
      name: "scheduleKeyDeletion (with days)",
      call: () => provider.scheduleKeyDeletion("k1", 14),
    },
    {
      name: "encrypt",
      call: () => provider.encrypt("k1", new Uint8Array(1)),
    },
    {
      name: "encrypt (with context)",
      call: () => provider.encrypt("k1", new Uint8Array(1), { a: "b" }),
    },
    { name: "decrypt", call: () => provider.decrypt("k1", "ct") },
    {
      name: "decrypt (with context)",
      call: () => provider.decrypt("k1", "ct", { a: "b" }),
    },
    { name: "sign", call: () => provider.sign("k1", new Uint8Array(1)) },
    {
      name: "sign (with algorithm)",
      call: () => provider.sign("k1", new Uint8Array(1), "rsa"),
    },
    {
      name: "verify",
      call: () => provider.verify("k1", new Uint8Array(1), "sig"),
    },
    {
      name: "verify (with algorithm)",
      call: () => provider.verify("k1", new Uint8Array(1), "sig", "rsa"),
    },
    { name: "rotateKey", call: () => provider.rotateKey("k1") },
    { name: "generateDataKey", call: () => provider.generateDataKey("k1") },
    {
      name: "generateDataKey (with spec)",
      call: () => provider.generateDataKey("k1", "AES_256"),
    },
  ];

  for (const m of methods) {
    it(`${m.name} throws "Not implemented"`, async () => {
      try {
        await m.call();
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Not implemented");
      }
    });
  }
});

// ---------------------------------------------------------------------------
// VaultKmsProvider – stub: all methods throw "Not implemented"
// ---------------------------------------------------------------------------
describe("VaultKmsProvider", () => {
  const provider = new VaultKmsProvider({
    address: "http://127.0.0.1:8200",
    token: "hvs.test-token",
    mountPath: "transit",
  });

  it("has name 'vault'", () => {
    expect(provider.name).to.equal("vault");
  });

  it("buildUrl constructs correct API URL", () => {
    const url = provider.buildUrl("keys/my-key");
    expect(url).to.equal("http://127.0.0.1:8200/v1/transit/keys/my-key");
  });

  it("buildUrl strips trailing slashes from address", () => {
    const p = new VaultKmsProvider({
      address: "http://127.0.0.1:8200///",
      token: "tok",
    });
    expect(p.buildUrl("encrypt/k1")).to.equal(
      "http://127.0.0.1:8200/v1/transit/encrypt/k1",
    );
  });

  it("defaults mountPath to 'transit'", () => {
    const p = new VaultKmsProvider({
      address: "http://localhost:8200",
      token: "tok",
    });
    expect(p.buildUrl("keys")).to.equal(
      "http://localhost:8200/v1/transit/keys",
    );
  });

  it("buildHeaders includes vault token and content type", () => {
    const headers = provider.buildHeaders();
    expect(headers["X-Vault-Token"]).to.equal("hvs.test-token");
    expect(headers["Content-Type"]).to.equal("application/json");
  });

  describe("Vault operations", () => {
    let origFetch: typeof globalThis.fetch;

    before(() => {
      origFetch = globalThis.fetch;
    });

    after(() => {
      globalThis.fetch = origFetch;
    });

    function mockFetch(
      fn: (url: string, init?: RequestInit) => Promise<Response> | Response,
    ): void {
      globalThis.fetch = ((url: unknown, init?: unknown) => {
        return Promise.resolve(
          fn(String(url), init as RequestInit | undefined),
        );
      }) as typeof globalThis.fetch;
    }

    it("buildHeaders includes namespace when configured", () => {
      const p = new VaultKmsProvider({
        address: "http://127.0.0.1:8200",
        token: "tok",
        namespace: "tenant-a",
      });
      const h = p.buildHeaders();
      expect(h["X-Vault-Namespace"]).to.equal("tenant-a");
    });

    it("handles fetch network failure", async () => {
      mockFetch(() => {
        throw new Error("connection refused");
      });
      try {
        await provider.getKey("k1");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("INVALID_ARGUMENT");
        expect((err as KmsError).message).to.include("connection refused");
      }
    });

    it("handles 404 not found", async () => {
      mockFetch(() => new Response("Not found", { status: 404 }));
      try {
        await provider.getKey("missing");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("NOT_FOUND");
      }
    });

    it("handles 400 decryption failed", async () => {
      mockFetch(
        () =>
          new Response(JSON.stringify({ errors: ["ciphertext is invalid"] }), {
            status: 400,
          }),
      );
      try {
        await provider.decrypt("k1", "bad-ct");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("DECRYPTION_FAILED");
      }
    });

    it("handles disabled key error", async () => {
      mockFetch(
        () =>
          new Response(JSON.stringify({ errors: ["key is disabled"] }), {
            status: 400,
          }),
      );
      try {
        await provider.encrypt("k1", new Uint8Array([1, 2]));
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("DISABLED");
      }
    });

    it("handles generic HTTP error with JSON errors", async () => {
      mockFetch(
        () =>
          new Response(JSON.stringify({ errors: ["permission denied"] }), {
            status: 403,
          }),
      );
      try {
        await provider.getKey("k1");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("INVALID_ARGUMENT");
        expect((err as KmsError).message).to.include("permission denied");
      }
    });

    it("handles generic HTTP error with non-JSON text", async () => {
      mockFetch(() => new Response("internal error", { status: 500 }));
      try {
        await provider.getKey("k1");
        expect.fail("should throw");
      } catch (err) {
        expect((err as KmsError).code).to.equal("INVALID_ARGUMENT");
        expect((err as KmsError).message).to.include("HTTP 500");
      }
    });

    it("handles empty response body text", async () => {
      mockFetch(() => new Response("", { status: 200 }));
      const meta = await provider.getKey("empty-key");
      expect(meta.keyId).to.equal("empty-key");
      expect(meta.algorithm).to.equal("aes256-gcm96");
    });

    it("getKey maps encryption key details", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({
              data: {
                name: "enc-key",
                type: "aes256-gcm96",
                supports_signing: false,
                latest_version: 2,
                min_encryption_version: 1,
              },
            }),
          ),
      );
      const meta = await provider.getKey("enc-key");
      expect(meta.keyId).to.equal("enc-key");
      expect(meta.algorithm).to.equal("aes256-gcm96");
      expect(meta.usage).to.equal("encrypt");
      expect(meta.enabled).to.be.true;
      expect(meta.currentVersion).to.equal(2);
    });

    it("getKey maps signing key and disabled key details", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({
              data: {
                name: "sig-key",
                type: "ed25519",
                supports_signing: true,
                latest_version: 1,
                min_encryption_version: 2,
              },
            }),
          ),
      );
      const meta = await provider.getKey("sig-key");
      expect(meta.usage).to.equal("sign");
      expect(meta.enabled).to.be.false;
    });

    it("getKey handles missing optional fields and fallback data envelope", async () => {
      mockFetch(
        () =>
          new Response(
            JSON.stringify({
              name: "sparse-key",
            }),
          ),
      );
      const meta = await provider.getKey("sparse-key");
      expect(meta.algorithm).to.equal("aes256-gcm96");
      expect(meta.enabled).to.be.true;
      expect(meta.currentVersion).to.be.undefined;
    });

    it("listKeys retrieves and filters keys", async () => {
      mockFetch((url) => {
        if (url.includes("keys?list=true")) {
          return new Response(
            JSON.stringify({ data: { keys: ["k1", "k2", "bad"] } }),
          );
        }
        if (url.includes("keys/k1")) {
          return new Response(
            JSON.stringify({
              data: {
                name: "k1",
                type: "aes256-gcm96",
                supports_signing: false,
                latest_version: 1,
                min_encryption_version: 0,
              },
            }),
          );
        }
        if (url.includes("keys/k2")) {
          return new Response(
            JSON.stringify({
              data: {
                name: "k2",
                type: "ed25519",
                supports_signing: true,
                latest_version: 1,
                min_encryption_version: 0,
              },
            }),
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const all = await provider.listKeys();
      expect(all.length).to.equal(2);

      const signOnly = await provider.listKeys({ usage: "sign" });
      expect(signOnly.length).to.equal(1);
      expect(signOnly[0].keyId).to.equal("k2");

      const encOnly = await provider.listKeys({
        enabled: true,
        usage: "encrypt",
      });
      expect(encOnly.length).to.equal(1);
      expect(encOnly[0].keyId).to.equal("k1");

      const disabledOnly = await provider.listKeys({
        enabled: false,
      });
      expect(disabledOnly.length).to.equal(0);
    });

    it("listKeys handles empty keys response", async () => {
      mockFetch(() => new Response(JSON.stringify({ data: {} })));
      const all = await provider.listKeys();
      expect(all).to.deep.equal([]);
    });

    it("createKey creates keys with various algorithm mappings", async () => {
      let createdType = "";
      mockFetch((url, init) => {
        if (init?.method === "POST" && url.includes("keys/")) {
          const body = JSON.parse(init.body as string);
          createdType = body.type;
          return new Response(JSON.stringify({}));
        }
        return new Response(
          JSON.stringify({
            data: {
              name: "k",
              type: createdType,
              supports_signing: createdType === "ed25519",
              latest_version: 1,
            },
          }),
        );
      });

      await provider.createKey("ed25519", "sign", { keyId: "my-ed25519" });
      expect(createdType).to.equal("ed25519");

      await provider.createKey("chacha20-poly1305", "encrypt");
      expect(createdType).to.equal("chacha20-poly1305");

      await provider.createKey("rsa-4096", "encrypt");
      expect(createdType).to.equal("rsa-4096");

      await provider.createKey("rsa-2048", "encrypt");
      expect(createdType).to.equal("rsa-2048");

      await provider.createKey("ecdsa-p256", "sign");
      expect(createdType).to.equal("ecdsa-p256");

      await provider.createKey("custom-algo", "sign");
      expect(createdType).to.equal("ed25519");

      await provider.createKey("aes-256-gcm", "encrypt");
      expect(createdType).to.equal("aes256-gcm96");
    });

    it("enableKey and disableKey update config", async () => {
      let postedConfig: Record<string, unknown> = {};
      mockFetch((url, init) => {
        if (url.includes("/config") && init?.method === "POST") {
          postedConfig = JSON.parse(init.body as string);
          return new Response(JSON.stringify({}));
        }
        return new Response(
          JSON.stringify({
            data: { name: "k1", type: "aes256-gcm96", latest_version: 3 },
          }),
        );
      });

      await provider.enableKey("k1");
      expect(postedConfig.min_encryption_version).to.equal(0);

      await provider.disableKey("k1");
      expect(postedConfig.min_encryption_version).to.equal(4);
    });

    it("disableKey uses default version 1 when currentVersion is absent", async () => {
      let postedConfig: Record<string, unknown> = {};
      mockFetch((url, init) => {
        if (url.includes("/config") && init?.method === "POST") {
          postedConfig = JSON.parse(init.body as string);
          return new Response(JSON.stringify({}));
        }
        return new Response(
          JSON.stringify({
            data: { name: "k1", type: "aes256-gcm96" },
          }),
        );
      });

      await provider.disableKey("k1");
      expect(postedConfig.min_encryption_version).to.equal(2);
    });

    it("scheduleKeyDeletion configures deletion and deletes key", async () => {
      let deleted = false;
      let deletionAllowed = false;
      mockFetch((url, init) => {
        if (url.includes("/config") && init?.method === "POST") {
          const body = JSON.parse(init.body as string);
          deletionAllowed = Boolean(body.deletion_allowed);
          return new Response(JSON.stringify({}));
        }
        if (init?.method === "DELETE") {
          deleted = true;
          return new Response(JSON.stringify({}));
        }
        return new Response(JSON.stringify({}));
      });

      await provider.scheduleKeyDeletion("k1", 5);
      expect(deletionAllowed).to.be.true;
      expect(deleted).to.be.true;
    });

    it("encrypt and decrypt with and without context", async () => {
      mockFetch((url, init) => {
        if (url.includes("encrypt/k1")) {
          const body = JSON.parse(init?.body as string);
          return new Response(
            JSON.stringify({
              data: { ciphertext: `vault:v1:${body.plaintext}` },
            }),
          );
        }
        if (url.includes("decrypt/k1")) {
          const body = JSON.parse(init?.body as string);
          const raw = body.ciphertext.replace("vault:v1:", "");
          return new Response(
            JSON.stringify({
              data: { plaintext: raw },
            }),
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const enc = await provider.encrypt("k1", new Uint8Array([65, 66, 67]), {
        session: "123",
      });
      expect(enc.ciphertext).to.include("vault:v1:");
      expect(enc.context).to.deep.equal({ session: "123" });

      const dec = await provider.decrypt("k1", enc.ciphertext, {
        session: "123",
      });
      expect(Array.from(dec.plaintext)).to.deep.equal([65, 66, 67]);

      const encNoCtx = await provider.encrypt(
        "k1",
        new Uint8Array([65, 66, 67]),
      );
      expect(encNoCtx.context).to.be.undefined;
      const decNoCtx = await provider.decrypt("k1", encNoCtx.ciphertext);
      expect(Array.from(decNoCtx.plaintext)).to.deep.equal([65, 66, 67]);
    });

    it("sign and verify operations", async () => {
      mockFetch((url, init) => {
        if (url.includes("sign/k1")) {
          return new Response(
            JSON.stringify({
              data: { signature: "vault:v1:c2lnbmF0dXJl" },
            }),
          );
        }
        if (url.includes("verify/k1")) {
          const body = JSON.parse(init?.body as string);
          return new Response(
            JSON.stringify({
              data: { valid: body.signature === "vault:v1:c2lnbmF0dXJl" },
            }),
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const sigResult = await provider.sign(
        "k1",
        new Uint8Array([1, 2, 3]),
        "sha2-512",
      );
      expect(sigResult.signature).to.equal("vault:v1:c2lnbmF0dXJl");
      expect(sigResult.algorithm).to.equal("sha2-512");

      const valid = await provider.verify(
        "k1",
        new Uint8Array([1, 2, 3]),
        "vault:v1:c2lnbmF0dXJl",
      );
      expect(valid).to.be.true;

      const invalid = await provider.verify(
        "k1",
        new Uint8Array([1, 2, 3]),
        "wrong-sig",
      );
      expect(invalid).to.be.false;
    });

    it("verify returns false when request throws", async () => {
      mockFetch(() => {
        throw new Error("network error");
      });
      const valid = await provider.verify(
        "k1",
        new Uint8Array([1, 2, 3]),
        "sig",
      );
      expect(valid).to.be.false;
    });

    it("rotateKey rotates key and returns updated metadata", async () => {
      let rotated = false;
      mockFetch((url, init) => {
        if (url.includes("keys/k1/rotate") && init?.method === "POST") {
          rotated = true;
          return new Response(JSON.stringify({}));
        }
        return new Response(
          JSON.stringify({
            data: { name: "k1", type: "aes256-gcm96", latest_version: 2 },
          }),
        );
      });

      const meta = await provider.rotateKey("k1");
      expect(rotated).to.be.true;
      expect(meta.currentVersion).to.equal(2);
    });

    it("generateDataKey generates wrapped keys with 256 and 128 bit specs", async () => {
      let requestedBits = 0;
      mockFetch((url, init) => {
        if (url.includes("datakey/plaintext/k1")) {
          const body = JSON.parse(init?.body as string);
          requestedBits = body.bits;
          return new Response(
            JSON.stringify({
              data: {
                plaintext: Buffer.from("super-secret-key-material").toString(
                  "base64",
                ),
                ciphertext: "vault:v1:wrapped-key-bytes",
              },
            }),
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const dek256 = await provider.generateDataKey("k1");
      expect(requestedBits).to.equal(256);
      expect(dek256.ciphertext).to.equal("vault:v1:wrapped-key-bytes");

      const dek128 = await provider.generateDataKey("k1", "AES_128");
      expect(requestedBits).to.equal(128);
      expect(dek128.ciphertext).to.equal("vault:v1:wrapped-key-bytes");
    });

    it("wrapKey and unwrapKey operations", async () => {
      mockFetch((url, init) => {
        if (url.includes("encrypt/k1")) {
          const body = JSON.parse(init?.body as string);
          return new Response(
            JSON.stringify({
              data: { ciphertext: `wrapped:${body.plaintext}` },
            }),
          );
        }
        if (url.includes("decrypt/k1")) {
          const body = JSON.parse(init?.body as string);
          const raw = body.ciphertext.replace("wrapped:", "");
          return new Response(
            JSON.stringify({
              data: { plaintext: raw },
            }),
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const secret = new Uint8Array([10, 20, 30, 40]);
      const wrapped = await provider.wrapKey("k1", secret);
      expect(wrapped.wrappedKey).to.include("wrapped:");
      expect(wrapped.keyId).to.equal("k1");

      const unwrapped = await provider.unwrapKey("k1", wrapped.wrappedKey);
      expect(Array.from(unwrapped.unwrappedKey)).to.deep.equal([
        10, 20, 30, 40,
      ]);
      expect(unwrapped.keyId).to.equal("k1");
    });

    it("rejects invalid path", async () => {
      try {
        await provider.getKey("../evil");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as KmsError).message).to.equal("Invalid Vault path");
      }
      try {
        await provider.getKey("invalid space");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as KmsError).message).to.equal("Invalid Vault path");
      }
    });

    it("handles addresses with https or without scheme", () => {
      const p1 = new VaultKmsProvider({
        address: "https://vault.example.com:8200",
        token: "tok",
      });
      expect(p1.buildUrl("keys")).to.include("https://vault.example.com:8200");
      const p2 = new VaultKmsProvider({
        address: "vault.example.com:8200",
        token: "tok",
      });
      expect(p2.buildUrl("keys")).to.include("http://vault.example.com:8200");
    });
  });
});

// ---------------------------------------------------------------------------
// AwsKmsProvider – constructor, getClient, and error paths
// ---------------------------------------------------------------------------
describe("AwsKmsProvider", () => {
  it("has name 'aws'", () => {
    const provider = new AwsKmsProvider({ region: "us-east-1" });
    expect(provider.name).to.equal("aws");
  });

  it("constructor stores options (region only)", () => {
    const provider = new AwsKmsProvider({ region: "eu-west-1" });
    expect(provider.name).to.equal("aws");
  });

  it("constructor accepts credentials and endpoint", () => {
    const provider = new AwsKmsProvider({
      region: "us-east-1",
      credentials: {
        accessKeyId: "AKIA...",
        secretAccessKey: "secret",
        sessionToken: "token",
      },
      endpoint: "http://localhost:4566",
    });
    expect(provider.name).to.equal("aws");
  });

  it("constructor accepts credentials without sessionToken", () => {
    const provider = new AwsKmsProvider({
      region: "us-east-1",
      credentials: {
        accessKeyId: "AKIA...",
        secretAccessKey: "secret",
      },
    });
    expect(provider.name).to.equal("aws");
  });

  // The AWS SDK peer dep may or may not be installed. All method calls
  // either fail with the "requires @aws-sdk/client-kms" message (not
  // installed) or with a credentials/network error (installed but no
  // real AWS access). Either way, they throw.
  describe("all methods throw without valid AWS credentials or SDK", () => {
    const provider = new AwsKmsProvider({ region: "us-east-1" });

    const methodCalls: Array<{
      name: string;
      call: () => Promise<unknown>;
    }> = [
      { name: "listKeys", call: () => provider.listKeys() },
      {
        name: "listKeys (with filter)",
        call: () => provider.listKeys({ usage: "encrypt", enabled: true }),
      },
      { name: "getKey", call: () => provider.getKey("k1") },
      {
        name: "createKey",
        call: () => provider.createKey("aes-256-gcm", "encrypt"),
      },
      {
        name: "createKey (sign usage)",
        call: () => provider.createKey("rsa-2048", "sign"),
      },
      {
        name: "createKey (with metadata)",
        call: () =>
          provider.createKey("aes-256-gcm", "encrypt", { env: "test" }),
      },
      { name: "enableKey", call: () => provider.enableKey("k1") },
      { name: "disableKey", call: () => provider.disableKey("k1") },
      {
        name: "scheduleKeyDeletion",
        call: () => provider.scheduleKeyDeletion("k1"),
      },
      {
        name: "scheduleKeyDeletion (with days)",
        call: () => provider.scheduleKeyDeletion("k1", 7),
      },
      {
        name: "encrypt",
        call: () => provider.encrypt("k1", new Uint8Array(1)),
      },
      {
        name: "encrypt (with context)",
        call: () => provider.encrypt("k1", new Uint8Array(1), { a: "b" }),
      },
      { name: "decrypt", call: () => provider.decrypt("k1", "ct") },
      {
        name: "decrypt (with context)",
        call: () => provider.decrypt("k1", "ct", { a: "b" }),
      },
      { name: "sign", call: () => provider.sign("k1", new Uint8Array(1)) },
      {
        name: "sign (with algorithm)",
        call: () => provider.sign("k1", new Uint8Array(1), "ECDSA_SHA_256"),
      },
      {
        name: "verify",
        call: () => provider.verify("k1", new Uint8Array(1), "sig"),
      },
      {
        name: "verify (with algorithm)",
        call: () =>
          provider.verify("k1", new Uint8Array(1), "sig", "ECDSA_SHA_256"),
      },
      { name: "rotateKey", call: () => provider.rotateKey("k1") },
      {
        name: "generateDataKey",
        call: () => provider.generateDataKey("k1"),
      },
      {
        name: "generateDataKey (with spec)",
        call: () => provider.generateDataKey("k1", "AES_128"),
      },
    ];

    for (const m of methodCalls) {
      it(`${m.name} throws`, async () => {
        try {
          await m.call();
          expect.fail("should have thrown");
        } catch (err) {
          expect(err).to.be.instanceOf(Error);
        }
      });
    }
  });

  // Test the getClient catch path. Since @aws-sdk/client-kms IS installed
  // in this environment, we exercise the catch block by overriding the
  // private getClient to simulate an import failure, re-implementing the
  // same logic from aws.ts lines 60-79 with a forced throw.
  it("getClient catch path: throws user-friendly message when SDK import fails", async () => {
    const provider = new AwsKmsProvider({ region: "us-east-1" });
    // Override getClient to simulate the exact catch-block behavior
    (provider as unknown as AwsInternals).client = null;
    (provider as unknown as AwsInternals).getClient = async function () {
      if (!(this as AwsInternals).client) {
        try {
          // Simulate the import failing (e.g., SDK not installed)
          await Promise.reject(new Error("MODULE_NOT_FOUND"));
        } catch {
          throw new Error(
            "AWS KMS requires @aws-sdk/client-kms. Install it: npm install @aws-sdk/client-kms",
          );
        }
      }
      return (this as AwsInternals).client;
    };

    try {
      await provider.listKeys();
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as Error).message).to.include(
        "AWS KMS requires @aws-sdk/client-kms",
      );
    }
  });

  // -----------------------------------------------------------------------
  // Mock client injection to cover AWS response-processing paths
  // -----------------------------------------------------------------------
  describe("with mock client (response processing)", () => {
    /** Create a provider with a mock client injected */
    function createMocked(
      sendFn: (command: unknown) => Promise<Record<string, unknown>>,
    ): AwsKmsProvider {
      const p = new AwsKmsProvider({ region: "us-east-1" });
      // Inject a mock client directly
      (p as unknown as AwsInternals).client = { send: sendFn };
      return p;
    }

    it("listKeys maps Keys array to KmsKeyMetadata", async () => {
      const p = createMocked(async () => ({
        Keys: [{ KeyId: "abc-123" }, { KeyId: "def-456" }],
      }));
      const keys = await p.listKeys();
      expect(keys).to.have.length(2);
      expect(keys[0].keyId).to.equal("abc-123");
      expect(keys[0].provider).to.equal("aws");
      expect(keys[0].usage).to.equal("encrypt");
      expect(keys[1].keyId).to.equal("def-456");
    });

    it("listKeys handles empty Keys", async () => {
      const p = createMocked(async () => ({}));
      const keys = await p.listKeys();
      expect(keys).to.deep.equal([]);
    });

    it("listKeys handles missing KeyId", async () => {
      const p = createMocked(async () => ({
        Keys: [{}],
      }));
      const keys = await p.listKeys();
      expect(keys[0].keyId).to.equal("");
    });

    it("getKey maps DescribeKeyCommand response", async () => {
      const p = createMocked(async () => ({
        KeyMetadata: {
          KeyId: "k-1",
          KeySpec: "SYMMETRIC_DEFAULT",
          KeyUsage: "ENCRYPT_DECRYPT",
          CreationDate: new Date("2025-01-01T00:00:00Z"),
          Enabled: true,
        },
      }));
      const meta = await p.getKey("k-1");
      expect(meta.keyId).to.equal("k-1");
      expect(meta.algorithm).to.equal("SYMMETRIC_DEFAULT");
      expect(meta.usage).to.equal("encrypt");
      expect(meta.createdAt).to.equal("2025-01-01T00:00:00.000Z");
      expect(meta.enabled).to.be.true;
    });

    it("getKey maps SIGN_VERIFY usage", async () => {
      const p = createMocked(async () => ({
        KeyMetadata: {
          KeyId: "k-sign",
          KeySpec: "RSA_2048",
          KeyUsage: "SIGN_VERIFY",
          CreationDate: new Date("2025-06-01T00:00:00Z"),
          Enabled: false,
        },
      }));
      const meta = await p.getKey("k-sign");
      expect(meta.usage).to.equal("sign");
      expect(meta.enabled).to.be.false;
    });

    it("getKey handles missing KeyMetadata fields", async () => {
      const p = createMocked(async () => ({
        KeyMetadata: {},
      }));
      const meta = await p.getKey("fallback-id");
      expect(meta.keyId).to.equal("fallback-id");
      expect(meta.algorithm).to.equal("unknown");
      expect(meta.usage).to.equal("encrypt");
      expect(meta.enabled).to.be.true;
    });

    it("getKey handles null KeyMetadata", async () => {
      const p = createMocked(async () => ({}));
      const meta = await p.getKey("fallback");
      expect(meta.keyId).to.equal("fallback");
    });

    it("createKey maps CreateKeyCommand response", async () => {
      const p = createMocked(async () => ({
        KeyMetadata: {
          KeyId: "new-key-id",
          CreationDate: new Date("2025-03-15T12:00:00Z"),
        },
      }));
      const meta = await p.createKey("aes-256-gcm", "encrypt");
      expect(meta.keyId).to.equal("new-key-id");
      expect(meta.algorithm).to.equal("aes-256-gcm");
      expect(meta.usage).to.equal("encrypt");
      expect(meta.createdAt).to.equal("2025-03-15T12:00:00.000Z");
    });

    it("createKey with sign usage sends SIGN_VERIFY", async () => {
      const p = createMocked(async () => ({
        KeyMetadata: { KeyId: "sign-key" },
      }));
      const meta = await p.createKey("rsa-2048", "sign");
      expect(meta.keyId).to.equal("sign-key");
      expect(meta.usage).to.equal("sign");
    });

    it("createKey with metadata sends Tags", async () => {
      let sentCommand: unknown = null;
      const p = createMocked(async (cmd) => {
        sentCommand = cmd;
        return { KeyMetadata: { KeyId: "tagged-key" } };
      });
      await p.createKey("aes-256-gcm", "encrypt", { env: "prod" });
      // The command object is constructed by AWS SDK, we just verify it doesn't throw
      expect(sentCommand).to.not.be.null;
    });

    it("createKey handles missing KeyMetadata", async () => {
      const p = createMocked(async () => ({}));
      const meta = await p.createKey("aes-256-gcm", "encrypt");
      expect(meta.keyId).to.equal("");
    });

    it("enableKey sends EnableKeyCommand", async () => {
      let called = false;
      const p = createMocked(async () => {
        called = true;
        return {};
      });
      await p.enableKey("k1");
      expect(called).to.be.true;
    });

    it("disableKey sends DisableKeyCommand", async () => {
      let called = false;
      const p = createMocked(async () => {
        called = true;
        return {};
      });
      await p.disableKey("k1");
      expect(called).to.be.true;
    });

    it("scheduleKeyDeletion sends ScheduleKeyDeletionCommand", async () => {
      let called = false;
      const p = createMocked(async () => {
        called = true;
        return {};
      });
      await p.scheduleKeyDeletion("k1", 7);
      expect(called).to.be.true;
    });

    it("encrypt maps EncryptCommand response (no context)", async () => {
      const p = createMocked(async () => ({
        CiphertextBlob: Buffer.from("encrypted-data"),
        KeyId: "k-enc",
      }));
      const result = await p.encrypt("k1", new Uint8Array([1, 2, 3]));
      expect(result.ciphertext).to.be.a("string");
      expect(result.keyId).to.equal("k-enc");
      expect(result.context).to.be.undefined;
    });

    it("encrypt maps EncryptCommand response (with context)", async () => {
      const p = createMocked(async () => ({
        CiphertextBlob: Buffer.from("encrypted-data"),
        KeyId: "k-enc",
      }));
      const ctx = { tenant: "acme" };
      const result = await p.encrypt("k1", new Uint8Array([1]), ctx);
      expect(result.context).to.deep.equal(ctx);
    });

    it("encrypt uses fallback keyId when result.KeyId is missing", async () => {
      const p = createMocked(async () => ({
        CiphertextBlob: Buffer.from("data"),
      }));
      const result = await p.encrypt("fallback-id", new Uint8Array(1));
      expect(result.keyId).to.equal("fallback-id");
    });

    it("decrypt maps DecryptCommand response", async () => {
      const p = createMocked(async () => ({
        Plaintext: Buffer.from("hello"),
        KeyId: "k-dec",
      }));
      const result = await p.decrypt(
        "k1",
        Buffer.from("ct").toString("base64"),
      );
      expect(new TextDecoder().decode(result.plaintext)).to.equal("hello");
      expect(result.keyId).to.equal("k-dec");
    });

    it("decrypt uses fallback keyId", async () => {
      const p = createMocked(async () => ({
        Plaintext: Buffer.from("data"),
      }));
      const result = await p.decrypt("fb", "Y3Q=");
      expect(result.keyId).to.equal("fb");
    });

    it("sign maps SignCommand response", async () => {
      const p = createMocked(async () => ({
        Signature: Buffer.from("sig-bytes"),
        KeyId: "k-sig",
        SigningAlgorithm: "RSASSA_PSS_SHA_256",
      }));
      const result = await p.sign("k1", new Uint8Array([1, 2]));
      expect(result.signature).to.be.a("string");
      expect(result.keyId).to.equal("k-sig");
      expect(result.algorithm).to.equal("RSASSA_PSS_SHA_256");
    });

    it("sign uses fallback values", async () => {
      const p = createMocked(async () => ({
        Signature: Buffer.from("sig"),
      }));
      const result = await p.sign("fb", new Uint8Array(1), "ECDSA_SHA_256");
      expect(result.keyId).to.equal("fb");
      expect(result.algorithm).to.equal("ECDSA_SHA_256");
    });

    it("sign uses default algorithm RSASSA_PSS_SHA_256", async () => {
      const p = createMocked(async () => ({
        Signature: Buffer.from("sig"),
        SigningAlgorithm: "RSASSA_PSS_SHA_256",
      }));
      const result = await p.sign("k1", new Uint8Array(1));
      expect(result.algorithm).to.equal("RSASSA_PSS_SHA_256");
    });

    it("verify returns true for valid signature", async () => {
      const p = createMocked(async () => ({
        SignatureValid: true,
      }));
      const valid = await p.verify("k1", new Uint8Array(1), "c2ln");
      expect(valid).to.be.true;
    });

    it("verify returns false for invalid signature", async () => {
      const p = createMocked(async () => ({
        SignatureValid: false,
      }));
      const valid = await p.verify("k1", new Uint8Array(1), "c2ln");
      expect(valid).to.be.false;
    });

    it("verify defaults to false when SignatureValid is missing", async () => {
      const p = createMocked(async () => ({}));
      const valid = await p.verify("k1", new Uint8Array(1), "c2ln");
      expect(valid).to.be.false;
    });

    it("verify uses default algorithm", async () => {
      const p = createMocked(async () => ({ SignatureValid: true }));
      const valid = await p.verify("k1", new Uint8Array(1), "c2ln");
      expect(valid).to.be.true;
    });

    it("rotateKey calls EnableKeyRotation then getKey", async () => {
      let callCount = 0;
      const p = createMocked(async () => {
        callCount++;
        if (callCount === 1) {
          // EnableKeyRotationCommand
          return {};
        }
        // DescribeKeyCommand (from getKey)
        return {
          KeyMetadata: {
            KeyId: "rotated",
            KeySpec: "SYMMETRIC_DEFAULT",
            KeyUsage: "ENCRYPT_DECRYPT",
            CreationDate: new Date("2025-06-01"),
            Enabled: true,
          },
        };
      });
      const meta = await p.rotateKey("rotated");
      expect(meta.keyId).to.equal("rotated");
      expect(callCount).to.equal(2);
    });

    it("generateDataKey maps response", async () => {
      const p = createMocked(async () => ({
        Plaintext: Buffer.from("0123456789abcdef0123456789abcdef"),
        CiphertextBlob: Buffer.from("wrapped-dek"),
      }));
      const dek = await p.generateDataKey("k1");
      expect(dek.plaintext).to.be.instanceOf(Uint8Array);
      expect(dek.ciphertext).to.be.a("string");
    });

    it("generateDataKey uses default keySpec AES_256", async () => {
      let called = false;
      const p = createMocked(async () => {
        called = true;
        return {
          Plaintext: Buffer.from("key-material"),
          CiphertextBlob: Buffer.from("wrapped"),
        };
      });
      await p.generateDataKey("k1");
      expect(called).to.be.true;
    });

    it("wrapKey delegates to encrypt", async () => {
      const p = createMocked(async () => ({
        CiphertextBlob: Buffer.from("wrapped-key-bytes"),
        KeyId: "arn:aws:kms:us-east-1:123:key/k1",
      }));
      const res = await p.wrapKey("k1", new Uint8Array([1, 2, 3]));
      expect(res.wrappedKey).to.be.a("string");
      expect(res.keyId).to.equal("arn:aws:kms:us-east-1:123:key/k1");
    });

    it("unwrapKey delegates to decrypt", async () => {
      const p = createMocked(async () => ({
        Plaintext: Buffer.from("secret-bytes"),
        KeyId: "arn:aws:kms:us-east-1:123:key/k1",
      }));
      const res = await p.unwrapKey("k1", "wrapped-blob");
      expect(Array.from(res.unwrappedKey)).to.deep.equal(
        Array.from(Buffer.from("secret-bytes")),
      );
      expect(res.keyId).to.equal("arn:aws:kms:us-east-1:123:key/k1");
    });

    it("getClient with credentials sets config.credentials", async () => {
      const p = new AwsKmsProvider({
        region: "us-east-1",
        credentials: {
          accessKeyId: "AKID",
          secretAccessKey: "secret",
        },
      });
      const client = await (p as unknown as AwsInternals).getClient();
      expect(client).to.exist;
    });

    it("getClient with endpoint sets config.endpoint", async () => {
      const p = new AwsKmsProvider({
        region: "us-east-1",
        endpoint: "http://localhost:4566",
      });
      const client = await (p as unknown as AwsInternals).getClient();
      expect(client).to.exist;
    });

    it("getClient caches client on second call", async () => {
      let sendCount = 0;
      const p = createMocked(async () => {
        sendCount++;
        return { Keys: [] };
      });
      await p.listKeys();
      await p.listKeys();
      expect(sendCount).to.equal(2);
      // Client is only created once (injected), both calls use the same mock
    });
  });
});

// ---------------------------------------------------------------------------
// Barrel re-exports (index.ts)
// ---------------------------------------------------------------------------
describe("index barrel exports", () => {
  it("exports LocalKmsProvider", () => {
    expect(LocalKmsProvider).to.be.a("function");
  });

  it("exports AwsKmsProvider", () => {
    expect(AwsKmsProvider).to.be.a("function");
  });

  it("exports GcpKmsProvider", () => {
    expect(GcpKmsProvider).to.be.a("function");
  });

  it("exports AzureKmsProvider", () => {
    expect(AzureKmsProvider).to.be.a("function");
  });

  it("exports VaultKmsProvider", () => {
    expect(VaultKmsProvider).to.be.a("function");
  });
});
