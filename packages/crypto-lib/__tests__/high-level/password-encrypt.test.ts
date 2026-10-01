import { expect } from "chai";
import {
  passwordEncrypt,
  passwordDecrypt,
} from "../../src/high-level/password-encrypt";
import { argon2id } from "@noble/hashes/argon2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";

/** Header length shared by format versions 0x01 and 0x02. */
const HEADER_LEN = 57;

/**
 * Build a legacy version 0x01 payload exactly as releases up to v0.0.6
 * wrote it: no associated data on the AEAD.
 */
function legacyV1Encrypt(password: string, plaintext: string): Buffer {
  const header = Buffer.alloc(HEADER_LEN);
  header[0] = 0x01;
  header.writeUInt32LE(1, 1); // t
  header.writeUInt32LE(1024, 5); // m
  header.writeUInt32LE(1, 9); // p
  header.writeUInt32LE(32, 13); // dkLen
  const salt = Buffer.alloc(16, 7);
  const nonce = Buffer.alloc(24, 9);
  salt.copy(header, 17);
  nonce.copy(header, 33);
  const key = argon2id(Buffer.from(password), salt, {
    t: 1,
    m: 1024,
    p: 1,
    dkLen: 32,
  });
  const ct = xchacha20poly1305(key, nonce).encrypt(Buffer.from(plaintext));
  return Buffer.concat([header, ct]);
}

