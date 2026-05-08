// SPDX-License-Identifier: MIT OR Apache-2.0
import { expect } from "chai";
import { EncryptionTransformer } from "../src/transformer";
import { EncryptionSubscriber } from "../src/subscriber";
import { EncryptedColumn } from "../src/decorator";
import type { EncryptionConfig } from "../src/types";
import { secretbox } from "@sebastienrousseau/crypto-lib";

// 256-bit key as 64-char hex string
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────
describe("EncryptionConfig type", () => {
  it("accepts minimal config", () => {
    const cfg: EncryptionConfig = { key: TEST_KEY };
    expect(cfg.key).to.equal(TEST_KEY);
    expect(cfg.algorithm).to.be.undefined;
    expect(cfg.fields).to.be.undefined;
  });

  it("accepts full config", () => {
    const cfg: EncryptionConfig = {
      key: TEST_KEY,
      algorithm: "xchacha20-poly1305",
      fields: new Map([["User", ["ssn"]]]),
    };
    expect(cfg.algorithm).to.equal("xchacha20-poly1305");
    expect(cfg.fields!.get("User")).to.deep.equal(["ssn"]);
  });
});

// ────────────────────────────────────────────────────────────────────
// EncryptionTransformer
// ────────────────────────────────────────────────────────────────────
describe("EncryptionTransformer", () => {
  describe("constructor validation", () => {
    it("throws when key is empty", () => {
      expect(() => new EncryptionTransformer({ key: "" })).to.throw(
        "key is required",
      );
    });

    it("creates instance with valid key", () => {
      const t = new EncryptionTransformer({ key: TEST_KEY });
      expect(t).to.be.instanceOf(EncryptionTransformer);
    });

    it("accepts config with algorithm", () => {
      const t = new EncryptionTransformer({
        key: TEST_KEY,
        algorithm: "xchacha20-poly1305",
      });
      expect(t).to.be.instanceOf(EncryptionTransformer);
    });
  });

  describe("to() — encrypt", () => {
    const transformer = new EncryptionTransformer({ key: TEST_KEY });

    it("returns null for null input", () => {
      expect(transformer.to(null)).to.be.null;
    });

    it("returns null for undefined input", () => {
      expect(transformer.to(undefined)).to.be.null;
    });

    it("encrypts a string value", () => {
      const encrypted = transformer.to("hello world");
      expect(encrypted).to.be.a("string");
      expect(encrypted).to.not.equal("hello world");
      // Should be base64 encoded
      expect(() => Buffer.from(encrypted!, "base64")).to.not.throw();
    });

    it("JSON-stringifies non-string values before encryption", () => {
      const encrypted = transformer.to({ nested: true });
      expect(encrypted).to.be.a("string");
      expect(encrypted).to.not.equal('{"nested":true}');
    });

    it("encrypts numeric values via JSON.stringify", () => {
      const encrypted = transformer.to(42);
      expect(encrypted).to.be.a("string");
      expect(encrypted).to.not.equal("42");
    });

    it("produces different ciphertexts for same plaintext (random nonce)", () => {
      const e1 = transformer.to("same-value");
      const e2 = transformer.to("same-value");
      expect(e1).to.not.equal(e2);
    });
  });

  describe("from() — decrypt", () => {
    const transformer = new EncryptionTransformer({ key: TEST_KEY });

    it("returns null for null input", () => {
      expect(transformer.from(null)).to.be.null;
    });

    it("returns null for undefined input", () => {
      expect(transformer.from(undefined)).to.be.null;
    });

    it("returns null for non-string input", () => {
      expect(transformer.from(12345)).to.be.null;
      expect(transformer.from({ obj: true })).to.be.null;
    });

    it("decrypts a previously encrypted string", () => {
      const encrypted = transformer.to("secret-data");
      const decrypted = transformer.from(encrypted);
      expect(decrypted).to.equal("secret-data");
    });

    it("decrypts JSON-stringified objects", () => {
      const encrypted = transformer.to({ nested: true });
      const decrypted = transformer.from(encrypted);
      expect(decrypted).to.equal('{"nested":true}');
    });
  });

  describe("round-trip", () => {
    const transformer = new EncryptionTransformer({ key: TEST_KEY });

    it("round-trips a simple string", () => {
      const original = "my-secret-value";
      const decrypted = transformer.from(transformer.to(original));
      expect(decrypted).to.equal(original);
    });

    it("round-trips an empty string", () => {
      const decrypted = transformer.from(transformer.to(""));
      expect(decrypted).to.equal("");
    });

    it("round-trips unicode text", () => {
      const original = "Hello, \u4E16\u754C! \uD83D\uDD10";
      const decrypted = transformer.from(transformer.to(original));
      expect(decrypted).to.equal(original);
    });

    it("round-trips a long string", () => {
      const original = "x".repeat(10000);
      const decrypted = transformer.from(transformer.to(original));
      expect(decrypted).to.equal(original);
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// EncryptionSubscriber
// ────────────────────────────────────────────────────────────────────
describe("EncryptionSubscriber", () => {
  describe("constructor validation", () => {
    it("throws when key is empty", () => {
      expect(() => new EncryptionSubscriber({ key: "" })).to.throw(
        "key is required",
      );
    });

    it("creates instance with valid key", () => {
      const sub = new EncryptionSubscriber({ key: TEST_KEY });
      expect(sub).to.be.instanceOf(EncryptionSubscriber);
    });

    it("defaults fields to empty Map when not provided", () => {
      const sub = new EncryptionSubscriber({ key: TEST_KEY });
      // We can test indirectly: calling lifecycle hooks on plain objects
      // should not throw since no fields are configured
      const entity = { name: "Alice" };
      sub.afterLoad(entity);
      expect(entity.name).to.equal("Alice");
    });

    it("accepts config with fields map", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["ssn"]]]),
      });
      expect(sub).to.be.instanceOf(EncryptionSubscriber);
    });
  });

  describe("beforeInsert", () => {
    it("encrypts configured fields on insert", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["ssn", "email"]]]),
      });

      class User {
        ssn = "123-45-6789";
        email = "alice@example.com";
        name = "Alice";
      }

      const entity = new User();
      sub.beforeInsert({ entity } as any);

      expect(entity.ssn).to.not.equal("123-45-6789");
      expect(entity.email).to.not.equal("alice@example.com");
      expect(entity.name).to.equal("Alice");
      // Verify it's actually decryptable
      const decryptedSsn = Buffer.from(
        secretbox.open(TEST_KEY, entity.ssn),
      ).toString("utf8");
      expect(decryptedSsn).to.equal("123-45-6789");
    });

    it("skips null/undefined field values", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["ssn", "email"]]]),
      });

      class User {
        ssn: string | null = null;
        email: string | undefined = undefined;
      }

      const entity = new User();
      sub.beforeInsert({ entity } as any);

      expect(entity.ssn).to.be.null;
      expect(entity.email).to.be.undefined;
    });

    it("JSON-stringifies non-string values before encryption", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["metadata"]]]),
      });

      class User {
        metadata: unknown = { role: "admin" };
      }

      const entity = new User();
      sub.beforeInsert({ entity } as any);

      expect(entity.metadata).to.be.a("string");
      const decrypted = Buffer.from(
        secretbox.open(TEST_KEY, entity.metadata as string),
      ).toString("utf8");
      expect(decrypted).to.equal('{"role":"admin"}');
    });

    it("does nothing for entities with no configured fields", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["ssn"]]]),
      });

      class Order {
        total = 99.99;
      }

      const entity = new Order();
      sub.beforeInsert({ entity } as any);

      expect(entity.total).to.equal(99.99);
    });

    it("does nothing for plain objects (constructor name is Object)", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["ssn"]]]),
      });

      const entity = { ssn: "123-45-6789" };
      sub.beforeInsert({ entity } as any);

      // Plain Object's constructor.name is "Object", which is excluded
      expect(entity.ssn).to.equal("123-45-6789");
    });
  });

  describe("beforeUpdate", () => {
    it("encrypts configured fields on update", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      class User {
        email = "updated@example.com";
      }

      const entity = new User();
      sub.beforeUpdate({ entity } as any);

      expect(entity.email).to.not.equal("updated@example.com");
    });

    it("handles undefined entity gracefully", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      // Should not throw
      sub.beforeUpdate({ entity: undefined } as any);
    });

    it("handles null entity gracefully", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      // Should not throw
      sub.beforeUpdate({ entity: null } as any);
    });
  });

  describe("afterLoad", () => {
    it("decrypts configured fields on load", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email", "ssn"]]]),
      });

      class User {
        email: string;
        ssn: string;
        name = "Alice";

        constructor() {
          this.email = secretbox.seal(TEST_KEY, "alice@example.com").sealed;
          this.ssn = secretbox.seal(TEST_KEY, "123-45-6789").sealed;
        }
      }

      const entity = new User();
      sub.afterLoad(entity);

      expect(entity.email).to.equal("alice@example.com");
      expect(entity.ssn).to.equal("123-45-6789");
      expect(entity.name).to.equal("Alice");
    });

    it("skips null/undefined field values on load", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      class User {
        email: string | null = null;
      }

      const entity = new User();
      sub.afterLoad(entity);

      expect(entity.email).to.be.null;
    });

    it("skips non-string field values on load", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["score"]]]),
      });

      class User {
        score = 100;
      }

      const entity = new User();
      sub.afterLoad(entity);

      expect(entity.score).to.equal(100);
    });

    it("leaves unencrypted strings as-is when decryption fails", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      class User {
        email = "plaintext-not-encrypted";
      }

      const entity = new User();
      sub.afterLoad(entity);

      // Decryption failed — value left as-is
      expect(entity.email).to.equal("plaintext-not-encrypted");
    });

    it("accepts optional event parameter", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      class User {
        email = secretbox.seal(TEST_KEY, "alice@test.com").sealed;
      }

      const entity = new User();
      // Pass a mock event (should be ignored)
      sub.afterLoad(entity, { entity } as any);

      expect(entity.email).to.equal("alice@test.com");
    });

    it("does nothing for entities with no configured fields", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      class Order {
        total = "not-encrypted-text";
      }

      const entity = new Order();
      sub.afterLoad(entity);

      expect(entity.total).to.equal("not-encrypted-text");
    });
  });

  describe("round-trip: beforeInsert + afterLoad", () => {
    it("encrypts on insert then decrypts on load", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email", "ssn"]]]),
      });

      class User {
        email = "round-trip@test.com";
        ssn = "999-88-7777";
        name = "Bob";
      }

      const entity = new User();

      // Simulate insert
      sub.beforeInsert({ entity } as any);
      expect(entity.email).to.not.equal("round-trip@test.com");
      expect(entity.ssn).to.not.equal("999-88-7777");

      // Simulate load
      sub.afterLoad(entity);
      expect(entity.email).to.equal("round-trip@test.com");
      expect(entity.ssn).to.equal("999-88-7777");
      expect(entity.name).to.equal("Bob");
    });

    it("encrypts on update then decrypts on load", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["email"]]]),
      });

      class User {
        email = "updated@test.com";
      }

      const entity = new User();

      sub.beforeUpdate({ entity } as any);
      expect(entity.email).to.not.equal("updated@test.com");

      sub.afterLoad(entity);
      expect(entity.email).to.equal("updated@test.com");
    });
  });

  describe("getEntityName edge cases", () => {
    it("returns undefined for entities without constructor name", () => {
      const sub = new EncryptionSubscriber({
        key: TEST_KEY,
        fields: new Map([["User", ["ssn"]]]),
      });

      // Object with no real constructor
      const entity = Object.create(null);
      entity.ssn = "123";

      // Should not throw — entity has no constructor
      sub.afterLoad(entity);
      expect(entity.ssn).to.equal("123");
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// EncryptedColumn decorator
// ────────────────────────────────────────────────────────────────────
describe("EncryptedColumn decorator", () => {
  it("throws when no key is provided and env var is unset", () => {
    const saved = process.env.TYPEORM_ENCRYPTION_KEY;
    delete process.env.TYPEORM_ENCRYPTION_KEY;

    try {
      expect(() => EncryptedColumn()).to.throw("encryption key is required");
    } finally {
      if (saved !== undefined) {
        process.env.TYPEORM_ENCRYPTION_KEY = saved;
      }
    }
  });

  it("throws when key is empty string and env var is unset", () => {
    const saved = process.env.TYPEORM_ENCRYPTION_KEY;
    delete process.env.TYPEORM_ENCRYPTION_KEY;

    try {
      expect(() =>
        EncryptedColumn({ encrypt: { key: "" } }),
      ).to.throw("encryption key is required");
    } finally {
      if (saved !== undefined) {
        process.env.TYPEORM_ENCRYPTION_KEY = saved;
      }
    }
  });

  it("uses TYPEORM_ENCRYPTION_KEY env var when encrypt option is absent", () => {
    const saved = process.env.TYPEORM_ENCRYPTION_KEY;
    process.env.TYPEORM_ENCRYPTION_KEY = TEST_KEY;

    try {
      // Should not throw — the env var provides the key
      // The return is a PropertyDecorator (function), invoked by TypeORM's @Column
      const decorator = EncryptedColumn();
      expect(decorator).to.be.a("function");
    } finally {
      if (saved !== undefined) {
        process.env.TYPEORM_ENCRYPTION_KEY = saved;
      } else {
        delete process.env.TYPEORM_ENCRYPTION_KEY;
      }
    }
  });

  it("uses explicit encrypt.key over env var", () => {
    const saved = process.env.TYPEORM_ENCRYPTION_KEY;
    process.env.TYPEORM_ENCRYPTION_KEY = "aaaa".repeat(16);

    try {
      const decorator = EncryptedColumn({
        encrypt: { key: TEST_KEY },
      });
      expect(decorator).to.be.a("function");
    } finally {
      if (saved !== undefined) {
        process.env.TYPEORM_ENCRYPTION_KEY = saved;
      } else {
        delete process.env.TYPEORM_ENCRYPTION_KEY;
      }
    }
  });

  it("accepts additional column options", () => {
    const decorator = EncryptedColumn({
      encrypt: { key: TEST_KEY },
      nullable: true,
      name: "encrypted_ssn",
    });
    expect(decorator).to.be.a("function");
  });

  it("accepts encrypt config with algorithm", () => {
    const decorator = EncryptedColumn({
      encrypt: { key: TEST_KEY, algorithm: "xchacha20-poly1305" },
    });
    expect(decorator).to.be.a("function");
  });
});

// ────────────────────────────────────────────────────────────────────
// Barrel exports
// ────────────────────────────────────────────────────────────────────
describe("index barrel exports", () => {
  it("exports EncryptionTransformer", async () => {
    const mod = await import("../src/index");
    expect(mod.EncryptionTransformer).to.be.a("function");
  });

  it("exports EncryptionSubscriber", async () => {
    const mod = await import("../src/index");
    expect(mod.EncryptionSubscriber).to.be.a("function");
  });

  it("exports EncryptedColumn", async () => {
    const mod = await import("../src/index");
    expect(mod.EncryptedColumn).to.be.a("function");
  });
});
