import { expect } from "chai";
import {
  detectWasmBackend,
  _resetWasmDetection,
  wasmHash,
  wasmAeadEncrypt,
  wasmAeadDecrypt,
} from "../../src/accel/wasm-bridge";
import type { WasmHashAlgorithm } from "../../src/accel/wasm-bridge";

describe("WASM Bridge", () => {
  afterEach(() => {
    _resetWasmDetection();
  });

  describe("detectWasmBackend()", () => {
    it("should return a valid backend string", () => {
      const backend = detectWasmBackend();
      expect(["wasm-simd", "wasm", "js"]).to.include(backend);
    });

    it("should cache the result on subsequent calls", () => {
      const first = detectWasmBackend();
      const second = detectWasmBackend();
      expect(first).to.equal(second);
    });

    it("should reset cache with _resetWasmDetection()", () => {
      detectWasmBackend();
      _resetWasmDetection();
      // Should not throw; just re-detect
      const backend = detectWasmBackend();
      expect(["wasm-simd", "wasm", "js"]).to.include(backend);
    });

    it("should return 'js' when WebAssembly is unavailable", () => {
      _resetWasmDetection();
      const g = globalThis as Record<string, unknown>;
      const saved = g["WebAssembly"];
      g["WebAssembly"] = undefined;
      try {
        const backend = detectWasmBackend();
        expect(backend).to.equal("js");
      } finally {
        g["WebAssembly"] = saved;
        _resetWasmDetection();
      }
    });

    it("should return 'wasm' when SIMD is not supported", () => {
      _resetWasmDetection();
      const g = globalThis as Record<string, unknown>;
      const saved = g["WebAssembly"];
      // Provide a Module constructor that always throws (no SIMD)
      g["WebAssembly"] = {
        Module: class {
          constructor() {
            throw new Error("SIMD not supported");
          }
        },
      };
      try {
        const backend = detectWasmBackend();
        expect(backend).to.equal("wasm");
      } finally {
        g["WebAssembly"] = saved;
        _resetWasmDetection();
      }
    });

    it("should return 'wasm-simd' when SIMD module compiles", () => {
      _resetWasmDetection();
      const g = globalThis as Record<string, unknown>;
      const saved = g["WebAssembly"];
      // Provide a Module constructor that succeeds
      g["WebAssembly"] = {
        Module: class {
          constructor() {
            // Simulate successful SIMD compilation
          }
        },
      };
      try {
        const backend = detectWasmBackend();
        expect(backend).to.equal("wasm-simd");
      } finally {
        g["WebAssembly"] = saved;
        _resetWasmDetection();
      }
    });

    it("should return 'js' when Module throws and is not a function", () => {
      _resetWasmDetection();
      const g = globalThis as Record<string, unknown>;
      const saved = g["WebAssembly"];
      g["WebAssembly"] = {
        Module: "not-a-function",
      };
      try {
        const backend = detectWasmBackend();
        expect(backend).to.equal("js");
      } finally {
        g["WebAssembly"] = saved;
        _resetWasmDetection();
      }
    });
  });

  describe("wasmHash()", () => {
    const algorithms: WasmHashAlgorithm[] = [
      "sha256",
      "sha512",
      "sha3-256",
      "sha3-512",
      "blake3",
    ];

    for (const algorithm of algorithms) {
      it(`should hash with ${algorithm}`, () => {
        const result = wasmHash({ algorithm, data: "hello world" });
        expect(result.digest).to.be.a("string");
        expect(result.digest).to.match(/^[0-9a-f]+$/);
        expect(result.algorithm).to.equal(algorithm);
        expect(result.backend).to.equal("js");
      });
    }

    it("should accept Uint8Array input", () => {
      const data = Buffer.from("test data", "utf8");
      const result = wasmHash({ algorithm: "sha256", data });
      expect(result.digest).to.be.a("string");
      expect(result.digest.length).to.equal(64); // SHA-256 = 32 bytes = 64 hex
    });

    it("should accept hex-encoded input", () => {
      const result = wasmHash({
        algorithm: "sha256",
        data: "deadbeef",
        encoding: "hex",
      });
      expect(result.digest).to.be.a("string");
      expect(result.digest.length).to.equal(64);
    });

    it("should produce deterministic output", () => {
      const a = wasmHash({ algorithm: "blake3", data: "deterministic" });
      const b = wasmHash({ algorithm: "blake3", data: "deterministic" });
      expect(a.digest).to.equal(b.digest);
    });

    it("should throw for unsupported algorithm", () => {
      expect(() =>
        wasmHash({ algorithm: "md5" as WasmHashAlgorithm, data: "x" }),
      ).to.throw("Unsupported hash algorithm");
    });

    it("should throw for invalid hex input", () => {
      expect(() =>
        wasmHash({ algorithm: "sha256", data: "not-hex!", encoding: "hex" }),
      ).to.throw("Invalid hex string");
    });
  });

  describe("wasmAeadEncrypt() / wasmAeadDecrypt()", () => {
    const keyHex =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    it("should encrypt and decrypt round-trip", () => {
      const encrypted = wasmAeadEncrypt({
        key: keyHex,
        plaintext: "hello WASM!",
      });
      expect(encrypted.ciphertext).to.be.a("string");
      expect(encrypted.backend).to.equal("js");

      const decrypted = wasmAeadDecrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "hello WASM!",
      );
      expect(decrypted.backend).to.equal("js");
    });

    it("should encrypt with Uint8Array key", () => {
      const key = Buffer.from(keyHex, "hex");
      const encrypted = wasmAeadEncrypt({ key, plaintext: "bytes key" });
      const decrypted = wasmAeadDecrypt({
        key,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "bytes key",
      );
    });

    it("should encrypt with Uint8Array plaintext", () => {
      const plaintext = Buffer.from("binary data", "utf8");
      const encrypted = wasmAeadEncrypt({ key: keyHex, plaintext });
      const decrypted = wasmAeadDecrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "binary data",
      );
    });

    it("should support AAD", () => {
      const aad = Buffer.from("associated data", "utf8");
      const encrypted = wasmAeadEncrypt({
        key: keyHex,
        plaintext: "with aad",
        aad,
      });
      const decrypted = wasmAeadDecrypt({
        key: keyHex,
        ciphertext: encrypted.ciphertext,
        aad,
      });
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "with aad",
      );
    });

    it("should fail decryption with wrong AAD", () => {
      const aad = Buffer.from("correct aad", "utf8");
      const encrypted = wasmAeadEncrypt({
        key: keyHex,
        plaintext: "test",
        aad,
      });
      expect(() =>
        wasmAeadDecrypt({
          key: keyHex,
          ciphertext: encrypted.ciphertext,
          aad: Buffer.from("wrong aad", "utf8"),
        }),
      ).to.throw();
    });

    it("should throw for wrong key length", () => {
      expect(() => wasmAeadEncrypt({ key: "abcd", plaintext: "x" })).to.throw(
        "Key must be 32 bytes",
      );
    });

    it("should throw for wrong key length on decrypt", () => {
      expect(() =>
        wasmAeadDecrypt({
          key: "abcd",
          ciphertext: Buffer.alloc(100).toString("base64"),
        }),
      ).to.throw("Key must be 32 bytes");
    });

    it("should throw for truncated ciphertext", () => {
      expect(() =>
        wasmAeadDecrypt({
          key: keyHex,
          ciphertext: Buffer.alloc(10).toString("base64"),
        }),
      ).to.throw("Ciphertext too short");
    });

    it("should throw for invalid hex key", () => {
      expect(() =>
        wasmAeadEncrypt({ key: "not-hex!", plaintext: "x" }),
      ).to.throw("Invalid hex string");
    });

    it("should produce different ciphertexts for same plaintext (random nonce)", () => {
      const a = wasmAeadEncrypt({ key: keyHex, plaintext: "same" });
      const b = wasmAeadEncrypt({ key: keyHex, plaintext: "same" });
      expect(a.ciphertext).to.not.equal(b.ciphertext);
    });
  });
});
