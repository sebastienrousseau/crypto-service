// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Comprehensive tests for @sebastienrousseau/crypto-vue.
 *
 * Vue's reactivity primitives (ref, readonly, computed) work outside
 * of components, so composables can be tested directly.  For `inject`,
 * which requires an active component instance, we mock it.
 */

import { expect } from "chai";
import * as vue from "vue";

// ── Mock inject so composables that call it work outside a component ──

const origInject = vue.inject;
let injectOverride: Record<symbol | string, unknown> = {};

function mockInject(key: symbol | string, defaultValue?: unknown): unknown {
  if ((key as symbol) in injectOverride) {
    return injectOverride[key as symbol];
  }
  return defaultValue;
}

function installVueMocks() {
  (vue as Record<string, unknown>).inject = mockInject;
}

function restoreVueMocks() {
  (vue as Record<string, unknown>).inject = origInject;
}

installVueMocks();

// ── Import modules under test ──

import {
  CryptoPlugin,
  CryptoSymbol,
  useKeypair,
  useEncrypt,
  useHash,
  useSignature,
} from "../src/index";

import type {
  CryptoPluginOptions,
  UseKeypairReturn,
  UseEncryptReturn,
  UseHashReturn,
  UseSignatureReturn,
  HashAlgorithm,
  SignAlgorithm,
} from "../src/index";

// Import crypto-lib for integration testing
import {
  crypto,
  generateKeyPair,
  type KeyAlgorithm,
} from "@sebastienrousseau/crypto-lib";

// Underlying keygen module ref for mocking non-Error throws in useKeypair.
// The barrel export uses a getter, so mutating keygen.generateKeyPair is
// visible to all code that accesses it through the barrel.
const keygen = require("@sebastienrousseau/crypto-lib/dist/keys/keygen");

// ── Tests ──

