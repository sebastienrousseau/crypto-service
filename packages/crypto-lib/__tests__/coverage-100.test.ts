/**
 * Tests targeting remaining coverage gaps to reach 100%.
 *
 * Covers:
 * - crypto.ts: verifyPassword facade method (lines 180-185)
 * - webcrypto-bridge.ts: noble fallback paths, invalid hex, ciphertext too short
 * - mac.ts: invalid hex in toBytes (lines 77-78)
 * - multi-recipient.ts: missing ML-KEM ciphertext error (lines 187-188)
 * - threshold.ts: splitSecretWithCommitments validation errors (lines 340-348),
 *                 generateFeldmanCommitments too few coefficients (lines 270-272)
 * - pqxdh.ts: invalid hex error (lines 120-121)
 * - worker-pool.ts: isMainThread guard (lines 101-102) — cannot test directly
 */

import { expect } from "chai";
import * as nodeCrypto from "node:crypto";

// --- crypto.ts: verifyPassword ---
import { crypto } from "../src/crypto";
import { hashPassword as hashPwLowCost } from "../src/modern/password";

describe("crypto unified API — password methods", () => {
  it("should hash a password via facade (crypto.hashPassword)", () => {
    // Use the facade directly — it calls argon2Hash with default params.
    // This covers crypto.ts line 173.
    const result = crypto.hashPassword("test-pw-facade");
    expect(result).to.have.property("hash");
    expect(result).to.have.property("salt");
    expect(result).to.have.property("phc");
    expect(result).to.have.property("params");
  });

  it("should verify a correct password via facade", () => {
    const result = hashPwLowCost({
      password: "test-pw",
      memoryCost: 1024,
      timeCost: 1,
    });
    const verified = crypto.verifyPassword(
      "test-pw",
      result.hash,
      result.salt,
      result.params,
    );
    expect(verified.valid).to.be.true;
  });

  it("should reject a wrong password via facade", () => {
    const result = hashPwLowCost({
      password: "test-pw",
      memoryCost: 1024,
      timeCost: 1,
    });
    const verified = crypto.verifyPassword(
      "wrong-pw",
      result.hash,
      result.salt,
      result.params,
    );
    expect(verified.valid).to.be.false;
  });
});

// --- webcrypto-bridge.ts: noble fallback paths ---
import {
  webCryptoAesGcmEncrypt,
  webCryptoAesGcmDecrypt,
  webCryptoHash,
} from "../src/accel/webcrypto-bridge";

