import { expect } from "chai";
import { hpkeGenerateKeyPair, hpkeSeal, hpkeOpen } from "../../src/modern/hpke";
import type {
  HpkeKem,
  HpkeAead,
  HpkeKeyPair,
  HpkeSealResult,
  HpkeOpenResult,
  HpkeSuiteOptions,
  HpkePskOptions,
  HpkeMode,
} from "../../src/modern/hpke";

describe("HPKE (RFC 9180)", () => {
  // -----------------------------------------------------------------------
  // Key generation
  // -----------------------------------------------------------------------
  describe("hpkeGenerateKeyPair", () => {
    it("should generate an X25519 key pair by default", () => {
      const kp = hpkeGenerateKeyPair();
      expect(kp.privateKey).to.have.length(64); // 32 bytes = 64 hex chars
      expect(kp.publicKey).to.have.length(64);
    });

    it("should generate an X25519 key pair explicitly", () => {
      const kp = hpkeGenerateKeyPair("x25519");
      expect(kp.privateKey).to.have.length(64);
      expect(kp.publicKey).to.have.length(64);
    });

    it("should generate a P-256 key pair", () => {
      const kp = hpkeGenerateKeyPair("p256");
      expect(kp.privateKey).to.have.length(64); // 32 bytes
      expect(kp.publicKey).to.have.length(130); // 65 bytes uncompressed = 130 hex
      // Uncompressed prefix 0x04
      expect(kp.publicKey.startsWith("04")).to.be.true;
    });

    it("should generate unique key pairs", () => {
      const kp1 = hpkeGenerateKeyPair();
      const kp2 = hpkeGenerateKeyPair();
      expect(kp1.privateKey).to.not.equal(kp2.privateKey);
      expect(kp1.publicKey).to.not.equal(kp2.publicKey);
    });
  });

  // -----------------------------------------------------------------------
  // Seal + Open round-trips
  // -----------------------------------------------------------------------
  describe("Base mode: X25519 + ChaCha20-Poly1305 (default suite)", () => {
    it("should seal and open a plaintext", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("Hello, HPKE!").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
      });

      expect(sealed.ciphertext).to.be.a("string");
      expect(sealed.encapsulatedKey).to.have.length(64); // X25519 enc = 32 bytes

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });

    it("should handle empty plaintext", () => {
      const kp = hpkeGenerateKeyPair();
      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext: "",
      });
      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
      });
      expect(opened.plaintext).to.equal("");
    });
  });

  describe("Base mode: X25519 + AES-128-GCM", () => {
    const suite: HpkeSuiteOptions = { kem: "x25519", aead: "aes-128-gcm" };

    it("should seal and open a plaintext", () => {
      const kp = hpkeGenerateKeyPair("x25519");
      const plaintext = Buffer.from("AES-128-GCM test").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        suite,
      });

      expect(sealed.encapsulatedKey).to.have.length(64);

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });
  });

  describe("Base mode: P-256 + AES-128-GCM", () => {
    const suite: HpkeSuiteOptions = { kem: "p256", aead: "aes-128-gcm" };

    it("should seal and open a plaintext", () => {
      const kp = hpkeGenerateKeyPair("p256");
      const plaintext = Buffer.from("P-256 HPKE test").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        suite,
      });

      // P-256 enc = 65 bytes uncompressed = 130 hex
      expect(sealed.encapsulatedKey).to.have.length(130);

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });

    it("should seal and open a large plaintext", () => {
      const kp = hpkeGenerateKeyPair("p256");
      const plaintext = Buffer.from("A".repeat(10000)).toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        suite,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });
  });

  // -----------------------------------------------------------------------
  // PSK mode
  // -----------------------------------------------------------------------
  describe("PSK mode", () => {
    const pskOpts: HpkePskOptions = {
      psk: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
      pskId: "456e756d65726174654964",
    };

    it("should seal and open with PSK (X25519 + ChaCha20)", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("PSK protected").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        psk: pskOpts,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        psk: pskOpts,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });

    it("should seal and open with PSK (X25519 + AES-128-GCM)", () => {
      const kp = hpkeGenerateKeyPair();
      const suite: HpkeSuiteOptions = { aead: "aes-128-gcm" };
      const plaintext = Buffer.from("PSK + AES").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        suite,
        psk: pskOpts,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
        psk: pskOpts,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });

    it("should seal and open with PSK (P-256 + AES-128-GCM)", () => {
      const kp = hpkeGenerateKeyPair("p256");
      const suite: HpkeSuiteOptions = { kem: "p256", aead: "aes-128-gcm" };
      const plaintext = Buffer.from("PSK + P256").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        suite,
        psk: pskOpts,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        suite,
        psk: pskOpts,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });
  });

  // -----------------------------------------------------------------------
  // AAD
  // -----------------------------------------------------------------------
  describe("AAD (additional authenticated data)", () => {
    it("should seal and open with AAD", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("with AAD").toString("hex");
      const aad = Buffer.from("authenticated context").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        aad,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        aad,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });

    it("should fail to open with wrong AAD", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("with AAD").toString("hex");
      const aad = Buffer.from("correct").toString("hex");
      const wrongAad = Buffer.from("wrong").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        aad,
      });

      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
          aad: wrongAad,
        }),
      ).to.throw();
    });
  });

  // -----------------------------------------------------------------------
  // Info string
  // -----------------------------------------------------------------------
  describe("info string", () => {
    it("should seal and open with info", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("with info").toString("hex");
      const info = Buffer.from("app-context-v1").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        info,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        info,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });

    it("should fail to open with wrong info", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("with info").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        info: Buffer.from("correct-info").toString("hex"),
      });

      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
          info: Buffer.from("wrong-info").toString("hex"),
        }),
      ).to.throw();
    });
  });

  // -----------------------------------------------------------------------
  // Combined options (info + AAD + PSK)
  // -----------------------------------------------------------------------
  describe("combined options", () => {
    it("should seal and open with info, AAD, and PSK together", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("all options").toString("hex");
      const info = Buffer.from("context").toString("hex");
      const aad = Buffer.from("extra-aad").toString("hex");
      const psk: HpkePskOptions = {
        psk: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        pskId: "6d79507265536861726564496400",
      };

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        info,
        aad,
        psk,
      });

      const opened = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
        info,
        aad,
        psk,
      });

      expect(opened.plaintext).to.equal(plaintext);
    });
  });

  // -----------------------------------------------------------------------
  // Error cases
  // -----------------------------------------------------------------------
  describe("error cases", () => {
    it("should fail with wrong recipient private key", () => {
      const kp = hpkeGenerateKeyPair();
      const wrongKp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("secret").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
      });

      expect(() =>
        hpkeOpen({
          recipientPrivateKey: wrongKp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
        }),
      ).to.throw();
    });

    it("should fail with tampered ciphertext", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("tamper test").toString("hex");

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
      });

      // Flip a byte in the ciphertext
      const ctBytes = Buffer.from(sealed.ciphertext, "hex");
      ctBytes[0] ^= 0xff;
      const tampered = ctBytes.toString("hex");

      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: tampered,
        }),
      ).to.throw();
    });

    it("should fail with wrong PSK", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("psk test").toString("hex");
      const psk: HpkePskOptions = {
        psk: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        pskId: "6d79496400",
      };
      const wrongPsk: HpkePskOptions = {
        psk: "ff02030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1fff",
        pskId: "6d79496400",
      };

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        psk,
      });

      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
          psk: wrongPsk,
        }),
      ).to.throw();
    });

    it("should fail with wrong PSK ID", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("psk-id test").toString("hex");
      const psk: HpkePskOptions = {
        psk: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        pskId: "636f72726563744964",
      };
      const wrongPskId: HpkePskOptions = {
        psk: psk.psk,
        pskId: "77726f6e674964",
      };

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        psk,
      });

      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
          psk: wrongPskId,
        }),
      ).to.throw();
    });

    it("should fail with invalid hex in recipientPublicKey", () => {
      expect(() =>
        hpkeSeal({
          recipientPublicKey: "ZZZZ",
          plaintext: "00",
        }),
      ).to.throw("Invalid hex string");
    });

    it("should fail with invalid hex in plaintext", () => {
      const kp = hpkeGenerateKeyPair();
      expect(() =>
        hpkeSeal({
          recipientPublicKey: kp.publicKey,
          plaintext: "GG",
        }),
      ).to.throw("Invalid hex string");
    });

    it("should fail with invalid hex in recipientPrivateKey", () => {
      expect(() =>
        hpkeOpen({
          recipientPrivateKey: "XXXX",
          encapsulatedKey: "00".repeat(32),
          ciphertext: "00".repeat(32),
        }),
      ).to.throw("Invalid hex string");
    });

    it("should fail with invalid hex in encapsulatedKey", () => {
      const kp = hpkeGenerateKeyPair();
      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: "not-hex!",
          ciphertext: "00".repeat(32),
        }),
      ).to.throw("Invalid hex string");
    });

    it("should fail with odd-length hex string", () => {
      expect(() =>
        hpkeSeal({
          recipientPublicKey: "abc", // odd length
          plaintext: "00",
        }),
      ).to.throw("Invalid hex string");
    });

    it("should fail when PSK mode mismatched (seal with PSK, open without)", () => {
      const kp = hpkeGenerateKeyPair();
      const plaintext = Buffer.from("mismatch").toString("hex");
      const psk: HpkePskOptions = {
        psk: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        pskId: "6d79496400",
      };

      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext,
        psk,
      });

      // Open without PSK → different key schedule → should fail
      expect(() =>
        hpkeOpen({
          recipientPrivateKey: kp.privateKey,
          encapsulatedKey: sealed.encapsulatedKey,
          ciphertext: sealed.ciphertext,
        }),
      ).to.throw();
    });
  });

  // -----------------------------------------------------------------------
  // All cipher suite combinations
  // -----------------------------------------------------------------------
  describe("all cipher suite combinations", () => {
    const kems: HpkeKem[] = ["x25519", "p256"];
    const aeads: HpkeAead[] = ["chacha20-poly1305", "aes-128-gcm"];
    const modes: HpkeMode[] = ["base", "psk"];

    const psk: HpkePskOptions = {
      psk: "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd",
      pskId: "746573742d70736b2d6964",
    };

    for (const kem of kems) {
      for (const aead of aeads) {
        for (const mode of modes) {
          it(`${kem} + ${aead} (${mode} mode)`, () => {
            const kp = hpkeGenerateKeyPair(kem);
            const suite: HpkeSuiteOptions = { kem, aead };
            const plaintext = Buffer.from(
              `test-${kem}-${aead}-${mode}`,
            ).toString("hex");

            const sealOpts: Parameters<typeof hpkeSeal>[0] = {
              recipientPublicKey: kp.publicKey,
              plaintext,
              suite,
            };
            const openOpts: Parameters<typeof hpkeOpen>[0] = {
              recipientPrivateKey: kp.privateKey,
              encapsulatedKey: "", // filled below
              ciphertext: "", // filled below
              suite,
            };

            if (mode === "psk") {
              sealOpts.psk = psk;
              openOpts.psk = psk;
            }

            const sealed = hpkeSeal(sealOpts);
            openOpts.encapsulatedKey = sealed.encapsulatedKey;
            openOpts.ciphertext = sealed.ciphertext;

            const opened = hpkeOpen(openOpts);
            expect(opened.plaintext).to.equal(plaintext);
          });
        }
      }
    }
  });

  // -----------------------------------------------------------------------
  // Type checks (compile-time, but exercise the types at runtime)
  // -----------------------------------------------------------------------
  describe("type coverage", () => {
    it("should satisfy HpkeKeyPair interface", () => {
      const kp: HpkeKeyPair = hpkeGenerateKeyPair();
      expect(kp).to.have.property("publicKey");
      expect(kp).to.have.property("privateKey");
    });

    it("should satisfy HpkeSealResult interface", () => {
      const kp = hpkeGenerateKeyPair();
      const result: HpkeSealResult = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext: "aa",
      });
      expect(result).to.have.property("ciphertext");
      expect(result).to.have.property("encapsulatedKey");
    });

    it("should satisfy HpkeOpenResult interface", () => {
      const kp = hpkeGenerateKeyPair();
      const sealed = hpkeSeal({
        recipientPublicKey: kp.publicKey,
        plaintext: "bb",
      });
      const result: HpkeOpenResult = hpkeOpen({
        recipientPrivateKey: kp.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
      });
      expect(result).to.have.property("plaintext");
    });
  });
});