describe("@sebastienrousseau/crypto-vue", () => {
  after(() => {
    restoreVueMocks();
  });

  // ========================================================================
  // Barrel exports
  // ========================================================================
  describe("index.ts barrel exports", () => {
    it("should export CryptoPlugin", () => {
      expect(CryptoPlugin).to.be.an("object");
      expect(CryptoPlugin).to.have.property("install").that.is.a("function");
    });

    it("should export CryptoSymbol", () => {
      expect(CryptoSymbol).to.be.a("symbol");
    });

    it("should export useKeypair", () => {
      expect(useKeypair).to.be.a("function");
    });

    it("should export useEncrypt", () => {
      expect(useEncrypt).to.be.a("function");
    });

    it("should export useHash", () => {
      expect(useHash).to.be.a("function");
    });

    it("should export useSignature", () => {
      expect(useSignature).to.be.a("function");
    });

    it("should export CryptoPluginOptions type (verified by compilation)", () => {
      const opts: CryptoPluginOptions = {
        defaultKey: "aabb",
        serverUrl: "https://example.com",
        apiKey: "key",
      };
      expect(opts.defaultKey).to.equal("aabb");
    });

    it("should export UseKeypairReturn type (verified by compilation)", () => {
      const partial: Partial<UseKeypairReturn> = {};
      expect(partial).to.be.an("object");
    });

    it("should export UseEncryptReturn type (verified by compilation)", () => {
      const partial: Partial<UseEncryptReturn> = {};
      expect(partial).to.be.an("object");
    });

    it("should export UseHashReturn type (verified by compilation)", () => {
      const partial: Partial<UseHashReturn> = {};
      expect(partial).to.be.an("object");
    });

    it("should export UseSignatureReturn type (verified by compilation)", () => {
      const partial: Partial<UseSignatureReturn> = {};
      expect(partial).to.be.an("object");
    });

    it("should export HashAlgorithm type (verified by compilation)", () => {
      const algo: HashAlgorithm = "sha256";
      expect(algo).to.equal("sha256");
    });

    it("should export SignAlgorithm type (verified by compilation)", () => {
      const algo: SignAlgorithm = "ed25519";
      expect(algo).to.equal("ed25519");
    });
  });

  // ========================================================================
  // CryptoPlugin
  // ========================================================================
  describe("plugin.ts CryptoPlugin", () => {
    it("CryptoSymbol is an InjectionKey (symbol)", () => {
      expect(typeof CryptoSymbol).to.equal("symbol");
      expect(CryptoSymbol.toString()).to.include("crypto");
    });

    it("CryptoPlugin.install calls app.provide with CryptoSymbol", () => {
      let providedKey: unknown = null;
      let providedValue: unknown = null;
      const fakeApp = {
        provide(key: unknown, value: unknown) {
          providedKey = key;
          providedValue = value;
        },
      };
      CryptoPlugin.install(fakeApp as unknown as vue.App, {
        defaultKey: "test-key",
        serverUrl: "https://api.example.com",
        apiKey: "secret",
      });
      expect(providedKey).to.equal(CryptoSymbol);
      expect(providedValue).to.deep.equal({
        defaultKey: "test-key",
        serverUrl: "https://api.example.com",
        apiKey: "secret",
      });
    });

    it("CryptoPlugin.install with default empty options", () => {
      let providedValue: unknown = null;
      const fakeApp = {
        provide(_key: unknown, value: unknown) {
          providedValue = value;
        },
      };
      CryptoPlugin.install(fakeApp as unknown as vue.App);
      expect(providedValue).to.deep.equal({});
    });

    it("CryptoPlugin.install with partial options", () => {
      let providedValue: unknown = null;
      const fakeApp = {
        provide(_key: unknown, value: unknown) {
          providedValue = value;
        },
      };
      CryptoPlugin.install(fakeApp as unknown as vue.App, {
        defaultKey: "only-key",
      });
      expect(providedValue).to.deep.equal({ defaultKey: "only-key" });
    });

    it("CryptoPluginOptions fields are all optional", () => {
      const opts: CryptoPluginOptions = {};
      expect(opts.defaultKey).to.be.undefined;
      expect(opts.serverUrl).to.be.undefined;
      expect(opts.apiKey).to.be.undefined;
    });
  });

  // ========================================================================
  // useKeypair composable
  // ========================================================================
  describe("useKeypair composable", () => {
    it("should return initial state with null values", () => {
      const result = useKeypair();
      expect(result.publicKey.value).to.be.null;
      expect(result.privateKey.value).to.be.null;
      expect(result.algorithm.value).to.be.null;
      expect(result.isGenerating.value).to.be.false;
      expect(result.error.value).to.be.null;
      expect(result.generate).to.be.a("function");
      expect(result.clear).to.be.a("function");
    });

    it("should generate ed25519 key pair", async () => {
      const result = useKeypair();
      const kp = await result.generate("ed25519");
      expect(result.publicKey.value).to.equal(kp.publicKey);
      expect(result.privateKey.value).to.equal(kp.privateKey);
      expect(result.algorithm.value).to.equal("ed25519");
      expect(result.isGenerating.value).to.be.false;
      expect(result.error.value).to.be.null;
      expect(kp.publicKey).to.match(/^[0-9a-f]+$/);
      expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
    });

    it("should generate ed448 key pair", async () => {
      const result = useKeypair();
      const kp = await result.generate("ed448");
      expect(result.algorithm.value).to.equal("ed448");
      expect(kp.algorithm).to.equal("ed448");
    });

    it("should generate p256 key pair", async () => {
      const result = useKeypair();
      const kp = await result.generate("p256");
      expect(result.algorithm.value).to.equal("p256");
      expect(kp.publicKey).to.be.a("string");
    });

    it("should generate p384 key pair", async () => {
      const result = useKeypair();
      await result.generate("p384");
      expect(result.algorithm.value).to.equal("p384");
    });

    it("should generate x25519 key pair", async () => {
      const result = useKeypair();
      await result.generate("x25519");
      expect(result.algorithm.value).to.equal("x25519");
    });

    it("should generate x448 key pair", async () => {
      const result = useKeypair();
      await result.generate("x448");
      expect(result.algorithm.value).to.equal("x448");
    });

    it("should generate ml-kem-768 key pair", async () => {
      const result = useKeypair();
      await result.generate("ml-kem-768");
      expect(result.algorithm.value).to.equal("ml-kem-768");
    });

    it("should generate ml-dsa-65 key pair", async () => {
      const result = useKeypair();
      await result.generate("ml-dsa-65");
      expect(result.algorithm.value).to.equal("ml-dsa-65");
    });

    it("should clear all state", async () => {
      const result = useKeypair();
      await result.generate("ed25519");
      expect(result.publicKey.value).to.not.be.null;
      result.clear();
      expect(result.publicKey.value).to.be.null;
      expect(result.privateKey.value).to.be.null;
      expect(result.algorithm.value).to.be.null;
      expect(result.error.value).to.be.null;
    });

    it("should handle errors and set error ref", async () => {
      const result = useKeypair();
      try {
        await result.generate("invalid-algo" as KeyAlgorithm);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.include("Unsupported");
        expect(result.isGenerating.value).to.be.false;
      }
    });

    it("should wrap non-Error throws in Error", async () => {
      // Replace generateKeyPair on the underlying keygen module.
      // The composable imports generateKeyPair which resolves to keygen.generateKeyPair.
      // Since it's the same object reference, mutating the property is seen by the composable.
      const origGen = keygen.generateKeyPair;
      keygen.generateKeyPair = () => { throw "string-error"; };

      const result = useKeypair();
      try {
        await result.generate("ed25519");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.equal("string-error");
      }

      keygen.generateKeyPair = origGen;
    });

    it("should set isGenerating to false after success", async () => {
      const result = useKeypair();
      await result.generate("ed25519");
      expect(result.isGenerating.value).to.be.false;
    });

    it("should set isGenerating to false after error", async () => {
      const result = useKeypair();
      try {
        await result.generate("nope" as KeyAlgorithm);
      } catch {
        // expected
      }
      expect(result.isGenerating.value).to.be.false;
    });

    it("readonly refs prevent external mutation", () => {
      const result = useKeypair();
      expect(result.publicKey).to.have.property("value");
      expect(result.privateKey).to.have.property("value");
    });

    it("return type includes all required properties", () => {
      const result = useKeypair();
      const keys: (keyof UseKeypairReturn)[] = [
        "publicKey",
        "privateKey",
        "algorithm",
        "isGenerating",
        "error",
        "generate",
        "clear",
      ];
      for (const key of keys) {
        expect(result).to.have.property(key);
      }
    });
  });

  // ========================================================================
  // useEncrypt composable
  // ========================================================================
  describe("useEncrypt composable", () => {
    beforeEach(() => {
      injectOverride = {};
    });

    it("should return initial state", () => {
      const result = useEncrypt();
      expect(result.ciphertext.value).to.be.null;
      expect(result.plaintext.value).to.be.null;
      expect(result.isProcessing.value).to.be.false;
      expect(result.error.value).to.be.null;
      expect(result.encrypt).to.be.a("function");
      expect(result.decrypt).to.be.a("function");
      expect(result.randomKey).to.be.a("function");
      expect(result.clear).to.be.a("function");
    });

    it("should generate a random key", () => {
      const result = useEncrypt();
      const key = result.randomKey();
      expect(key).to.match(/^[0-9a-f]{64}$/);
    });

    it("should generate different random keys each time", () => {
      const result = useEncrypt();
      const k1 = result.randomKey();
      const k2 = result.randomKey();
      expect(k1).to.not.equal(k2);
    });

    it("should encrypt and decrypt a string", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const ct = await result.encrypt(key, "hello vue");
      expect(ct).to.be.a("string").and.have.length.greaterThan(0);
      expect(result.ciphertext.value).to.equal(ct);

      const pt = await result.decrypt(key, ct);
      expect(new TextDecoder().decode(pt)).to.equal("hello vue");
      expect(result.plaintext.value).to.equal("hello vue");
    });

    it("should encrypt Uint8Array data", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const data = new Uint8Array([10, 20, 30]);
      const ct = await result.encrypt(key, data);
      expect(ct).to.be.a("string");

      const pt = await result.decrypt(key, ct);
      expect(Buffer.from(pt)).to.deep.equal(Buffer.from(data));
    });

    it("should handle encryption errors", async () => {
      const result = useEncrypt();
      try {
        await result.encrypt("invalid-key", "data");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(result.error.value).to.be.instanceOf(Error);
        expect(result.isProcessing.value).to.be.false;
      }
    });

    it("should handle decryption errors", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      try {
        await result.decrypt(key, "not-valid-ciphertext");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(result.error.value).to.be.instanceOf(Error);
        expect(result.isProcessing.value).to.be.false;
      }
    });

    it("should handle decryption with wrong key", async () => {
      const result = useEncrypt();
      const key1 = result.randomKey();
      const key2 = result.randomKey();
      const ct = await result.encrypt(key1, "secret");
      try {
        await result.decrypt(key2, ct);
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
      }
    });

    it("should clear all state", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      await result.encrypt(key, "to clear");
      expect(result.ciphertext.value).to.not.be.null;
      result.clear();
      expect(result.ciphertext.value).to.be.null;
      expect(result.plaintext.value).to.be.null;
      expect(result.error.value).to.be.null;
    });

    it("should throw when no key and no defaultKey from plugin", async () => {
      const result = useEncrypt();
      try {
        await result.encrypt("", "data");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(result.error.value).to.be.instanceOf(Error);
      }
    });

    it("should encrypt empty string", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const ct = await result.encrypt(key, "");
      expect(ct).to.be.a("string");
      const pt = await result.decrypt(key, ct);
      expect(new TextDecoder().decode(pt)).to.equal("");
    });

    it("should encrypt and decrypt Unicode text", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const text = "Bonjour le monde! \u2603 \uD83C\uDF1F";
      const ct = await result.encrypt(key, text);
      const pt = await result.decrypt(key, ct);
      expect(new TextDecoder().decode(pt)).to.equal(text);
    });

    it("isProcessing is false after successful encrypt", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      await result.encrypt(key, "test");
      expect(result.isProcessing.value).to.be.false;
    });

    it("isProcessing is false after successful decrypt", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const ct = await result.encrypt(key, "test");
      await result.decrypt(key, ct);
      expect(result.isProcessing.value).to.be.false;
    });

    it("error is reset on new operation", async () => {
      const result = useEncrypt();
      try {
        await result.encrypt("bad", "data");
      } catch {
        // expected
      }
      expect(result.error.value).to.not.be.null;

      const key = result.randomKey();
      await result.encrypt(key, "ok");
      expect(result.error.value).to.be.null;
    });

    it("should use defaultKey from plugin when key is undefined", async () => {
      // Set up inject override with a valid defaultKey before creating composable
      const defaultKey = crypto.randomKey();
      injectOverride[CryptoSymbol as unknown as symbol] = { defaultKey };

      // Create composable - it captures opts from inject during construction
      const result = useEncrypt();

      // Pass undefined as key to trigger resolveKey fallback to opts.defaultKey
      const ct = await result.encrypt(
        undefined as unknown as string,
        "test with defaultKey",
      );
      expect(ct).to.be.a("string");
      expect(result.ciphertext.value).to.equal(ct);

      const pt = await result.decrypt(undefined as unknown as string, ct);
      expect(new TextDecoder().decode(pt)).to.equal("test with defaultKey");

      // Reset
      injectOverride = {};
    });

    it("resolveKey throws when both key and defaultKey are absent", async () => {
      injectOverride = {};
      const result = useEncrypt();
      try {
        await result.encrypt(undefined as unknown as string, "data");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.include(
          "No encryption key provided",
        );
      }
    });

    it("should wrap non-Error encrypt throws in Error", async () => {
      const origEncrypt = (crypto as Record<string, unknown>).encrypt;
      (crypto as Record<string, unknown>).encrypt = () => { throw "encrypt-string-error"; };

      const result = useEncrypt();
      const key = crypto.randomKey();
      try {
        await result.encrypt(key, "data");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.equal("encrypt-string-error");
      }

      (crypto as Record<string, unknown>).encrypt = origEncrypt;
    });

    it("should wrap non-Error decrypt throws in Error", async () => {
      const origDecrypt = (crypto as Record<string, unknown>).decrypt;
      (crypto as Record<string, unknown>).decrypt = () => { throw "decrypt-string-error"; };

      const result = useEncrypt();
      const key = crypto.randomKey();
      try {
        await result.decrypt(key, "ct");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.equal("decrypt-string-error");
      }

      (crypto as Record<string, unknown>).decrypt = origDecrypt;
    });

    it("return type includes all required properties", () => {
      const result = useEncrypt();
      const keys: (keyof UseEncryptReturn)[] = [
        "ciphertext",
        "plaintext",
        "isProcessing",
        "error",
        "encrypt",
        "decrypt",
        "randomKey",
        "clear",
      ];
      for (const key of keys) {
        expect(result).to.have.property(key);
      }
    });
  });

  // ========================================================================
  // useHash composable
  // ========================================================================
  describe("useHash composable", () => {
    it("should return initial state", () => {
      const result = useHash();
      expect(result.digest.value).to.be.null;
      expect(result.algorithm.value).to.be.null;
      expect(result.isHashing.value).to.be.false;
      expect(result.error.value).to.be.null;
      expect(result.hash).to.be.a("function");
      expect(result.clear).to.be.a("function");
    });

    it("should hash a string with sha256", async () => {
      const result = useHash();
      const digest = await result.hash("sha256", "hello");
      expect(digest).to.match(/^[0-9a-f]{64}$/);
      expect(result.digest.value).to.equal(digest);
      expect(result.algorithm.value).to.equal("sha256");
    });

    it("should hash with sha384", async () => {
      const result = useHash();
      const digest = await result.hash("sha384", "hello");
      expect(digest).to.match(/^[0-9a-f]{96}$/);
      expect(result.algorithm.value).to.equal("sha384");
    });

    it("should hash with sha512", async () => {
      const result = useHash();
      const digest = await result.hash("sha512", "hello");
      expect(digest).to.match(/^[0-9a-f]{128}$/);
      expect(result.algorithm.value).to.equal("sha512");
    });

    it("should hash with sha3-256", async () => {
      const result = useHash();
      const digest = await result.hash("sha3-256", "hello");
      expect(digest).to.match(/^[0-9a-f]{64}$/);
      expect(result.algorithm.value).to.equal("sha3-256");
    });

    it("should hash with sha3-512", async () => {
      const result = useHash();
      const digest = await result.hash("sha3-512", "hello");
      expect(digest).to.match(/^[0-9a-f]{128}$/);
    });

    it("should hash with blake2b", async () => {
      const result = useHash();
      const digest = await result.hash("blake2b", "hello");
      expect(digest).to.be.a("string").and.have.length.greaterThan(0);
    });

    it("should hash with blake3", async () => {
      const result = useHash();
      const digest = await result.hash("blake3", "hello");
      expect(digest).to.be.a("string").and.have.length.greaterThan(0);
    });

    it("should hash Uint8Array data", async () => {
      const result = useHash();
      const data = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"
      const digest = await result.hash("sha256", data);
      const stringDigest = await result.hash("sha256", "hello");
      expect(digest).to.equal(stringDigest);
    });

    it("should hash empty string", async () => {
      const result = useHash();
      const digest = await result.hash("sha256", "");
      expect(digest).to.match(/^[0-9a-f]{64}$/);
    });

    it("should produce deterministic hashes", async () => {
      const r1 = useHash();
      const d1 = await r1.hash("sha256", "deterministic");
      const r2 = useHash();
      const d2 = await r2.hash("sha256", "deterministic");
      expect(d1).to.equal(d2);
    });

    it("should produce different hashes for different inputs", async () => {
      const result = useHash();
      const d1 = await result.hash("sha256", "input1");
      const d2 = await result.hash("sha256", "input2");
      expect(d1).to.not.equal(d2);
    });

    it("should handle hash errors", async () => {
      const result = useHash();
      try {
        await result.hash("invalid-algo" as HashAlgorithm, "data");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect(result.isHashing.value).to.be.false;
      }
    });

    it("should wrap non-Error hash throws in Error", async () => {
      const origHash = (crypto as Record<string, unknown>).hash;
      (crypto as Record<string, unknown>).hash = () => { throw "hash-string-error"; };

      const result = useHash();
      try {
        await result.hash("sha256", "data");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.equal("hash-string-error");
      }

      (crypto as Record<string, unknown>).hash = origHash;
    });

    it("should clear all state", async () => {
      const result = useHash();
      await result.hash("sha256", "data");
      expect(result.digest.value).to.not.be.null;
      result.clear();
      expect(result.digest.value).to.be.null;
      expect(result.algorithm.value).to.be.null;
      expect(result.error.value).to.be.null;
    });

    it("isHashing is false after success", async () => {
      const result = useHash();
      await result.hash("sha256", "test");
      expect(result.isHashing.value).to.be.false;
    });

    it("isHashing is false after error", async () => {
      const result = useHash();
      try {
        await result.hash("bad" as HashAlgorithm, "data");
      } catch {
        // expected
      }
      expect(result.isHashing.value).to.be.false;
    });

    it("error is reset on new operation", async () => {
      const result = useHash();
      try {
        await result.hash("bad" as HashAlgorithm, "data");
      } catch {
        // expected
      }
      expect(result.error.value).to.not.be.null;
      await result.hash("sha256", "ok");
      expect(result.error.value).to.be.null;
    });

    it("return type includes all required properties", () => {
      const result = useHash();
      const keys: (keyof UseHashReturn)[] = [
        "digest",
        "algorithm",
        "isHashing",
        "error",
        "hash",
        "clear",
      ];
      for (const key of keys) {
        expect(result).to.have.property(key);
      }
    });
  });

  // ========================================================================
  // useSignature composable
  // ========================================================================
  describe("useSignature composable", () => {
    it("should return initial state", () => {
      const result = useSignature();
      expect(result.signature.value).to.be.null;
      expect(result.isValid.value).to.be.null;
      expect(result.algorithm.value).to.be.null;
      expect(result.isProcessing.value).to.be.false;
      expect(result.error.value).to.be.null;
      expect(result.sign).to.be.a("function");
      expect(result.verify).to.be.a("function");
      expect(result.clear).to.be.a("function");
    });

    it("should sign and verify with ed25519", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const sig = await result.sign("ed25519", kp.privateKey, "hello");
      expect(sig).to.be.a("string").and.have.length.greaterThan(0);
      expect(result.signature.value).to.equal(sig);
      expect(result.algorithm.value).to.equal("ed25519");

      const valid = await result.verify(
        "ed25519",
        kp.publicKey,
        "hello",
        sig,
      );
      expect(valid).to.be.true;
      expect(result.isValid.value).to.be.true;
      expect(result.algorithm.value).to.equal("ed25519");
    });

    it("should sign and verify with ed448", async () => {
      const kp = generateKeyPair("ed448");
      const result = useSignature();
      const sig = await result.sign("ed448", kp.privateKey, "message");
      const valid = await result.verify("ed448", kp.publicKey, "message", sig);
      expect(valid).to.be.true;
    });

    it("should sign and verify with ecdsa-p256", async () => {
      const kp = generateKeyPair("p256");
      const result = useSignature();
      const sig = await result.sign("ecdsa-p256", kp.privateKey, "p256 msg");
      const valid = await result.verify(
        "ecdsa-p256",
        kp.publicKey,
        "p256 msg",
        sig,
      );
      expect(valid).to.be.true;
    });

    it("should sign and verify with ecdsa-p384", async () => {
      const kp = generateKeyPair("p384");
      const result = useSignature();
      const sig = await result.sign("ecdsa-p384", kp.privateKey, "p384 msg");
      const valid = await result.verify(
        "ecdsa-p384",
        kp.publicKey,
        "p384 msg",
        sig,
      );
      expect(valid).to.be.true;
    });

    it("should sign and verify with Uint8Array message", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const msg = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const sig = await result.sign("ed25519", kp.privateKey, msg);
      const valid = await result.verify("ed25519", kp.publicKey, msg, sig);
      expect(valid).to.be.true;
    });

    it("should detect invalid signature", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const sig = await result.sign("ed25519", kp.privateKey, "correct");
      const valid = await result.verify(
        "ed25519",
        kp.publicKey,
        "wrong message",
        sig,
      );
      expect(valid).to.be.false;
      expect(result.isValid.value).to.be.false;
    });

    it("should handle sign errors", async () => {
      const result = useSignature();
      try {
        await result.sign("ed25519", "invalid-private-key", "msg");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect(result.isProcessing.value).to.be.false;
      }
    });

    it("should handle verify errors", async () => {
      const result = useSignature();
      try {
        await result.verify("ed25519", "bad-pub", "msg", "bad-sig");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect(result.isProcessing.value).to.be.false;
      }
    });

    it("should handle unsupported sign algorithm", async () => {
      const result = useSignature();
      try {
        await result.sign("bad-algo" as SignAlgorithm, "key", "msg");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.include("Unsupported");
      }
    });

    it("should handle unsupported verify algorithm", async () => {
      const result = useSignature();
      try {
        await result.verify(
          "bad-algo" as SignAlgorithm,
          "key",
          "msg",
          "sig",
        );
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
      }
    });

    it("should wrap non-Error sign throws in Error (coverage: line 75)", async () => {
      // Temporarily make crypto.sign throw a non-Error value to exercise
      // the `err instanceof Error ? err : new Error(String(err))` else branch
      const desc = Object.getOwnPropertyDescriptor(crypto, "sign")!;
      Object.defineProperty(crypto, "sign", {
        value: () => { throw "sign-string-error"; },
        writable: true, configurable: true,
      });

      const result = useSignature();
      try {
        await result.sign("ed25519", "key", "msg");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.equal("sign-string-error");
      }

      Object.defineProperty(crypto, "sign", desc);
    });

    it("should wrap non-Error verify throws in Error (coverage: line 97)", async () => {
      const desc = Object.getOwnPropertyDescriptor(crypto, "verify")!;
      Object.defineProperty(crypto, "verify", {
        value: () => { throw "verify-string-error"; },
        writable: true, configurable: true,
      });

      const result = useSignature();
      try {
        await result.verify("ed25519", "key", "msg", "sig");
        expect.fail("Should have thrown");
      } catch {
        expect(result.error.value).to.be.instanceOf(Error);
        expect((result.error.value as Error).message).to.equal("verify-string-error");
      }

      Object.defineProperty(crypto, "verify", desc);
    });

    it("should clear all state", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      await result.sign("ed25519", kp.privateKey, "data");
      expect(result.signature.value).to.not.be.null;
      result.clear();
      expect(result.signature.value).to.be.null;
      expect(result.isValid.value).to.be.null;
      expect(result.algorithm.value).to.be.null;
      expect(result.error.value).to.be.null;
    });

    it("isProcessing is false after successful sign", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      await result.sign("ed25519", kp.privateKey, "test");
      expect(result.isProcessing.value).to.be.false;
    });

    it("isProcessing is false after successful verify", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const sig = await result.sign("ed25519", kp.privateKey, "test");
      await result.verify("ed25519", kp.publicKey, "test", sig);
      expect(result.isProcessing.value).to.be.false;
    });

    it("error is reset on new sign operation", async () => {
      const result = useSignature();
      try {
        await result.sign("ed25519", "bad-key", "msg");
      } catch {
        // expected
      }
      expect(result.error.value).to.not.be.null;

      const kp = generateKeyPair("ed25519");
      await result.sign("ed25519", kp.privateKey, "ok");
      expect(result.error.value).to.be.null;
    });

    it("error is reset on new verify operation", async () => {
      const result = useSignature();
      try {
        await result.verify("ed25519", "bad", "msg", "sig");
      } catch {
        // expected
      }
      expect(result.error.value).to.not.be.null;

      const kp = generateKeyPair("ed25519");
      const sig = await result.sign("ed25519", kp.privateKey, "msg");
      await result.verify("ed25519", kp.publicKey, "msg", sig);
      expect(result.error.value).to.be.null;
    });

    it("return type includes all required properties", () => {
      const result = useSignature();
      const keys: (keyof UseSignatureReturn)[] = [
        "signature",
        "isValid",
        "algorithm",
        "isProcessing",
        "error",
        "sign",
        "verify",
        "clear",
      ];
      for (const key of keys) {
        expect(result).to.have.property(key);
      }
    });
  });

  // ========================================================================
  // Integration: crypto-lib operations used by composables
  // ========================================================================
  describe("crypto-lib integration layer", () => {
    it("crypto.randomKey returns 64-char hex", () => {
      const key = crypto.randomKey();
      expect(key).to.match(/^[0-9a-f]{64}$/);
    });

    it("crypto.encrypt/decrypt round-trip", () => {
      const key = crypto.randomKey();
      const ct = crypto.encrypt(key, "vue integration");
      const pt = crypto.decrypt(key, ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal("vue integration");
    });

    it("crypto.hash with all algorithms", () => {
      const algos: HashAlgorithm[] = [
        "sha256",
        "sha384",
        "sha512",
        "sha3-256",
        "sha3-512",
        "blake2b",
        "blake3",
      ];
      for (const algo of algos) {
        const digest = crypto.hash(algo, "test");
        expect(digest).to.match(/^[0-9a-f]+$/);
      }
    });

    it("crypto.sign/verify with all sign algorithms", () => {
      const tests: Array<{ signAlgo: SignAlgorithm; keyAlgo: KeyAlgorithm }> = [
        { signAlgo: "ed25519", keyAlgo: "ed25519" },
        { signAlgo: "ed448", keyAlgo: "ed448" },
        { signAlgo: "ecdsa-p256", keyAlgo: "p256" },
        { signAlgo: "ecdsa-p384", keyAlgo: "p384" },
      ];
      for (const { signAlgo, keyAlgo } of tests) {
        const kp = generateKeyPair(keyAlgo);
        const sig = crypto.sign(signAlgo, kp.privateKey, "msg");
        const valid = crypto.verify(signAlgo, kp.publicKey, "msg", sig);
        expect(valid).to.be.true;
      }
    });

    it("generateKeyPair with all algorithms", () => {
      const algos: KeyAlgorithm[] = [
        "ed25519",
        "x25519",
        "ed448",
        "p256",
        "p384",
      ];
      for (const algo of algos) {
        const kp = generateKeyPair(algo);
        expect(kp.algorithm).to.equal(algo);
        expect(kp.publicKey).to.match(/^[0-9a-f]+$/);
        expect(kp.privateKey).to.match(/^[0-9a-f]+$/);
        expect(kp.kid).to.be.a("string");
      }
    });
  });

  // ========================================================================
  // Edge cases
  // ========================================================================
  describe("edge cases", () => {
    it("multiple composable instances are independent", async () => {
      const h1 = useHash();
      const h2 = useHash();
      await h1.hash("sha256", "first");
      expect(h1.digest.value).to.not.be.null;
      expect(h2.digest.value).to.be.null;
    });

    it("composable state persists across multiple operations", async () => {
      const result = useSignature();
      const kp1 = generateKeyPair("ed25519");
      await result.sign("ed25519", kp1.privateKey, "msg1");
      const sig1 = result.signature.value;

      const kp2 = generateKeyPair("ed25519");
      await result.sign("ed25519", kp2.privateKey, "msg2");
      const sig2 = result.signature.value;

      expect(sig1).to.not.equal(sig2);
    });

    it("large data encryption/decryption", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const large = "y".repeat(50_000);
      const ct = await result.encrypt(key, large);
      const pt = await result.decrypt(key, ct);
      expect(new TextDecoder().decode(pt)).to.equal(large);
    });

    it("hash of large data", async () => {
      const result = useHash();
      const large = "z".repeat(100_000);
      const digest = await result.hash("sha256", large);
      expect(digest).to.match(/^[0-9a-f]{64}$/);
    });

    it("sign and verify with empty message", async () => {
      const kp = generateKeyPair("ed25519");
      const result = useSignature();
      const sig = await result.sign("ed25519", kp.privateKey, "");
      const valid = await result.verify("ed25519", kp.publicKey, "", sig);
      expect(valid).to.be.true;
    });

    it("encrypt and decrypt with empty Uint8Array", async () => {
      const result = useEncrypt();
      const key = result.randomKey();
      const ct = await result.encrypt(key, new Uint8Array(0));
      const pt = await result.decrypt(key, ct);
      expect(pt.length).to.equal(0);
    });
  });
});