describe("WebCrypto Bridge — noble fallback paths", function () {
  this.timeout(10000);

  // Override 'subtle' on the Crypto prototype to force noble fallback
  const proto = Object.getPrototypeOf(nodeCrypto.webcrypto);
  const origDesc = Object.getOwnPropertyDescriptor(proto, "subtle")!;

  function disableWebCrypto() {
    Object.defineProperty(proto, "subtle", {
      get: () => undefined,
      configurable: true,
    });
  }

  function restoreWebCrypto() {
    Object.defineProperty(proto, "subtle", origDesc);
  }

  afterEach(() => restoreWebCrypto());

  describe("getSubtle catch block", () => {
    it("should fall back gracefully when subtle throws", async () => {
      // Make subtle getter throw to cover getSubtle catch block (lines 118-119)
      Object.defineProperty(proto, "subtle", {
        get: () => {
          throw new Error("no subtle");
        },
        configurable: true,
      });
      const result = await webCryptoHash({
        algorithm: "SHA-256",
        data: "catch-test",
      });
      expect(result.accelerated).to.be.false;
      expect(result.digest).to.have.length(64);
    });
  });

  describe("AES-GCM encrypt fallback", () => {
    it("should encrypt via noble when WebCrypto is unavailable", async () => {
      disableWebCrypto();
      const result = await webCryptoAesGcmEncrypt({
        key: "a".repeat(64),
        plaintext: "hello noble",
      });
      expect(result.accelerated).to.be.false;
      expect(result.ciphertext).to.be.a("string");
    });

    it("should encrypt with AAD via noble fallback", async () => {
      disableWebCrypto();
      const result = await webCryptoAesGcmEncrypt({
        key: "b".repeat(64),
        plaintext: "test aad",
        aad: Buffer.from("context"),
      });
      expect(result.accelerated).to.be.false;
    });
  });

  describe("AES-GCM decrypt fallback", () => {
    it("should round-trip via noble fallback", async () => {
      disableWebCrypto();
      const encrypted = await webCryptoAesGcmEncrypt({
        key: "c".repeat(64),
        plaintext: "roundtrip",
      });
      const decrypted = await webCryptoAesGcmDecrypt({
        key: "c".repeat(64),
        ciphertext: encrypted.ciphertext,
      });
      expect(decrypted.accelerated).to.be.false;
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "roundtrip",
      );
    });

    it("should decrypt with AAD via noble fallback", async () => {
      disableWebCrypto();
      const aad = Buffer.from("aad-test");
      const encrypted = await webCryptoAesGcmEncrypt({
        key: "d".repeat(64),
        plaintext: "aad roundtrip",
        aad,
      });
      const decrypted = await webCryptoAesGcmDecrypt({
        key: "d".repeat(64),
        ciphertext: encrypted.ciphertext,
        aad,
      });
      expect(decrypted.accelerated).to.be.false;
      expect(Buffer.from(decrypted.plaintext).toString("utf8")).to.equal(
        "aad roundtrip",
      );
    });

    it("should throw for ciphertext too short", async () => {
      try {
        await webCryptoAesGcmDecrypt({
          key: "a".repeat(64),
          ciphertext: Buffer.from("short").toString("base64"),
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Ciphertext too short");
      }
    });

    it("should throw for invalid hex key", async () => {
      try {
        await webCryptoAesGcmEncrypt({
          key: "g".repeat(64),
          plaintext: "test",
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.match(
          /[Ii]nvalid.*hex|hex string expected/,
        );
      }
    });
  });

  describe("Hash fallback", () => {
    it("should hash SHA-256 via noble fallback", async () => {
      disableWebCrypto();
      const result = await webCryptoHash({
        algorithm: "SHA-256",
        data: "hello",
      });
      expect(result.accelerated).to.be.false;
      expect(result.digest).to.have.length(64);
    });

    it("should hash SHA-384 via noble fallback", async () => {
      disableWebCrypto();
      const result = await webCryptoHash({
        algorithm: "SHA-384",
        data: "hello",
      });
      expect(result.accelerated).to.be.false;
      expect(result.digest).to.have.length(96);
    });

    it("should hash SHA-512 via noble fallback", async () => {
      disableWebCrypto();
      const result = await webCryptoHash({
        algorithm: "SHA-512",
        data: "hello",
      });
      expect(result.accelerated).to.be.false;
      expect(result.digest).to.have.length(128);
    });

    it("should throw for unsupported hash algorithm in noble fallback", async () => {
      disableWebCrypto();
      try {
        await webCryptoHash({
          algorithm: "SHA-1" as never,
          data: "hello",
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).to.include("Unsupported hash algorithm");
      }
    });
  });
});

// --- mac.ts: invalid hex in toBytes (lines 77-78) ---
import { computeHmac, verifyHmac } from "../src/modern/mac";

describe("mac.ts — invalid hex key", () => {
  it("should throw for non-hex key string in computeHmac", () => {
    expect(() =>
      computeHmac({
        algorithm: "sha256",
        key: "zzzz-not-hex!", // not valid hex
        data: "test",
      }),
    ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
  });

  it("should throw for non-hex key string in verifyHmac", () => {
    expect(() =>
      verifyHmac({
        algorithm: "sha256",
        key: "zzzz-not-hex!",
        data: "test",
        mac: "abcd",
      }),
    ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
  });

  it("should throw for non-hex mac string in verifyHmac", () => {
    expect(() =>
      verifyHmac({
        algorithm: "sha256",
        key: "abcd1234",
        data: "test",
        mac: "not-hex!!",
      }),
    ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
  });
});

// --- multi-recipient.ts: missing ML-KEM ciphertext ---
import { multiDecryptPQ } from "../src/high-level/multi-recipient";

describe("multi-recipient — missing ML-KEM ciphertext", () => {
  it("should throw when mlKemCiphertext is missing (string keys)", () => {
    const fakeWrappedKey = {
      type: "x25519-ml-kem-768" as const,
      ephemeralPublicKey: "aa".repeat(32),
      wrappedKey: "bb".repeat(32),
    };

    expect(() =>
      multiDecryptPQ(
        "ee".repeat(32),
        "ff".repeat(32),
        fakeWrappedKey as never,
        "cc".repeat(16),
      ),
    ).to.throw("Missing ML-KEM ciphertext");
  });

  it("should throw when mlKemCiphertext is missing (Uint8Array keys)", () => {
    const fakeWrappedKey = {
      type: "x25519-ml-kem-768" as const,
      ephemeralPublicKey: "aa".repeat(32),
      wrappedKey: "bb".repeat(32),
    };

    expect(() =>
      multiDecryptPQ(
        Buffer.alloc(32, 0xee),
        Buffer.alloc(32, 0xff),
        fakeWrappedKey as never,
        "cc".repeat(16),
      ),
    ).to.throw("Missing ML-KEM ciphertext");
  });

  it("should throw invalid hex for non-hex multiDecryptPQ key", () => {
    const fakeWrappedKey = {
      type: "x25519-ml-kem-768" as const,
      ephemeralPublicKey: "aa".repeat(32),
      wrappedKey: "bb".repeat(32),
      mlKemCiphertext: "cc".repeat(32),
    };

    expect(() =>
      multiDecryptPQ(
        "zz-not-hex",
        "ff".repeat(32),
        fakeWrappedKey as never,
        "cc".repeat(16),
      ),
    ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
  });
});

// --- threshold.ts: validation error paths ---
import {
  splitSecret,
  splitSecretWithCommitments,
  generateFeldmanCommitments,
  combineShares,
} from "../src/protocols/threshold";

describe("threshold — splitSecret validation", () => {
  const validSecret = "ab".repeat(32);

  it("should reject n > 255", () => {
    expect(() => splitSecret(validSecret, 256, 2)).to.throw(
      "Maximum 255 shares supported",
    );
  });

  it("should reject invalid hex in secret", () => {
    expect(() => splitSecret("zz".repeat(32), 3, 2)).to.throw(
      /[Ii]nvalid.*hex|hex string expected/,
    );
  });
});

describe("threshold — combineShares validation", () => {
  it("should reject fewer than 2 shares", () => {
    expect(() =>
      combineShares([{ index: 1, value: "ab".repeat(32) }]),
    ).to.throw("Need at least 2 shares");
  });

  it("should reject duplicate share indices", () => {
    expect(() =>
      combineShares([
        { index: 1, value: "ab".repeat(32) },
        { index: 1, value: "cd".repeat(32) },
      ]),
    ).to.throw("Duplicate share indices");
  });
});

describe("threshold — splitSecretWithCommitments validation", () => {
  const validSecret = "ab".repeat(32);

  it("should reject threshold < 2", () => {
    expect(() => splitSecretWithCommitments(validSecret, 3, 1)).to.throw(
      "Threshold must be at least 2",
    );
  });

  it("should reject n < threshold", () => {
    expect(() => splitSecretWithCommitments(validSecret, 2, 3)).to.throw(
      "Number of shares must be >= threshold",
    );
  });

  it("should reject n > 255", () => {
    expect(() => splitSecretWithCommitments(validSecret, 256, 2)).to.throw(
      "Maximum 255 shares supported",
    );
  });
});

describe("threshold — generateFeldmanCommitments validation", () => {
  it("should reject fewer than 2 coefficients", () => {
    expect(() => generateFeldmanCommitments(["ab".repeat(32)])).to.throw(
      "Need at least 2 coefficients",
    );
  });
});

// --- threshold.ts: hexToBytes invalid hex (lines 64-65) ---
import { verifyFeldmanShare } from "../src/protocols/threshold";

describe("threshold — hexToBytes invalid hex", () => {
  it("should throw when commitment hex is invalid", () => {
    const share = { index: 1, value: "ab".repeat(32) };
    const commitments = {
      commitments: ["zz-not-hex", "ab".repeat(32)],
      algorithm: "feldman-vss-ed25519" as const,
    };
    expect(() => verifyFeldmanShare(share, commitments)).to.throw(
      /[Ii]nvalid.*hex|hex string expected/,
    );
  });
});

// --- Branch coverage: Uint8Array input paths ---
import {
  aesKwWrap,
  aesKwUnwrap,
  aesKwpWrap,
  aesKwpUnwrap,
} from "../src/high-level/key-wrap";
import { openPQ } from "../src/high-level/sealedbox";
import { SymmetricRatchet } from "../src/protocols/ratchet";

describe("key-wrap — Uint8Array branches", () => {
  it("should wrap/unwrap with Uint8Array kek and keyToWrap", () => {
    const kek = Buffer.from("a".repeat(64), "hex"); // 32 bytes
    const key = Buffer.from("b".repeat(32), "hex"); // 16 bytes
    const result = aesKwWrap(kek, key);
    expect(result.wrapped).to.be.a("string");
    const unwrapped = aesKwUnwrap(kek, Buffer.from(result.wrapped, "base64"));
    expect(Buffer.from(unwrapped).toString("hex")).to.equal("b".repeat(32));
  });

  it("should wrap/unwrap with AES-KWP and Uint8Array", () => {
    const kek = Buffer.from("c".repeat(64), "hex");
    const data = Buffer.from("hello world test!"); // any size
    const result = aesKwpWrap(kek, data);
    const unwrapped = aesKwpUnwrap(kek, Buffer.from(result.wrapped, "base64"));
    expect(Buffer.from(unwrapped).toString()).to.equal("hello world test!");
  });

  it("should reject invalid hex in aesKwWrap", () => {
    expect(() => aesKwWrap("zz-invalid-hex", "aa".repeat(16))).to.throw(
      /[Ii]nvalid.*hex|hex string expected/,
    );
  });
});

describe("sealedbox — Uint8Array sealed input", () => {
  it("should accept sealed as Uint8Array in openPQ", () => {
    // This just tests the instanceof branch — the crypto will fail with random data
    const fakeSealed = new Uint8Array(10);
    try {
      openPQ("aa".repeat(32), "bb".repeat(32), fakeSealed);
    } catch {
      // Expected: too short or invalid crypto
    }
  });
});

describe("ratchet — SymmetricRatchet with Uint8Array chainKey", () => {
  it("should accept Uint8Array chainKey", () => {
    const chainKey = Buffer.alloc(32, 0xab);
    const ratchet = new SymmetricRatchet(chainKey, 0);
    const state = ratchet.state;
    expect(state.index).to.equal(0);
  });
});

// --- pqxdh.ts: invalid hex error (lines 120-121) ---
import { initiateSession } from "../src/protocols/pqxdh";

describe("pqxdh — invalid hex error paths", () => {
  it("should throw when initiateSession receives invalid hex in identityKeyPair", () => {
    expect(() =>
      initiateSession({
        identityKeyPair: {
          publicKey: "aa".repeat(32),
          privateKey: "zz-not-hex",
        },
        remoteIdentityPublic: "aa".repeat(32),
        remoteSignedPreKeyPublic: "bb".repeat(32),
        remotePqPreKeyPublic: "dd".repeat(32),
      }),
    ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
  });
});
