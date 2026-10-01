import { expect } from "chai";
import {
  passwordEncrypt,
  passwordDecrypt,
} from "../../src/high-level/password-encrypt";

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
});
