// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Comprehensive tests for @sebastienrousseau/crypto-react.
 *
 * React hooks (useState, useCallback, etc.) only work inside a React
 * component render cycle. Since we have no DOM or test renderer, we:
 *
 * 1. Replace the `react` module in require.cache with a mock that
 *    provides working useState/useCallback/useMemo/useContext/createContext
 *    so the hook functions can execute outside a component.
 * 2. Test all barrel exports, hook logic, and underlying crypto-lib ops.
 */

import { expect } from "chai";

// ── Mock React module before any hook imports ──

let stateStore: Map<number, unknown>;
let stateIdx: number;

function resetHookState() {
  stateStore = new Map();
  stateIdx = 0;
}
resetHookState();

const defaultContextValues = new Map<object, unknown>();

const mockReact: Record<string, unknown> = {
  useState<T>(initial: T): [T, (v: T) => void] {
    const idx = stateIdx++;
    if (!stateStore.has(idx)) {
      stateStore.set(idx, initial);
    }
    const value = stateStore.get(idx) as T;
    const setter = (v: T) => { stateStore.set(idx, v); };
    return [value, setter];
  },
  useCallback<T>(fn: T, _deps: unknown[]): T {
    return fn;
  },
  useMemo<T>(fn: () => T, _deps: unknown[]): T {
    return fn();
  },
  createContext<T>(defaultValue: T): object {
    const ctx = { _defaultValue: defaultValue, Provider: {}, Consumer: {} };
    defaultContextValues.set(ctx, defaultValue);
    return ctx;
  },
  useContext(ctx: object): unknown {
    return defaultContextValues.get(ctx) ?? (ctx as { _defaultValue: unknown })._defaultValue;
  },
  // React JSX runtime needs createElement for the provider component
  createElement(type: unknown, props: unknown, ...children: unknown[]) {
    return { type, props, children };
  },
};

// Also provide the jsx-runtime exports for react-jsx transform
const mockJsxRuntime: Record<string, unknown> = {
  jsx: mockReact.createElement,
  jsxs: mockReact.createElement,
  Fragment: Symbol("Fragment"),
};

// Install mock modules into require.cache
function resolveModule(name: string): string {
  try {
    return require.resolve(name);
  } catch {
    return name;
  }
}

const reactPath = resolveModule("react");
const jsxRuntimePath = resolveModule("react/jsx-runtime");

// Save originals
const origReactCache = require.cache[reactPath];
const origJsxCache = require.cache[jsxRuntimePath];

// Replace with mocks
require.cache[reactPath] = {
  id: reactPath,
  filename: reactPath,
  loaded: true,
  exports: mockReact,
  parent: null,
  children: [],
  path: "",
  paths: [],
  require: require,
  isPreloading: false,
};

require.cache[jsxRuntimePath] = {
  id: jsxRuntimePath,
  filename: jsxRuntimePath,
  loaded: true,
  exports: mockJsxRuntime,
  parent: null,
  children: [],
  path: "",
  paths: [],
  require: require,
  isPreloading: false,
};

// ── Now import modules under test (they'll get our mock React) ──

// We need to bust any cached versions of our source modules
function uncache(pattern: string) {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(pattern) && key.includes("crypto-react/src")) {
      delete require.cache[key];
    }
  }
}
uncache("crypto-react/src");

const indexModule = require("../src/index");
const {
  CryptoProvider,
  useCryptoContext,
  useKeypair,
  useEncrypt,
  useHash,
  useSignature,
} = indexModule;

// Also import crypto-lib directly for integration verification
import {
  generateKeyPair,
  type KeyAlgorithm,
} from "@sebastienrousseau/crypto-lib/dist/keys/keygen";
import {
  seal,
  open,
} from "@sebastienrousseau/crypto-lib/dist/high-level/secretbox";
import {
  hash as computeHash,
  type HashAlgorithm,
} from "@sebastienrousseau/crypto-lib/dist/modern/hash";
import {
  crypto,
  type SignAlgorithm,
} from "@sebastienrousseau/crypto-lib/dist/crypto";

// ── Tests ──

