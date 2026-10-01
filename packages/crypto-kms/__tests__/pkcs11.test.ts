// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import { Pkcs11HsmProvider } from "../src/index";

describe("Pkcs11HsmProvider", () => {
  it("refuses to construct without an explicit simulate: true", () => {
    expect(() => new Pkcs11HsmProvider()).to.throw(
      /no real PKCS#11 backend.*simulate: true/,
    );
    expect(() => new Pkcs11HsmProvider({ simulate: false })).to.throw(
      /no real PKCS#11 backend/,
    );
    expect(
      () => new Pkcs11HsmProvider({ modulePath: "/usr/lib/libCryptoki2.so" }),
    ).to.throw(/no real PKCS#11 backend/);
  });

  it("initializes with default options in simulation mode", () => {
    const provider = new Pkcs11HsmProvider({ simulate: true });
    expect(provider.name).to.equal("pkcs11");
    expect(provider.hsmModel).to.equal("generic");
    expect(provider.slotIndex).to.equal(0);
    expect(provider.tokenLabel).to.equal("HSM-DEFAULT-TOKEN");

    const session = provider.getHsmSessionInfo();
    expect(session.model).to.equal("generic");
    expect(session.authenticated).to.be.false;
    expect(session.fipsLevel).to.equal("none (software simulation)");
    expect(session.simulated).to.be.true;
  });

  it("initializes with custom options and PIN authentication", () => {
    const provider = new Pkcs11HsmProvider({
      simulate: true,
      hsmModel: "thales-luna",
      slotIndex: 2,
      tokenLabel: "LUNA-SLOT-02",
      pin: "987654",
    });
    expect(provider.hsmModel).to.equal("thales-luna");
    expect(provider.slotIndex).to.equal(2);
    expect(provider.tokenLabel).to.equal("LUNA-SLOT-02");

    const session = provider.getHsmSessionInfo();
    expect(session.authenticated).to.be.true;
    expect(session.sessionState).to.equal("CKS_RW_USER_FUNCTIONS");
  });

  describe("key lifecycle", () => {
    let provider: Pkcs11HsmProvider;

    beforeEach(() => {
      provider = new Pkcs11HsmProvider({
        simulate: true,
        hsmModel: "aws-cloudhsm",
      });
    });

    it("creates, retrieves, and lists encryption and signing keys", async () => {
      const encKey = await provider.createKey("aes-256-gcm", "encrypt");
      expect(encKey.keyId).to.include("pkcs11-aws-cloudhsm-");
      expect(encKey.usage).to.equal("encrypt");
      expect(encKey.enabled).to.be.true;

      const signKey = await provider.createKey("ed25519", "sign");
      expect(signKey.usage).to.equal("sign");

      const fetched = await provider.getKey(encKey.keyId);
      expect(fetched.keyId).to.equal(encKey.keyId);

      const allKeys = await provider.listKeys();
      expect(allKeys).to.have.length(2);

      const filteredUsage = await provider.listKeys({ usage: "sign" });
      expect(filteredUsage).to.have.length(1);
      expect(filteredUsage[0].keyId).to.equal(signKey.keyId);

      const filteredEnabled = await provider.listKeys({ enabled: true });
      expect(filteredEnabled).to.have.length(2);
    });

    it("throws error for non-existent key retrieval", async () => {
      try {
        await provider.getKey("non-existent");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }
    });

    it("enables and disables keys", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.disableKey(key.keyId);
      let fetched = await provider.getKey(key.keyId);
      expect(fetched.enabled).to.be.false;

      await provider.enableKey(key.keyId);
      fetched = await provider.getKey(key.keyId);
      expect(fetched.enabled).to.be.true;

      try {
        await provider.enableKey("missing");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }

      try {
        await provider.disableKey("missing");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }
    });

    it("schedules key deletion and excludes from listKeys", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.scheduleKeyDeletion(key.keyId, 14);

      const fetched = await provider.getKey(key.keyId);
      expect(fetched.enabled).to.be.false;

      const keys = await provider.listKeys();
      expect(keys.some((k) => k.keyId === key.keyId)).to.be.false;

      try {
        await provider.scheduleKeyDeletion("missing");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }
    });

    it("rotates encryption and signing keys", async () => {
      const encKey = await provider.createKey("aes-256-gcm", "encrypt");
      const rotatedEnc = await provider.rotateKey(encKey.keyId);
      expect(rotatedEnc.keyId).to.equal(encKey.keyId);

      const signKey = await provider.createKey("ed25519", "sign");
      const rotatedSign = await provider.rotateKey(signKey.keyId);
      expect(rotatedSign.keyId).to.equal(signKey.keyId);

      try {
        await provider.rotateKey("missing");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }
    });
  });

  describe("cryptographic operations", () => {
    let provider: Pkcs11HsmProvider;

    beforeEach(() => {
      provider = new Pkcs11HsmProvider({
        simulate: true,
        hsmModel: "yubihsm2",
      });
    });

    it("encrypts and decrypts with and without encryption context", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const plaintext = new TextEncoder().encode(
        "institutional treasury payload",
      );

      const enc = await provider.encrypt(key.keyId, plaintext);
      expect(enc.ciphertext).to.be.a("string");
      expect(enc.keyId).to.equal(key.keyId);

      const dec = await provider.decrypt(key.keyId, enc.ciphertext);
      expect(new TextDecoder().decode(dec.plaintext)).to.equal(
        "institutional treasury payload",
      );

      const context = { clearance: "top-secret", tenant: "treasury-uk" };
      const encWithCtx = await provider.encrypt(key.keyId, plaintext, context);
      expect(encWithCtx.context).to.deep.equal(context);

      const decWithCtx = await provider.decrypt(
        key.keyId,
        encWithCtx.ciphertext,
        context,
      );
      expect(new TextDecoder().decode(decWithCtx.plaintext)).to.equal(
        "institutional treasury payload",
      );
    });

    it("handles wrap usage for encryption", async () => {
      const wrapKey = await provider.createKey("aes-256-gcm", "wrap");
      const data = new Uint8Array([1, 2, 3, 4]);
      const enc = await provider.encrypt(wrapKey.keyId, data);
      const dec = await provider.decrypt(wrapKey.keyId, enc.ciphertext);
      expect(dec.plaintext).to.deep.equal(data);
    });

    it("enforces key validity and usage checks on encryption and decryption", async () => {
      const signKey = await provider.createKey("ed25519", "sign");
      const plaintext = new Uint8Array([10, 20]);

      try {
        await provider.encrypt("missing", plaintext);
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }

      try {
        await provider.encrypt(signKey.keyId, plaintext);
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("expected 'encrypt'");
      }

      const encKey = await provider.createKey("aes-256-gcm", "encrypt");
      await provider.disableKey(encKey.keyId);

      try {
        await provider.encrypt(encKey.keyId, plaintext);
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key is disabled");
      }

      try {
        await provider.decrypt(encKey.keyId, "validbase64here");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key is disabled");
      }

      try {
        await provider.decrypt("missing", "validbase64here");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }

      await provider.enableKey(encKey.keyId);

      try {
        await provider.decrypt(encKey.keyId, "c2hvcnQ="); // "short" < 28 bytes
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("Ciphertext too short");
      }

      try {
        await provider.decrypt(
          encKey.keyId,
          "bm90LXZhbGlkLWNpcGhlcnRleHQtdGhhdC1pcw==",
        );
        expect.fail("should have thrown");
      } catch (err: unknown) {
        // 28 bytes: shorter than the 33-byte versioned envelope
        expect((err as Error).message).to.include("Ciphertext too short");
      }
    });

    it("signs and verifies digital signatures with the HSM", async () => {
      const signKey = await provider.createKey("ed25519", "sign");
      const data = new TextEncoder().encode("interbank settlement transfer");

      const signRes = await provider.sign(signKey.keyId, data);
      expect(signRes.algorithm).to.equal("Ed25519");
      expect(signRes.signature).to.be.a("string");

      const isValid = await provider.verify(
        signKey.keyId,
        data,
        signRes.signature,
      );
      expect(isValid).to.be.true;

      const tampered = new TextEncoder().encode("tampered transfer");
      const isTamperedValid = await provider.verify(
        signKey.keyId,
        tampered,
        signRes.signature,
      );
      expect(isTamperedValid).to.be.false;

      const invalidBase64 = await provider.verify(
        signKey.keyId,
        data,
        "not-valid-base64!!!",
      );
      expect(invalidBase64).to.be.false;
    });

    it("enforces key validity and usage checks on signing and verifying", async () => {
      const encKey = await provider.createKey("aes-256-gcm", "encrypt");
      const data = new Uint8Array([1, 2, 3]);

      try {
        await provider.sign("missing", data);
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }

      try {
        await provider.sign(encKey.keyId, data);
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("expected 'sign'");
      }

      const signKey = await provider.createKey("ed25519", "sign");
      await provider.disableKey(signKey.keyId);

      try {
        await provider.sign(signKey.keyId, data);
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key is disabled");
      }

      try {
        await provider.verify("missing", data, "sig");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("HSM key not found");
      }

      try {
        await provider.verify(encKey.keyId, data, "sig");
        expect.fail("should have thrown");
      } catch (err: unknown) {
        expect((err as Error).message).to.include("expected 'sign'");
      }
    });

    it("generates wrapped data encryption keys", async () => {
      const key = await provider.createKey("aes-256-gcm", "encrypt");
      const dek = await provider.generateDataKey(key.keyId);

      expect(dek.plaintext).to.have.length(32);
      expect(dek.ciphertext).to.be.a("string");

      const dec = await provider.decrypt(key.keyId, dek.ciphertext);
      expect(dec.plaintext).to.deep.equal(dek.plaintext);
    });
  });
});
