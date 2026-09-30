import { expect } from "chai";
import { kdfDerive } from "../../src/modern/kdf";
import {
  hashPassword,
  verifyPassword,
  verifyPasswordPhc,
} from "../../src/modern/password";

// Every call below would block the event loop for seconds (or exhaust
// memory) if the bound were missing, so each must throw before running.
describe("KDF and Argon2 cost bounds", function () {
  this.timeout(10000);

  it("kdfDerive rejects scrypt N above 2^17", () => {
    expect(() =>
      kdfDerive({
        algorithm: "scrypt",
        password: "pw",
        params: { N: 2 ** 20 },
      }),
    ).to.throw(/scrypt N/);
  });

  it("kdfDerive rejects scrypt N that is not a power of two", () => {
    expect(() =>
      kdfDerive({ algorithm: "scrypt", password: "pw", params: { N: 1000 } }),
    ).to.throw(/scrypt N/);
  });

  it("kdfDerive rejects scrypt r or p above the cap", () => {
    expect(() =>
      kdfDerive({
        algorithm: "scrypt",
        password: "pw",
        params: { N: 1024, r: 64 },
      }),
    ).to.throw(/scrypt r/);
    expect(() =>
      kdfDerive({
        algorithm: "scrypt",
        password: "pw",
        params: { N: 1024, p: 64 },
      }),
    ).to.throw(/scrypt p/);
  });

  it("kdfDerive rejects PBKDF2 iterations above 1,000,000", () => {
    expect(() =>
      kdfDerive({
        algorithm: "pbkdf2-sha256",
        password: "pw",
        params: { iterations: 5_000_000 },
      }),
    ).to.throw(/iterations/);
  });

  it("hashPassword rejects Argon2 costs above the caps", () => {
    expect(() => hashPassword({ password: "pw", timeCost: 20 })).to.throw(
      /time cost/,
    );
    expect(() =>
      hashPassword({ password: "pw", timeCost: 1, memoryCost: 1048576 }),
    ).to.throw(/memory cost/);
    expect(() =>
      hashPassword({
        password: "pw",
        timeCost: 1,
        memoryCost: 1024,
        parallelism: 16,
      }),
    ).to.throw(/parallelism/);
  });

  it("verifyPassword rejects caller-supplied costs above the caps", () => {
    expect(() =>
      verifyPassword({
        password: "pw",
        hash: "00".repeat(32),
        salt: "00".repeat(16),
        params: { t: 1, m: 1048576, p: 1 },
      }),
    ).to.throw(/memory cost/);
  });

  it("verifyPasswordPhc rejects costs above the caps in the PHC string", () => {
    const salt = Buffer.alloc(16).toString("base64");
    const hash = Buffer.alloc(32).toString("base64");
    expect(() =>
      verifyPasswordPhc({
        password: "pw",
        phc: `$argon2id$v=19$m=1024,t=1000,p=1$${salt}$${hash}`,
      }),
    ).to.throw(/time cost/);
  });
});