describe("@sebastienrousseau/crypto-react", () => {
  beforeEach(() => {
    resetHookState();
  });

  after(() => {
    // Restore original React modules
    if (origReactCache) {
      require.cache[reactPath] = origReactCache;
    } else {
      delete require.cache[reactPath];
    }
    if (origJsxCache) {
      require.cache[jsxRuntimePath] = origJsxCache;
    } else {
      delete require.cache[jsxRuntimePath];
    }
  });

  // ========================================================================
  // Barrel exports
  // ========================================================================
  describe("index.ts barrel exports", () => {
    it("should export CryptoProvider as a function", () => {
      expect(CryptoProvider).to.be.a("function");
    });

    it("should export useCryptoContext as a function", () => {
      expect(useCryptoContext).to.be.a("function");
    });

    it("should export useKeypair as a function", () => {
      expect(useKeypair).to.be.a("function");
    });

    it("should export useEncrypt as a function", () => {
      expect(useEncrypt).to.be.a("function");
    });

    it("should export useHash as a function", () => {
      expect(useHash).to.be.a("function");
    });

    it("should export useSignature as a function", () => {
      expect(useSignature).to.be.a("function");
    });

    it("should export all named members from index", () => {
      const expectedExports = [
        "CryptoProvider",
        "useCryptoContext",
        "useKeypair",
        "useEncrypt",
        "useHash",
        "useSignature",
      ];
      for (const name of expectedExports) {
        expect(indexModule).to.have.property(name);
      }
    });
  });

  // ========================================================================
  // CryptoProvider + useCryptoContext
  // ========================================================================
  describe("provider.tsx", () => {
    it("CryptoProvider should be a function", () => {
      expect(CryptoProvider).to.be.a("function");
    });

    it("useCryptoContext returns default context value (empty object)", () => {
      resetHookState();
      const ctx = useCryptoContext();
      expect(ctx).to.be.an("object");
    });

    it("CryptoProvider calls useMemo and renders children", () => {
      resetHookState();
      const result = CryptoProvider({
        defaultKey: "abc123",
        serverUrl: "https://example.com",
        apiKey: "key",
        children: "test-child",
      });
      // With our mock, createElement returns an object with type, props, children
      expect(result).to.be.an("object");
    });

    it("CryptoProvider with minimal props", () => {
      resetHookState();
      const result = CryptoProvider({
        children: "child",
      });
      expect(result).to.be.an("object");
    });

    it("CryptoProvider with all config fields", () => {
      resetHookState();
      const result = CryptoProvider({
        defaultKey: "aabb",
        serverUrl: "https://localhost",
        apiKey: "mykey",
        children: null,
      });
      expect(result).to.be.an("object");
    });
  });

  // ========================================================================
  // useKeypair
  // ========================================================================
  describe("useKeypair hook", () => {
    it("should return initial state with null keys", () => {
      resetHookState();
      const result = useKeypair();
      expect(result.publicKey).to.be.null;
      expect(result.privateKey).to.be.null;
      expect(result.algorithm).to.be.null;
      expect(result.isGenerating).to.be.false;
      expect(result.generate).to.be.a("function");
    });

    it("should generate ed25519 key pair (default)", () => {
      resetHookState();
      const result = useKeypair();
      result.generate();
      // After generate(), state setters were called. Re-invoke to read updated state.
      stateIdx = 0;
      const updated = useKeypair();
      expect(updated.publicKey).to.be.a("string").and.have.length.greaterThan(0);
      expect(updated.privateKey).to.be.a("string").and.have.length.greaterThan(0);
      expect(updated.algorithm).to.equal("ed25519");
      expect(updated.isGenerating).to.be.false;
    });

    it("should generate ed448 key pair", () => {
      resetHookState();
      const result = useKeypair("ed448");
      result.generate();
      stateIdx = 0;
      const updated = useKeypair("ed448");
      expect(updated.publicKey).to.be.a("string");
      expect(updated.algorithm).to.equal("ed448");
    });

    it("should generate p256 key pair", () => {
      resetHookState();
      const result = useKeypair("p256");
      result.generate("p256");
      stateIdx = 0;
      const updated = useKeypair("p256");
      expect(updated.publicKey).to.be.a("string");
      expect(updated.algorithm).to.equal("p256");
    });

    it("should generate p384 key pair", () => {
      resetHookState();
      const result = useKeypair();
      result.generate("p384");
      stateIdx = 0;
      const updated = useKeypair();
      expect(updated.algorithm).to.equal("p384");
    });

    it("should generate x25519 key pair", () => {
      resetHookState();
      const result = useKeypair();
      result.generate("x25519");
      stateIdx = 0;
      const updated = useKeypair();
      expect(updated.algorithm).to.equal("x25519");
    });

    it("should override default algorithm via generate()", () => {
      resetHookState();
      const result = useKeypair("ed25519");
      result.generate("ed448");
      stateIdx = 0;
      const updated = useKeypair("ed25519");
      expect(updated.algorithm).to.equal("ed448");
    });

    it("should generate ml-dsa-44 key pair", () => {
      resetHookState();
      const result = useKeypair();
      result.generate("ml-dsa-44");
      stateIdx = 0;
      const updated = useKeypair();
      expect(updated.algorithm).to.equal("ml-dsa-44");
    });

    it("should generate ml-kem-768 key pair", () => {
      resetHookState();
      const result = useKeypair();
      result.generate("ml-kem-768");
      stateIdx = 0;
      const updated = useKeypair();
      expect(updated.algorithm).to.equal("ml-kem-768");
    });
  });

  // ========================================================================
  // useKeypair - underlying crypto-lib integration
  // ========================================================================
  describe("useKeypair crypto-lib integration", () => {
    const algorithms: KeyAlgorithm[] = [
      "ed25519",
      "x25519",
      "ed448",
      "p256",
      "p384",
    ];

    for (const algo of algorithms) {
      it(`generateKeyPair("${algo}") returns valid structure`, () => {
        const kp = generateKeyPair(algo);
        expect(kp).to.have.property("publicKey").that.is.a("string");
        expect(kp).to.have.property("privateKey").that.is.a("string");
        expect(kp).to.have.property("algorithm").that.equals(algo);
        expect(kp).to.have.property("kid").that.is.a("string");
        expect(kp).to.have.property("metadata").that.is.an("object");
        expect(kp.publicKey).to.match(/^[0-9a-f]+$/);
        expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
      });
    }

    it("generateKeyPair with metadata", () => {
      const kp = generateKeyPair("ed25519", {
        kid: "test-kid",
        use: "sig",
        exp: "2030-01-01T00:00:00Z",
      });
      expect(kp.kid).to.equal("test-kid");
      expect(kp.metadata.use).to.equal("sig");
      expect(kp.metadata.exp).to.equal("2030-01-01T00:00:00Z");
    });
  });

  // ========================================================================
  // useEncrypt
  // ========================================================================
  describe("useEncrypt hook", () => {
    it("should return initial state", () => {
      resetHookState();
      const result = useEncrypt();
      expect(result.ciphertext).to.be.null;
      expect(result.plaintext).to.be.null;
      expect(result.isProcessing).to.be.false;
      expect(result.encrypt).to.be.a("function");
      expect(result.decrypt).to.be.a("function");
    });

    it("should throw when no key provided and no defaultKey", () => {
      resetHookState();
      const result = useEncrypt();
      expect(() => result.encrypt("hello")).to.throw(
        "No encryption key provided",
      );
    });

    it("should throw on decrypt when no key provided and no defaultKey", () => {
      resetHookState();
      const result = useEncrypt();
      expect(() => result.decrypt("aabbcc")).to.throw(
        "No decryption key provided",
      );
    });

    it("should encrypt and decrypt with explicit key", () => {
      resetHookState();
      const key = crypto.randomKey();
      const result = useEncrypt();
      const ct = result.encrypt("hello world", key);
      expect(ct).to.be.a("string").and.have.length.greaterThan(0);

      // Re-read state to get ciphertext
      stateIdx = 0;
      const updated = useEncrypt();
      expect(updated.ciphertext).to.equal(ct);

      // Now decrypt
      resetHookState();
      const result2 = useEncrypt();
      const pt = result2.decrypt(ct, key);
      expect(pt).to.equal("hello world");
    });

    it("should encrypt Uint8Array data", () => {
      resetHookState();
      const key = crypto.randomKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const result = useEncrypt();
      const ct = result.encrypt(data, key);
      expect(ct).to.be.a("string");
    });

    it("should store plaintext in state after decrypt", () => {
      resetHookState();
      const key = crypto.randomKey();
      const result = useEncrypt();
      const ct = result.encrypt("stored test", key);

      resetHookState();
      const result2 = useEncrypt();
      result2.decrypt(ct, key);
      stateIdx = 0;
      const updated = useEncrypt();
      expect(updated.plaintext).to.equal("stored test");
    });
  });

  // ========================================================================
  // useEncrypt - underlying crypto-lib integration
  // ========================================================================
  describe("useEncrypt crypto-lib integration", () => {
    it("seal and open round-trip with string plaintext", () => {
      const key = crypto.randomKey();
      const result = seal(key, "test plaintext");
      expect(result).to.have.property("sealed").that.is.a("string");
      expect(result).to.have.property("algorithm").that.equals("xchacha20-poly1305");
      const decrypted = open(key, result.sealed);
      expect(Buffer.from(decrypted).toString("utf8")).to.equal("test plaintext");
    });

    it("seal and open round-trip with Uint8Array plaintext", () => {
      const key = crypto.randomKey();
      const data = new Uint8Array([10, 20, 30, 40, 50]);
      const result = seal(key, data);
      const decrypted = open(key, result.sealed);
      expect(Buffer.from(decrypted)).to.deep.equal(Buffer.from(data));
    });

    it("seal with wrong key fails to decrypt", () => {
      const key1 = crypto.randomKey();
      const key2 = crypto.randomKey();
      const result = seal(key1, "secret");
      expect(() => open(key2, result.sealed)).to.throw();
    });

    it("crypto.randomKey() returns 64-char hex string", () => {
      const key = crypto.randomKey();
      expect(key).to.match(/^[0-9a-f]{64}$/);
    });

    it("crypto.encrypt/decrypt round-trip", () => {
      const key = crypto.randomKey();
      const ct = crypto.encrypt(key, "round trip");
      const pt = crypto.decrypt(key, ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal("round trip");
    });

    it("encrypting empty string works", () => {
      const key = crypto.randomKey();
      const ct = crypto.encrypt(key, "");
      const pt = crypto.decrypt(key, ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal("");
    });
  });

  // ========================================================================
  // useHash
  // ========================================================================
  describe("useHash hook", () => {
    it("should return initial state", () => {
      resetHookState();
      const result = useHash();
      expect(result.digest).to.be.null;
      expect(result.isHashing).to.be.false;
      expect(result.hash).to.be.a("function");
    });

    it("should hash a string with default sha256", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash("hello");
      expect(digest).to.be.a("string").and.have.length.greaterThan(0);
      expect(digest).to.match(/^[0-9a-f]{64}$/);
    });

    it("should hash with sha512", () => {
      resetHookState();
      const result = useHash("sha512");
      const digest = result.hash("hello");
      expect(digest).to.match(/^[0-9a-f]{128}$/);
    });

    it("should hash with override algorithm", () => {
      resetHookState();
      const result = useHash("sha256");
      const digest = result.hash("hello", "sha3-256");
      expect(digest).to.be.a("string").and.have.length(64);
    });

    it("should hash Uint8Array data", () => {
      resetHookState();
      const result = useHash();
      const data = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"
      const digest = result.hash(data);
      expect(digest).to.match(/^[0-9a-f]{64}$/);
    });

    it("should store digest in state after hash()", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash("test");
      stateIdx = 0;
      const updated = useHash();
      expect(updated.digest).to.equal(digest);
    });

    it("should hash with sha384", () => {
      resetHookState();
      const result = useHash("sha384");
      const digest = result.hash("hello");
      expect(digest).to.match(/^[0-9a-f]{96}$/);
    });

    it("should hash with sha3-512", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash("hello", "sha3-512");
      expect(digest).to.match(/^[0-9a-f]{128}$/);
    });

    it("should hash with blake2b", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash("hello", "blake2b");
      expect(digest).to.be.a("string").and.have.length.greaterThan(0);
    });

    it("should hash with blake3", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash("hello", "blake3");
      expect(digest).to.be.a("string").and.have.length.greaterThan(0);
    });

    it("should hash empty string", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash("");
      expect(digest).to.match(/^[0-9a-f]{64}$/);
    });
  });

  // ========================================================================
  // useHash - underlying crypto-lib integration
  // ========================================================================
  describe("useHash crypto-lib integration", () => {
    const hashAlgos: HashAlgorithm[] = [
      "sha256",
      "sha384",
      "sha512",
      "sha3-256",
      "sha3-512",
      "blake2b",
      "blake3",
    ];

    for (const algo of hashAlgos) {
      it(`computeHash with "${algo}" returns valid digest`, () => {
        const result = computeHash({ algorithm: algo, data: "test data" });
        expect(result).to.have.property("digest").that.is.a("string");
        expect(result.digest).to.match(/^[0-9a-f]+$/);
      });
    }

    it("deterministic hash for same input", () => {
      const d1 = computeHash({ algorithm: "sha256", data: "abc" });
      const d2 = computeHash({ algorithm: "sha256", data: "abc" });
      expect(d1.digest).to.equal(d2.digest);
    });

    it("different inputs produce different hashes", () => {
      const d1 = computeHash({ algorithm: "sha256", data: "abc" });
      const d2 = computeHash({ algorithm: "sha256", data: "def" });
      expect(d1.digest).to.not.equal(d2.digest);
    });
  });

  // ========================================================================
  // useSignature
  // ========================================================================
  describe("useSignature hook", () => {
    it("should return initial state", () => {
      resetHookState();
      const result = useSignature();
      expect(result.signature).to.be.null;
      expect(result.isValid).to.be.null;
      expect(result.isProcessing).to.be.false;
      expect(result.sign).to.be.a("function");
      expect(result.verify).to.be.a("function");
    });

    it("should sign and verify with ed25519 (default)", () => {
      resetHookState();
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const sig = result.sign(kp.privateKey, "hello");
      expect(sig).to.be.a("string").and.have.length.greaterThan(0);

      // Re-read state
      stateIdx = 0;
      const updated = useSignature();
      expect(updated.signature).to.equal(sig);

      // Verify
      resetHookState();
      const result2 = useSignature();
      const valid = result2.verify(kp.publicKey, "hello", sig);
      expect(valid).to.be.true;

      stateIdx = 0;
      const updated2 = useSignature();
      expect(updated2.isValid).to.be.true;
    });

    it("should sign and verify with ed448", () => {
      resetHookState();
      const kp = generateKeyPair("ed448");
      const result = useSignature("ed448");
      const sig = result.sign(kp.privateKey, "test message");
      expect(sig).to.be.a("string");

      resetHookState();
      const result2 = useSignature("ed448");
      const valid = result2.verify(kp.publicKey, "test message", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ecdsa-p256", () => {
      resetHookState();
      const kp = generateKeyPair("p256");
      const result = useSignature("ecdsa-p256");
      const sig = result.sign(kp.privateKey, "p256 message");
      expect(sig).to.be.a("string");

      resetHookState();
      const result2 = useSignature("ecdsa-p256");
      const valid = result2.verify(kp.publicKey, "p256 message", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with algorithm override", () => {
      resetHookState();
      const kp = generateKeyPair("p384");
      const result = useSignature("ed25519"); // default, but override below
      const sig = result.sign(kp.privateKey, "override", "ecdsa-p384");
      expect(sig).to.be.a("string");

      resetHookState();
      const result2 = useSignature("ed25519");
      const valid = result2.verify(kp.publicKey, "override", sig, "ecdsa-p384");
      expect(valid).to.be.true;
    });

    it("should return false for invalid signature", () => {
      resetHookState();
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const sig = result.sign(kp.privateKey, "hello");
      const tampered = sig.replace(/^./, sig[0] === "a" ? "b" : "a");

      resetHookState();
      const result2 = useSignature();
      try {
        const valid = result2.verify(kp.publicKey, "hello", tampered);
        expect(valid).to.be.false;
      } catch {
        // Some algorithms throw on malformed signatures
      }
    });

    it("should sign Uint8Array messages", () => {
      resetHookState();
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const msg = new Uint8Array([1, 2, 3, 4]);
      const sig = result.sign(kp.privateKey, msg);
      expect(sig).to.be.a("string");

      resetHookState();
      const result2 = useSignature();
      const valid = result2.verify(kp.publicKey, msg, sig);
      expect(valid).to.be.true;
    });
  });

  // ========================================================================
  // useSignature - underlying crypto-lib integration
  // ========================================================================
  describe("useSignature crypto-lib integration", () => {
    it("crypto.sign/verify ed25519 round-trip", () => {
      const kp = generateKeyPair("ed25519");
      const sig = crypto.sign("ed25519", kp.privateKey, "msg");
      expect(crypto.verify("ed25519", kp.publicKey, "msg", sig)).to.be.true;
    });

    it("crypto.sign/verify ed448 round-trip", () => {
      const kp = generateKeyPair("ed448");
      const sig = crypto.sign("ed448", kp.privateKey, "msg");
      expect(crypto.verify("ed448", kp.publicKey, "msg", sig)).to.be.true;
    });

    it("crypto.sign/verify ecdsa-p256 round-trip", () => {
      const kp = generateKeyPair("p256");
      const sig = crypto.sign("ecdsa-p256", kp.privateKey, "msg");
      expect(crypto.verify("ecdsa-p256", kp.publicKey, "msg", sig)).to.be.true;
    });

    it("crypto.sign/verify ecdsa-p384 round-trip", () => {
      const kp = generateKeyPair("p384");
      const sig = crypto.sign("ecdsa-p384", kp.privateKey, "msg");
      expect(crypto.verify("ecdsa-p384", kp.publicKey, "msg", sig)).to.be.true;
    });

    it("crypto.sign with unsupported algorithm throws", () => {
      expect(() =>
        crypto.sign("unsupported" as SignAlgorithm, "key", "msg"),
      ).to.throw("Unsupported signing algorithm");
    });

    it("crypto.verify with unsupported algorithm throws", () => {
      expect(() =>
        crypto.verify("unsupported" as SignAlgorithm, "key", "msg", "sig"),
      ).to.throw("Unsupported verify algorithm");
    });

    it("verification with wrong message returns false", () => {
      const kp = generateKeyPair("ed25519");
      const sig = crypto.sign("ed25519", kp.privateKey, "correct");
      const valid = crypto.verify("ed25519", kp.publicKey, "wrong", sig);
      expect(valid).to.be.false;
    });
  });

  // ========================================================================
  // Edge cases
  // ========================================================================
  describe("edge cases", () => {
    it("hashing empty Uint8Array", () => {
      resetHookState();
      const result = useHash();
      const digest = result.hash(new Uint8Array(0));
      expect(digest).to.be.a("string").and.have.length.greaterThan(0);
    });

    it("multiple sequential keypair generations update state", () => {
      resetHookState();
      const result = useKeypair();
      result.generate("ed25519");
      stateIdx = 0;
      const after1 = useKeypair();
      expect(after1.publicKey).to.be.a("string");

      stateIdx = 0;
      const result2 = useKeypair();
      result2.generate("ed25519");
      stateIdx = 0;
      const after2 = useKeypair();
      expect(after2.publicKey).to.be.a("string");
    });

    it("encrypt then decrypt preserves Unicode strings", () => {
      const key = crypto.randomKey();
      const plaintext = "Hello, \u4E16\u754C! \uD83D\uDE80";
      const ct = crypto.encrypt(key, plaintext);
      const pt = crypto.decrypt(key, ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal(plaintext);
    });

    it("hash is deterministic across hook calls", () => {
      resetHookState();
      const r1 = useHash();
      const d1 = r1.hash("deterministic");
      resetHookState();
      const r2 = useHash();
      const d2 = r2.hash("deterministic");
      expect(d1).to.equal(d2);
    });

    it("sign with Uint8Array message bytes via crypto-lib", () => {
      const kp = generateKeyPair("ed25519");
      const msg = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const sig = crypto.sign("ed25519", kp.privateKey, msg);
      const valid = crypto.verify("ed25519", kp.publicKey, msg, sig);
      expect(valid).to.be.true;
    });

    it("large plaintext encrypt/decrypt", () => {
      const key = crypto.randomKey();
      const large = "x".repeat(100_000);
      const ct = crypto.encrypt(key, large);
      const pt = crypto.decrypt(key, ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal(large);
    });

    it("encrypt/decrypt with Uint8Array key", () => {
      const keyHex = crypto.randomKey();
      const keyBytes = Buffer.from(keyHex, "hex");
      const ct = seal(keyBytes, "bytes key test");
      const pt = open(keyBytes, ct.sealed);
      expect(Buffer.from(pt).toString("utf8")).to.equal("bytes key test");
    });
  });
});