describe("Password Encryption", function () {
  this.timeout(30000); // Argon2 can be slow

  it("should encrypt and decrypt with a password", () => {
    const result = passwordEncrypt({
      password: "my-secret-password",
      plaintext: "Hello, Password Encryption!",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    expect(result.algorithm).to.equal("argon2id-xchacha20-poly1305");
    expect(result.encrypted).to.be.a("string");

    const pt = passwordDecrypt("my-secret-password", result.encrypted);
    expect(Buffer.from(pt).toString("utf8")).to.equal(
      "Hello, Password Encryption!",
    );
  });

  it("should reject wrong password", () => {
    const result = passwordEncrypt({
      password: "correct",
      plaintext: "secret",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    expect(() => passwordDecrypt("wrong", result.encrypted)).to.throw();
  });

  it("should produce different ciphertexts for same password+plaintext", () => {
    const opts = {
      password: "p",
      plaintext: "d",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    };
    const r1 = passwordEncrypt(opts);
    const r2 = passwordEncrypt(opts);
    expect(r1.encrypted).to.not.equal(r2.encrypted);
  });

  it("should accept Uint8Array password and plaintext", () => {
    const result = passwordEncrypt({
      password: Buffer.from("pwd", "utf8"),
      plaintext: Buffer.from("data", "utf8"),
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    const pt = passwordDecrypt(Buffer.from("pwd", "utf8"), result.encrypted);
    expect(Buffer.from(pt).toString("utf8")).to.equal("data");
  });

  it("should reject too-short encrypted payload", () => {
    expect(() => passwordDecrypt("pwd", "AAAA")).to.throw(/too short/);
  });

  it("should reject invalid version", () => {
    // Create a valid payload and corrupt the version byte
    const result = passwordEncrypt({
      password: "p",
      plaintext: "d",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    const raw = Buffer.from(result.encrypted, "base64");
    raw[0] = 0xff; // Invalid version
    const corrupted = Buffer.from(raw).toString("base64");
    expect(() => passwordDecrypt("p", corrupted)).to.throw(/version/);
  });

  it("should work with explicit low params", () => {
    const result = passwordEncrypt({
      password: "params-test",
      plaintext: "test",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    expect(result.encrypted).to.be.a("string");
    const pt = passwordDecrypt("params-test", result.encrypted);
    expect(Buffer.from(pt).toString("utf8")).to.equal("test");
  });

  it("should handle empty plaintext", () => {
    const result = passwordEncrypt({
      password: "pwd",
      plaintext: "",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    const pt = passwordDecrypt("pwd", result.encrypted);
    expect(Buffer.from(pt).toString("utf8")).to.equal("");
  });

  it("should accept Uint8Array encrypted input for decrypt", () => {
    const result = passwordEncrypt({
      password: "p",
      plaintext: "data",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    const raw = Buffer.from(result.encrypted, "base64");
    const pt = passwordDecrypt("p", raw);
    expect(Buffer.from(pt).toString("utf8")).to.equal("data");
  });

  describe("untrusted header parameters", () => {
    const encryptLow = () =>
      Buffer.from(
        passwordEncrypt({
          password: "pw",
          plaintext: "data",
          timeCost: 1,
          memoryCost: 1024,
          parallelism: 1,
        }).encrypted,
        "base64",
      );

    it("should refuse a header time cost above the cap before running Argon2", () => {
      const raw = encryptLow();
      raw.writeUInt32LE(0xffffffff, 1); // t
      expect(() => passwordDecrypt("pw", raw)).to.throw(/time cost/);
    });

    it("should refuse a header memory cost above the cap", () => {
      const raw = encryptLow();
      raw.writeUInt32LE(0xffffffff, 5); // m (KiB)
      expect(() => passwordDecrypt("pw", raw)).to.throw(/memory cost/);
    });

    it("should refuse a header parallelism above the cap", () => {
      const raw = encryptLow();
      raw.writeUInt32LE(1000, 9); // p
      expect(() => passwordDecrypt("pw", raw)).to.throw(/parallelism/);
    });

    it("should refuse a header key length other than 32", () => {
      const raw = encryptLow();
      raw.writeUInt32LE(64, 13); // dkLen
      expect(() => passwordDecrypt("pw", raw)).to.throw(/key length/);
    });

    it("should refuse non-integer or too-small costs", () => {
      expect(() =>
        passwordEncrypt({ password: "pw", plaintext: "d", timeCost: 1.5 }),
      ).to.throw(/time cost/);
      expect(() =>
        passwordEncrypt({
          password: "pw",
          plaintext: "d",
          timeCost: 1,
          memoryCost: 16,
          parallelism: 4,
        }),
      ).to.throw(/memory cost/);
    });

    it("should refuse to encrypt with parameters it would not decrypt", () => {
      expect(() =>
        passwordEncrypt({ password: "pw", plaintext: "d", timeCost: 11 }),
      ).to.throw(/time cost/);
    });
  });
  describe("format version 0x02 (header authenticated as AAD)", () => {
    const encryptV2 = () =>
      Buffer.from(
        passwordEncrypt({
          password: "pw",
          plaintext: "data",
          timeCost: 1,
          memoryCost: 1024,
          parallelism: 1,
        }).encrypted,
        "base64",
      );

    it("writes version byte 0x02", () => {
      expect(encryptV2()[0]).to.equal(0x02);
    });

    it("binds the 57-byte header as XChaCha20-Poly1305 associated data", () => {
      const raw = encryptV2();
      const header = raw.subarray(0, HEADER_LEN);
      const key = argon2id(Buffer.from("pw"), raw.subarray(17, 33), {
        t: 1,
        m: 1024,
        p: 1,
        dkLen: 32,
      });
      const nonce = raw.subarray(33, HEADER_LEN);
      const ct = raw.subarray(HEADER_LEN);
      const pt = xchacha20poly1305(key, nonce, header).decrypt(ct);
      expect(Buffer.from(pt).toString("utf8")).to.equal("data");
      expect(() => xchacha20poly1305(key, nonce).decrypt(ct)).to.throw();
    });

    it("fails when any header byte is flipped", () => {
      const original = encryptV2();
      // version, each u32 field, salt and nonce
      for (const offset of [1, 5, 9, 17, 32, 33, 56]) {
        const raw = Buffer.from(original);
        raw[offset] = raw[offset]! ^ 0x01;
        expect(() => passwordDecrypt("pw", raw), `offset ${offset}`).to.throw();
      }
    });

    it("refuses a v1 payload relabelled as v2", () => {
      const raw = legacyV1Encrypt("pw", "legacy");
      raw[0] = 0x02;
      expect(() => passwordDecrypt("pw", raw)).to.throw();
    });

    it("applies the cost caps to v2 headers before running Argon2", () => {
      const raw = encryptV2();
      raw.writeUInt32LE(0xffffffff, 5);
      expect(() => passwordDecrypt("pw", raw)).to.throw(/memory cost/);
    });
  });

  describe("legacy format version 0x01", () => {
    it("still decrypts payloads written without associated data", () => {
      const raw = legacyV1Encrypt("pw", "legacy data");
      const pt = passwordDecrypt("pw", raw.toString("base64"));
      expect(Buffer.from(pt).toString("utf8")).to.equal("legacy data");
    });

    it("rejects a wrong password on v1 payloads", () => {
      expect(() =>
        passwordDecrypt("wrong", legacyV1Encrypt("pw", "x")),
      ).to.throw();
    });

    it("applies the cost caps to v1 headers before running Argon2", () => {
      const raw = legacyV1Encrypt("pw", "x");
      raw.writeUInt32LE(0xffffffff, 1);
      expect(() => passwordDecrypt("pw", raw)).to.throw(/time cost/);
    });
  });
});
