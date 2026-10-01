// SPDX-License-Identifier: MIT OR Apache-2.0
import { expect } from "chai";
import { getMetadataArgsStorage, type InsertEvent } from "typeorm";
import { secretbox, kdfDerive } from "@sebastienrousseau/crypto-lib";
import * as barrel from "../src/index";
import { EncryptionTransformer } from "../src/transformer";
import { EncryptionSubscriber } from "../src/subscriber";
import { EncryptedColumn } from "../src/decorator";

// 256-bit key as 64-char hex string
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

type Entity = Record<string, unknown>;

/** Run `fn` and return what it threw. */
function thrown(fn: () => unknown): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error("expected the function to throw");
}

/** Flip one bit of the authentication tag of a `v2:` ciphertext. */
function tamper(value: string): string {
  const raw = Buffer.from(value.slice(3), "base64");
  raw[raw.length - 1] = raw[raw.length - 1]! ^ 0x01;
  return `v2:${raw.toString("base64")}`;
}

/** Transformer attached by `@EncryptedColumn` to `target.property`. */
function transformerOf(
  target: object,
  property: string,
): EncryptionTransformer {
  const column = getMetadataArgsStorage().columns.find(
    (c) => c.target === target && c.propertyName === property,
  );
  return column!.options.transformer as EncryptionTransformer;
}

