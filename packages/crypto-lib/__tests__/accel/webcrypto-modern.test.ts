import { expect } from "chai";
import * as nodeCrypto from "node:crypto";
import {
  detectModernWebCrypto,
  _resetModernWebCryptoDetection,
  modernChaCha20Encrypt,
  modernChaCha20Decrypt,
  modernSha3Hash,
} from "../../src/accel/webcrypto-modern";

/**
 * Helper: create a minimal mock of SubtleCrypto that passes `getSubtle()`
 * checks (requires `encrypt` to be a function). Additional methods can be
 * overridden via the `overrides` parameter.
 */
function createMockSubtle(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const realSubtle = nodeCrypto.webcrypto.subtle;
  return {
    // Bind all prototype methods so getSubtle() sees them
    encrypt: realSubtle.encrypt.bind(realSubtle),
    decrypt: realSubtle.decrypt.bind(realSubtle),
    importKey: realSubtle.importKey.bind(realSubtle),
    digest: realSubtle.digest.bind(realSubtle),
    ...overrides,
  };
}

describe("WebCrypto Modern Algorithms", () => {
  afterEach(() => {
    _resetModernWebCryptoDetection();
  });

  // --- Detection ---

  describe("detectModernWebCrypto()", () => {
    it("should return an object with all boolean fields", () => {
      const support = detectModernWebCrypto();
      expect(support).to.have.property("chacha20poly1305");
      expect(support).to.have.property("sha3");
      expect(support).to.have.property("mlKem");
      expect(support).to.have.property("argon2");
      expect(support).to.have.property("kmac");
      expect(support.chacha20poly1305).to.be.a("boolean");
      expect(support.sha3).to.be.a("boolean");
      expect(support.mlKem).to.be.a("boolean");
      expect(support.argon2).to.be.a("boolean");
      expect(support.kmac).to.be.a("boolean");
    });

    it("should return all false on current runtimes (no modern support yet)", () => {
      const support = detectModernWebCrypto();
      expect(support.chacha20poly1305).to.be.false;
      expect(support.sha3).to.be.false;
      expect(support.mlKem).to.be.false;
      expect(support.argon2).to.be.false;
      expect(support.kmac).to.be.false;
    });

    it("should cache the result on subsequent calls", () => {
      const first = detectModernWebCrypto();
      const second = detectModernWebCrypto();
      expect(first).to.equal(second); // same object reference
    });

    it("should reset cache with _resetModernWebCryptoDetection()", () => {
      const first = detectModernWebCrypto();
      _resetModernWebCryptoDetection();
      const second = detectModernWebCrypto();
      expect(first).to.not.equal(second); // different object references
      expect(first).to.deep.equal(second); // same values
    });
  });

  // --- ChaCha20-Poly1305 (noble fallback) ---

  describe("modernChaCha20Encrypt / modernChaCha20Decrypt", () => {
    const keyHex =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    it("should encrypt and decrypt round-trip", async () => {
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "hello world",
      });
      expect(encrypted.ciphertext).to.be.a("string");
      expect(encrypted.accelerated).to.be.a("boolean");

      const decrypted = await modernChaCha20Decrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "hello world",
      );
      expect(decrypted.accelerated).to.be.a("boolean");
    });

    it("should encrypt and decrypt with AAD", async () => {
      const aad = Buffer.from("authenticated-context");
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "secret data",
        aad,
      });
      expect(encrypted.ciphertext).to.be.a("string");

      const decrypted = await modernChaCha20Decrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
        aad,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "secret data",
      );
    });

    it("should accept Uint8Array key and plaintext", async () => {
      const key = Buffer.from(keyHex, "hex");
      const plaintext = Buffer.from("binary data", "utf8");
      const encrypted = await modernChaCha20Encrypt({ key, plaintext });
      const decrypted = await modernChaCha20Decrypt({
        key,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "binary data",
      );
    });

    it("should produce different ciphertexts for same plaintext (random nonce)", async () => {
      const a = await modernChaCha20Encrypt({ key: keyHex, plaintext: "same" });
      const b = await modernChaCha20Encrypt({ key: keyHex, plaintext: "same" });
      expect(a.ciphertext).to.not.equal(b.ciphertext);
    });

    it("should throw for wrong key length", async () => {
      try {
        await modernChaCha20Encrypt({ key: "abcd", plaintext: "test" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key must be 32 bytes");
      }
    });

    it("should throw for wrong key length on decrypt", async () => {
      try {
        await modernChaCha20Decrypt({
          key: "abcd",
          ciphertext: Buffer.alloc(100).toString("base64"),
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Key must be 32 bytes");
      }
    });

    it("should throw for short ciphertext", async () => {
      try {
        await modernChaCha20Decrypt({
          key: keyHex,
          ciphertext: Buffer.alloc(10).toString("base64"),
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Ciphertext too short");
      }
    });

    it("should throw for tampered ciphertext", async () => {
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "authentic",
      });
      // Tamper with the ciphertext
      const buf = Buffer.from(encrypted.ciphertext, "base64");
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString("base64");

      try {
        await modernChaCha20Decrypt({
          key: keyHex,
          ciphertext: tampered,
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it("should throw for invalid hex key", async () => {
      try {
        await modernChaCha20Encrypt({
          key: "zz".repeat(32),
          plaintext: "test",
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.match(
          /[Ii]nvalid.*hex|hex string expected/,
        );
      }
    });

    it("should fail decryption with wrong key", async () => {
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "test",
      });
      const wrongKey = "f".repeat(64);
      try {
        await modernChaCha20Decrypt({
          key: wrongKey,
          ciphertext: encrypted.ciphertext,
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.exist;
      }
    });

    it("should fail decryption with wrong AAD", async () => {
      const aad = Buffer.from("correct aad", "utf8");
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "test",
        aad,
      });
      try {
        await modernChaCha20Decrypt({
          key: keyHex,
          ciphertext: encrypted.ciphertext,
          aad: Buffer.from("wrong aad", "utf8"),
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.exist;
      }
    });
  });

  // --- SHA-3 (noble fallback) ---

  describe("modernSha3Hash", () => {
    it("should hash with SHA3-256", async () => {
      const result = await modernSha3Hash({
        algorithm: "SHA3-256",
        data: "hello world",
      });
      expect(result.digest).to.be.a("string");
      expect(result.digest).to.have.length(64); // 32 bytes = 64 hex
      expect(result.accelerated).to.be.a("boolean");
    });

    it("should hash with SHA3-512", async () => {
      const result = await modernSha3Hash({
        algorithm: "SHA3-512",
        data: "hello world",
      });
      expect(result.digest).to.be.a("string");
      expect(result.digest).to.have.length(128); // 64 bytes = 128 hex
      expect(result.accelerated).to.be.a("boolean");
    });

    it("should accept Uint8Array input", async () => {
      const data = new Uint8Array([104, 101, 108, 108, 111]);
      const result = await modernSha3Hash({ algorithm: "SHA3-256", data });
      expect(result.digest).to.be.a("string");
      expect(result.digest).to.have.length(64);
    });

    it("should produce deterministic hash output", async () => {
      const r1 = await modernSha3Hash({
        algorithm: "SHA3-256",
        data: "deterministic",
      });
      const r2 = await modernSha3Hash({
        algorithm: "SHA3-256",
        data: "deterministic",
      });
      expect(r1.digest).to.equal(r2.digest);
    });

    it("should produce correct known SHA3-256 digest", async () => {
      // SHA3-256("") = a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a
      const result = await modernSha3Hash({
        algorithm: "SHA3-256",
        data: "",
      });
      expect(result.digest).to.equal(
        "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
      );
    });

    it("should produce correct known SHA3-512 digest", async () => {
      // SHA3-512("") known digest
      const result = await modernSha3Hash({
        algorithm: "SHA3-512",
        data: "",
      });
      expect(result.digest).to.equal(
        "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a6" +
          "15b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26",
      );
    });

    it("should throw for unsupported SHA-3 algorithm", async () => {
      try {
        await modernSha3Hash({
          algorithm: "SHA3-384" as never,
          data: "hello",
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include(
          "Unsupported SHA-3 algorithm",
        );
      }
    });
  });

  // --- Mock WebCrypto to test accelerated path ---

  describe("accelerated paths (mocked WebCrypto)", function () {
    this.timeout(10000);

    const proto = Object.getPrototypeOf(nodeCrypto.webcrypto);
    const origDesc = Object.getOwnPropertyDescriptor(proto, "subtle")!;

    function setMockSubtle(mock: Record<string, unknown>): void {
      Object.defineProperty(proto, "subtle", {
        get: () => mock,
        configurable: true,
      });
    }

    afterEach(() => {
      Object.defineProperty(proto, "subtle", origDesc);
      _resetModernWebCryptoDetection();
    });

    it("should use WebCrypto for ChaCha20 when supports() returns true", async () => {
      let importKeyCalled = false;

      const mockSubtle = createMockSubtle({
        supports(operation: string, algorithm: string): boolean {
          if (operation === "encrypt" && algorithm === "ChaCha20-Poly1305")
            return true;
          if (operation === "digest" && algorithm === "SHA3-256") return true;
          if (operation === "deriveBits" && algorithm === "ML-KEM-768")
            return true;
          if (operation === "deriveBits" && algorithm === "Argon2id")
            return true;
          if (operation === "sign" && algorithm === "KMAC256") return true;
          return false;
        },
        async importKey(
          _format: string,
          keyData: BufferSource,
          algorithm: Record<string, unknown>,
          extractable: boolean,
          usages: string[],
        ) {
          importKeyCalled = true;
          return {
            type: "secret",
            algorithm,
            extractable,
            usages,
            _raw: keyData,
          };
        },
        async encrypt(
          algorithm: Record<string, unknown>,
          _key: Record<string, unknown>,
          data: BufferSource,
        ) {
          const { chacha20poly1305 } = await import("@noble/ciphers/chacha.js");
          const rawKey = new Uint8Array(
            (_key as Record<string, unknown>)._raw as ArrayBuffer,
          );
          const nonce = new Uint8Array(algorithm.iv as ArrayBuffer);
          const aad = algorithm.additionalData
            ? new Uint8Array(algorithm.additionalData as ArrayBuffer)
            : undefined;
          const cipher = chacha20poly1305(rawKey, nonce, aad);
          const sealed = cipher.encrypt(new Uint8Array(data as ArrayBuffer));
          return sealed.buffer.slice(
            sealed.byteOffset,
            sealed.byteOffset + sealed.byteLength,
          );
        },
        async decrypt(
          algorithm: Record<string, unknown>,
          _key: Record<string, unknown>,
          data: BufferSource,
        ) {
          const { chacha20poly1305 } = await import("@noble/ciphers/chacha.js");
          const rawKey = new Uint8Array(
            (_key as Record<string, unknown>)._raw as ArrayBuffer,
          );
          const nonce = new Uint8Array(algorithm.iv as ArrayBuffer);
          const aad = algorithm.additionalData
            ? new Uint8Array(algorithm.additionalData as ArrayBuffer)
            : undefined;
          const cipher = chacha20poly1305(rawKey, nonce, aad);
          const plaintext = cipher.decrypt(new Uint8Array(data as ArrayBuffer));
          return plaintext.buffer.slice(
            plaintext.byteOffset,
            plaintext.byteOffset + plaintext.byteLength,
          );
        },
        async digest(algorithm: string, data: BufferSource) {
          const { sha3_256, sha3_512 } = await import("@noble/hashes/sha3.js");
          const input = new Uint8Array(data as ArrayBuffer);
          const hash =
            algorithm === "SHA3-256" ? sha3_256(input) : sha3_512(input);
          return hash.buffer.slice(
            hash.byteOffset,
            hash.byteOffset + hash.byteLength,
          );
        },
      });

      setMockSubtle(mockSubtle);
      _resetModernWebCryptoDetection();

      // Verify detection picks up the mock
      const support = detectModernWebCrypto();
      expect(support.chacha20poly1305).to.be.true;
      expect(support.sha3).to.be.true;
      expect(support.mlKem).to.be.true;
      expect(support.argon2).to.be.true;
      expect(support.kmac).to.be.true;

      // Test ChaCha20 encrypt/decrypt accelerated path
      const keyHex =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "accelerated test",
      });
      expect(encrypted.accelerated).to.be.true;
      expect(encrypted.ciphertext).to.be.a("string");
      expect(importKeyCalled).to.be.true;

      const decrypted = await modernChaCha20Decrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
      });
      expect(decrypted.accelerated).to.be.true;
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "accelerated test",
      );
    });

    it("should use WebCrypto for ChaCha20 with AAD in accelerated path", async () => {
      const mockSubtle = createMockSubtle({
        supports(operation: string, algorithm: string): boolean {
          return (
            (operation === "encrypt" && algorithm === "ChaCha20-Poly1305") ||
            false
          );
        },
        async importKey(
          _format: string,
          keyData: BufferSource,
          algorithm: Record<string, unknown>,
          extractable: boolean,
          usages: string[],
        ) {
          return {
            type: "secret",
            algorithm,
            extractable,
            usages,
            _raw: keyData,
          };
        },
        async encrypt(
          algorithm: Record<string, unknown>,
          _key: Record<string, unknown>,
          data: BufferSource,
        ) {
          const { chacha20poly1305 } = await import("@noble/ciphers/chacha.js");
          const rawKey = new Uint8Array(
            (_key as Record<string, unknown>)._raw as ArrayBuffer,
          );
          const nonce = new Uint8Array(algorithm.iv as ArrayBuffer);
          const aad = algorithm.additionalData
            ? new Uint8Array(algorithm.additionalData as ArrayBuffer)
            : undefined;
          const cipher = chacha20poly1305(rawKey, nonce, aad);
          const sealed = cipher.encrypt(new Uint8Array(data as ArrayBuffer));
          return sealed.buffer.slice(
            sealed.byteOffset,
            sealed.byteOffset + sealed.byteLength,
          );
        },
        async decrypt(
          algorithm: Record<string, unknown>,
          _key: Record<string, unknown>,
          data: BufferSource,
        ) {
          const { chacha20poly1305 } = await import("@noble/ciphers/chacha.js");
          const rawKey = new Uint8Array(
            (_key as Record<string, unknown>)._raw as ArrayBuffer,
          );
          const nonce = new Uint8Array(algorithm.iv as ArrayBuffer);
          const aad = algorithm.additionalData
            ? new Uint8Array(algorithm.additionalData as ArrayBuffer)
            : undefined;
          const cipher = chacha20poly1305(rawKey, nonce, aad);
          const plaintext = cipher.decrypt(new Uint8Array(data as ArrayBuffer));
          return plaintext.buffer.slice(
            plaintext.byteOffset,
            plaintext.byteOffset + plaintext.byteLength,
          );
        },
      });

      setMockSubtle(mockSubtle);
      _resetModernWebCryptoDetection();

      const keyHex =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const aad = Buffer.from("aad-context");
      const encrypted = await modernChaCha20Encrypt({
        key: keyHex,
        plaintext: "aad accelerated",
        aad,
      });
      expect(encrypted.accelerated).to.be.true;

      const decrypted = await modernChaCha20Decrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
        aad,
      });
      expect(decrypted.accelerated).to.be.true;
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "aad accelerated",
      );
    });

    it("should use WebCrypto for SHA-3 in accelerated path", async () => {
      const mockSubtle = createMockSubtle({
        supports(operation: string, algorithm: string): boolean {
          return operation === "digest" && algorithm === "SHA3-256";
        },
        async digest(algorithm: string, data: BufferSource) {
          const { sha3_256, sha3_512 } = await import("@noble/hashes/sha3.js");
          const input = new Uint8Array(data as ArrayBuffer);
          const hash =
            algorithm === "SHA3-256" ? sha3_256(input) : sha3_512(input);
          return hash.buffer.slice(
            hash.byteOffset,
            hash.byteOffset + hash.byteLength,
          );
        },
      });

      setMockSubtle(mockSubtle);
      _resetModernWebCryptoDetection();

      const result = await modernSha3Hash({
        algorithm: "SHA3-256",
        data: "accelerated sha3",
      });
      expect(result.accelerated).to.be.true;
      expect(result.digest).to.have.length(64);
    });

    it("should handle supports() that throws for all algorithms", async () => {
      const mockSubtle = createMockSubtle({
        supports(): boolean {
          throw new Error("supports() not implemented");
        },
      });

      setMockSubtle(mockSubtle);
      _resetModernWebCryptoDetection();

      const support = detectModernWebCrypto();
      // All should be false because supports() throws
      expect(support.chacha20poly1305).to.be.false;
      expect(support.sha3).to.be.false;
      expect(support.mlKem).to.be.false;
      expect(support.argon2).to.be.false;
      expect(support.kmac).to.be.false;
    });

    it("should handle subtle being unavailable (no supports method)", () => {
      Object.defineProperty(proto, "subtle", {
        get: () => undefined,
        configurable: true,
      });

      _resetModernWebCryptoDetection();

      const support = detectModernWebCrypto();
      expect(support.chacha20poly1305).to.be.false;
      expect(support.sha3).to.be.false;
    });
  });
});