describe("transformer: ciphertexts are bound to their column (F22)", () => {
  const ssn = new EncryptionTransformer({ key: TEST_KEY, context: "User.ssn" });
  const email = new EncryptionTransformer({
    key: TEST_KEY,
    context: "User.email",
  });

  it("writes the v2 format", () => {
    expect(ssn.to("123-45-6789")).to.match(/^v2:/);
  });

  it("round-trips within one context", () => {
    expect(ssn.from(ssn.to("123-45-6789"))).to.equal("123-45-6789");
  });

  it("rejects a ciphertext moved to another column", () => {
    const err = thrown(() => email.from(ssn.to("123-45-6789")));
    expect(err.name).to.equal("FieldDecryptionError");
    expect(err).to.be.instanceOf(barrel.FieldDecryptionError);
    expect(
      (err as InstanceType<typeof barrel.FieldDecryptionError>).context,
    ).to.equal("User.email");
  });

  it("rejects a tampered ciphertext with a typed error", () => {
    const err = thrown(() => ssn.from(tamper(ssn.to("123-45-6789")!)));
    expect(err.name).to.equal("FieldDecryptionError");
    expect(err.message).to.not.contain("123-45-6789");
  });

  it("rejects a plaintext value", () => {
    const err = thrown(() => ssn.from("123-45-6789"));
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("allowPlaintextFallback returns non-ciphertext values as-is", () => {
    const t = new EncryptionTransformer({
      key: TEST_KEY,
      context: "User.ssn",
      allowPlaintextFallback: true,
    });
    expect(t.from("123-45-6789")).to.equal("123-45-6789");
    expect(thrown(() => t.from(tamper(t.to("x")!))).name).to.equal(
      "FieldDecryptionError",
    );
  });

  it("still reads legacy (pre-v2) ciphertexts by default", () => {
    const legacy = secretbox.seal(TEST_KEY, "legacy").sealed;
    expect(ssn.from(legacy)).to.equal("legacy");
  });

  it("acceptLegacyCiphertext: false rejects legacy ciphertexts", () => {
    const t = new EncryptionTransformer({
      key: TEST_KEY,
      acceptLegacyCiphertext: false,
    });
    const legacy = secretbox.seal(TEST_KEY, "legacy").sealed;
    expect(thrown(() => t.from(legacy)).name).to.equal("FieldDecryptionError");
  });

  it("seals v2 values with an HKDF subkey, not the configured key", () => {
    const body = ssn.to("123-45-6789")!.slice(3);
    const aad = Buffer.from("crypto-typeorm/v2:User.ssn", "utf8");
    expect(() => secretbox.open(TEST_KEY, body, aad)).to.throw();
    const encKey = kdfDerive({
      algorithm: "hkdf-sha256",
      password: Buffer.from(TEST_KEY, "hex"),
      salt: new Uint8Array(32),
      params: { info: "crypto-typeorm/enc/v2" },
    }).derivedKey;
    expect(Buffer.from(secretbox.open(encKey, body, aad)).toString()).to.equal(
      "123-45-6789",
    );
  });

  it("rejects a key that is not 64 hex characters", () => {
    expect(() => new EncryptionTransformer({ key: "z".repeat(64) })).to.throw(
      "64-character hex string",
    );
    expect(() => new EncryptionSubscriber({ key: "abcd" })).to.throw(
      "64-character hex string",
    );
  });
});

describe("decorator: binds each column to Entity.property (F22)", () => {
  class Patient {
    ssn!: string;
    email!: string;
    other!: string;
  }
  EncryptedColumn({ encrypt: { key: TEST_KEY } })(Patient.prototype, "ssn");
  EncryptedColumn({ encrypt: { key: TEST_KEY } })(Patient.prototype, "email");
  EncryptedColumn({ encrypt: { key: TEST_KEY, context: "Legacy.col" } })(
    Patient.prototype,
    "other",
  );

  it("rejects a value swapped between two encrypted columns", () => {
    const sealed = transformerOf(Patient, "ssn").to("123-45-6789");
    const err = thrown(() => transformerOf(Patient, "email").from(sealed));
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("uses Entity.property as the default context", () => {
    const sealed = transformerOf(Patient, "ssn").to("123-45-6789");
    const t = new EncryptionTransformer({
      key: TEST_KEY,
      context: "Patient.ssn",
    });
    expect(t.from(sealed)).to.equal("123-45-6789");
  });

  it("honours an explicit context", () => {
    const sealed = transformerOf(Patient, "other").to("x");
    const t = new EncryptionTransformer({
      key: TEST_KEY,
      context: "Legacy.col",
    });
    expect(t.from(sealed)).to.equal("x");
  });
});

describe("subscriber: fail closed and bound to entity and field (F21/F22)", () => {
  const sub = new EncryptionSubscriber({
    key: TEST_KEY,
    fields: new Map([
      ["User", ["ssn", "email"]],
      ["Admin", ["email"]],
    ]),
  });

  class User {
    ssn: unknown = "123-45-6789";
    email: unknown = "alice@example.com";
  }
  class Admin {
    email: unknown = "root@example.com";
  }

  it("writes the v2 format", () => {
    const user = new User();
    sub.beforeInsert({ entity: user } as unknown as InsertEvent<Entity>);
    expect(user.ssn).to.match(/^v2:/);
  });

  it("rejects a plaintext value on load", () => {
    const user = new User();
    const err = thrown(() => sub.afterLoad(user as unknown as Entity));
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("rejects a value swapped between two fields", () => {
    const user = new User();
    sub.beforeInsert({ entity: user } as unknown as InsertEvent<Entity>);
    [user.ssn, user.email] = [user.email, user.ssn];
    const err = thrown(() => sub.afterLoad(user as unknown as Entity));
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("rejects a value moved to another entity", () => {
    const user = new User();
    sub.beforeInsert({ entity: user } as unknown as InsertEvent<Entity>);
    const admin = new Admin();
    admin.email = user.email;
    const err = thrown(() => sub.afterLoad(admin as unknown as Entity));
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("uses the same format as a transformer with context Entity.field", () => {
    const user = new User();
    sub.beforeInsert({ entity: user } as unknown as InsertEvent<Entity>);
    const t = new EncryptionTransformer({ key: TEST_KEY, context: "User.ssn" });
    expect(t.from(user.ssn)).to.equal("123-45-6789");
  });

  it("allowPlaintextFallback leaves non-ciphertext values as-is", () => {
    const lenient = new EncryptionSubscriber({
      key: TEST_KEY,
      fields: new Map([["User", ["ssn", "email"]]]),
      allowPlaintextFallback: true,
    });
    const user = new User();
    lenient.afterLoad(user as unknown as Entity);
    expect(user.ssn).to.equal("123-45-6789");
  });

  it("still reads legacy (pre-v2) ciphertexts", () => {
    const user = new User();
    user.ssn = secretbox.seal(TEST_KEY, "legacy-ssn").sealed;
    user.email = secretbox.seal(TEST_KEY, "legacy-email").sealed;
    sub.afterLoad(user as unknown as Entity);
    expect(user.ssn).to.equal("legacy-ssn");
    expect(user.email).to.equal("legacy-email");
  });
});
