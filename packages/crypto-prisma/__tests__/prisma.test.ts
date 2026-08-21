// SPDX-License-Identifier: MIT OR Apache-2.0
import { expect } from "chai";
import {
  createEncryptionMiddleware,
  createFieldEncryptionExtension,
} from "../src/index";
import type { EncryptionConfig, FieldConfig } from "../src/types";
import { secretbox, computeHmac } from "@sebastienrousseau/crypto-lib";

// 256-bit key as 64-char hex string
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Helper: build mock Prisma middleware params
function mockParams(overrides: Record<string, unknown> = {}) {
  return {
    model: "User",
    action: "create",
    args: {} as Record<string, unknown>,
    dataPath: [],
    runInTransaction: false,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────
describe("types", () => {
  it("FieldConfig shape is valid", () => {
    const fc: FieldConfig = { model: "User", fields: ["email", "ssn"] };
    expect(fc.model).to.equal("User");
    expect(fc.fields).to.deep.equal(["email", "ssn"]);
  });

  it("EncryptionConfig with defaults", () => {
    const cfg: EncryptionConfig = {
      key: TEST_KEY,
      encryptedFields: [{ model: "User", fields: ["email"] }],
    };
    expect(cfg.algorithm).to.be.undefined;
    expect(cfg.deterministicFields).to.be.undefined;
  });

  it("EncryptionConfig with all options", () => {
    const cfg: EncryptionConfig = {
      key: TEST_KEY,
      encryptedFields: [{ model: "User", fields: ["email"] }],
      algorithm: "aes-256-gcm",
      deterministicFields: ["email"],
    };
    expect(cfg.algorithm).to.equal("aes-256-gcm");
    expect(cfg.deterministicFields).to.deep.equal(["email"]);
  });
});

// ────────────────────────────────────────────────────────────────────
// Middleware — key validation
// ────────────────────────────────────────────────────────────────────
describe("createEncryptionMiddleware", () => {
  describe("key validation", () => {
    it("throws on empty key", () => {
      expect(() =>
        createEncryptionMiddleware({
          key: "",
          encryptedFields: [],
        }),
      ).to.throw("64-character hex string");
    });

    it("throws on short key", () => {
      expect(() =>
        createEncryptionMiddleware({
          key: "abcd",
          encryptedFields: [],
        }),
      ).to.throw("64-character hex string");
    });

    it("throws on too-long key", () => {
      expect(() =>
        createEncryptionMiddleware({
          key: TEST_KEY + "ff",
          encryptedFields: [],
        }),
      ).to.throw("64-character hex string");
    });

    it("accepts valid 64-char hex key", () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [],
      });
      expect(mw).to.be.a("function");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Passthrough when model has no encrypted fields
  // ──────────────────────────────────────────────────────────────────
  describe("passthrough", () => {
    it("passes through when model is undefined", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const params = mockParams({ model: undefined });
      const next = async (p: unknown) => ({ forwarded: true, p });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result).to.have.property("forwarded", true);
    });

    it("passes through when model has no encrypted fields configured", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const params = mockParams({ model: "Order" });
      const next = async () => ({ passedThrough: true });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result).to.have.property("passedThrough", true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Write actions — encrypt
  // ──────────────────────────────────────────────────────────────────
  describe("write actions", () => {
    const config: EncryptionConfig = {
      key: TEST_KEY,
      encryptedFields: [{ model: "User", fields: ["email", "ssn"] }],
    };

    it("encrypts fields on create", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedArgs: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "create",
        args: { data: { email: "alice@example.com", ssn: "123-45-6789", name: "Alice" } },
      });

      const next = async (p: typeof params) => {
        capturedArgs = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);

      expect(capturedArgs).to.not.be.null;
      // Encrypted fields should NOT be their original plaintext
      expect(capturedArgs!["email"]).to.not.equal("alice@example.com");
      expect(capturedArgs!["ssn"]).to.not.equal("123-45-6789");
      // Non-encrypted field should be untouched
      expect(capturedArgs!["name"]).to.equal("Alice");
    });

    it("encrypts fields on update", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedData: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "update",
        args: { data: { email: "bob@example.com" }, where: { id: 1 } },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);
      expect(capturedData!["email"]).to.not.equal("bob@example.com");
    });

    it("encrypts both create and update fields on upsert", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedArgs: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "upsert",
        args: {
          create: { email: "c@example.com" },
          update: { email: "u@example.com" },
          where: { id: 1 },
        },
      });

      const next = async (p: typeof params) => {
        capturedArgs = p.args as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);
      expect((capturedArgs!["create"] as Record<string, unknown>)["email"]).to.not.equal(
        "c@example.com",
      );
      expect((capturedArgs!["update"] as Record<string, unknown>)["email"]).to.not.equal(
        "u@example.com",
      );
    });

    it("encrypts each record in createMany", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedData: Record<string, unknown>[] | null = null;

      const params = mockParams({
        action: "createMany",
        args: {
          data: [
            { email: "a@example.com" },
            { email: "b@example.com" },
          ],
        },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>[];
        return { count: 2 };
      };

      await mw(params, next);
      expect(capturedData![0]["email"]).to.not.equal("a@example.com");
      expect(capturedData![1]["email"]).to.not.equal("b@example.com");
    });

    it("encrypts fields on updateMany", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedData: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "updateMany",
        args: { data: { email: "all@example.com" } },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { count: 5 };
      };

      await mw(params, next);
      expect(capturedData!["email"]).to.not.equal("all@example.com");
    });

    it("handles null/undefined values gracefully", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedData: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "create",
        args: { data: { email: null, ssn: undefined, name: "Alice" } },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);
      expect(capturedData!["email"]).to.be.null;
      expect(capturedData!["ssn"]).to.be.undefined;
    });

    it("JSON-stringifies non-string values before encryption", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedData: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "create",
        args: { data: { email: { nested: true } } },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);
      // Should have been encrypted (base64 string), not the original object
      expect(capturedData!["email"]).to.be.a("string");
    });

    it("handles missing data gracefully on create", async () => {
      const mw = createEncryptionMiddleware(config);

      const params = mockParams({
        action: "create",
        args: {},
      });

      const next = async () => ({ id: 1 });
      // Should not throw even when args.data is undefined
      const result = await mw(params, next);
      expect(result).to.deep.equal({ id: 1 });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Read actions — decrypt
  // ──────────────────────────────────────────────────────────────────
  describe("read actions — decrypt", () => {
    const config: EncryptionConfig = {
      key: TEST_KEY,
      encryptedFields: [{ model: "User", fields: ["email"] }],
    };

    it("decrypts a single record on findUnique", async () => {
      const mw = createEncryptionMiddleware(config);
      const { sealed } = secretbox.seal(TEST_KEY, "alice@example.com");

      const params = mockParams({
        action: "findUnique",
        args: { where: { id: 1 } },
      });

      const next = async () => ({ id: 1, email: sealed, name: "Alice" });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result["email"]).to.equal("alice@example.com");
      expect(result["name"]).to.equal("Alice");
    });

    it("decrypts a single record on findFirst", async () => {
      const mw = createEncryptionMiddleware(config);
      const { sealed } = secretbox.seal(TEST_KEY, "bob@example.com");

      const params = mockParams({
        action: "findFirst",
        args: {},
      });

      const next = async () => ({ id: 2, email: sealed });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result["email"]).to.equal("bob@example.com");
    });

    it("decrypts multiple records on findMany", async () => {
      const mw = createEncryptionMiddleware(config);
      const s1 = secretbox.seal(TEST_KEY, "alice@example.com").sealed;
      const s2 = secretbox.seal(TEST_KEY, "bob@example.com").sealed;

      const params = mockParams({
        action: "findMany",
        args: {},
      });

      const next = async () => [
        { id: 1, email: s1 },
        { id: 2, email: s2 },
      ];

      const result = (await mw(params, next)) as Record<string, unknown>[];
      expect(result[0]["email"]).to.equal("alice@example.com");
      expect(result[1]["email"]).to.equal("bob@example.com");
    });

    it("handles null result on findUnique", async () => {
      const mw = createEncryptionMiddleware(config);

      const params = mockParams({
        action: "findUnique",
        args: { where: { id: 999 } },
      });

      const next = async () => null;
      const result = await mw(params, next);
      expect(result).to.be.null;
    });

    it("handles null field values when decrypting", async () => {
      const mw = createEncryptionMiddleware(config);

      const params = mockParams({
        action: "findUnique",
        args: { where: { id: 1 } },
      });

      const next = async () => ({ id: 1, email: null });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result["email"]).to.be.null;
    });

    it("returns non-string values as-is during decryption", async () => {
      const mw = createEncryptionMiddleware(config);

      const params = mockParams({
        action: "findUnique",
        args: { where: { id: 1 } },
      });

      const next = async () => ({ id: 1, email: 12345 });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result["email"]).to.equal(12345);
    });

    it("handles null items in findMany array results", async () => {
      const mw = createEncryptionMiddleware(config);

      const params = mockParams({
        action: "findMany",
        args: {},
      });

      const next = async () => [
        null,
        { id: 1, email: secretbox.seal(TEST_KEY, "a@test.com").sealed },
      ];

      const result = (await mw(params, next)) as (Record<string, unknown> | null)[];
      expect(result[0]).to.be.null;
      expect(result[1]!["email"]).to.equal("a@test.com");
    });

    it("returns value as-is when decryption fails (migration scenario)", async () => {
      const mw = createEncryptionMiddleware(config);

      const params = mockParams({
        action: "findUnique",
        args: { where: { id: 1 } },
      });

      // Not a valid sealed box, should return as-is
      const next = async () => ({ id: 1, email: "plaintext-not-encrypted" });
      const result = (await mw(params, next)) as Record<string, unknown>;
      expect(result["email"]).to.equal("plaintext-not-encrypted");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Deterministic encryption (HMAC)
  // ──────────────────────────────────────────────────────────────────
  describe("deterministic fields", () => {
    const config: EncryptionConfig = {
      key: TEST_KEY,
      encryptedFields: [{ model: "User", fields: ["email", "ssn"] }],
      deterministicFields: ["email"],
    };

    it("produces HMAC for deterministic fields on write", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedData: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "create",
        args: { data: { email: "alice@example.com", ssn: "123-45-6789" } },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);

      // email should be deterministic HMAC
      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "alice@example.com",
      });
      expect(capturedData!["email"]).to.equal(mac);
      // ssn should be non-deterministic (secretbox)
      expect(capturedData!["ssn"]).to.not.equal("123-45-6789");
      expect(capturedData!["ssn"]).to.not.equal(mac);
    });

    it("deterministic HMAC is stable (same input = same output)", async () => {
      const mw = createEncryptionMiddleware(config);
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        const params = mockParams({
          action: "create",
          args: { data: { email: "stable@example.com" } },
        });

        const next = async (p: typeof params) => {
          const d = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
          results.push(d["email"] as string);
          return { id: i };
        };

        await mw(params, next);
      }

      expect(results[0]).to.equal(results[1]);
      expect(results[1]).to.equal(results[2]);
    });

    it("deterministic fields are returned as-is on decrypt (one-way)", async () => {
      const mw = createEncryptionMiddleware(config);
      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "alice@example.com",
      });

      const params = mockParams({
        action: "findUnique",
        args: { where: { id: 1 } },
      });

      const next = async () => ({ id: 1, email: mac });
      const result = (await mw(params, next)) as Record<string, unknown>;
      // HMAC is one-way — returned as-is
      expect(result["email"]).to.equal(mac);
    });

    it("encrypts deterministic where clauses for searchable lookup", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedWhere: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "findUnique",
        args: { where: { email: "alice@example.com" } },
      });

      const next = async (p: typeof params) => {
        capturedWhere = (p.args as Record<string, unknown>)["where"] as Record<string, unknown>;
        return null;
      };

      await mw(params, next);

      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "alice@example.com",
      });
      expect(capturedWhere!["email"]).to.equal(mac);
    });

    it("does not encrypt non-deterministic fields in where clause", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedWhere: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "findUnique",
        args: { where: { ssn: "123-45-6789" } },
      });

      const next = async (p: typeof params) => {
        capturedWhere = (p.args as Record<string, unknown>)["where"] as Record<string, unknown>;
        return null;
      };

      await mw(params, next);
      // ssn is not deterministic, so where clause should not be modified
      expect(capturedWhere!["ssn"]).to.equal("123-45-6789");
    });

    it("skips where encryption for non-string where values", async () => {
      const mw = createEncryptionMiddleware(config);
      let capturedWhere: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "findMany",
        args: { where: { email: { contains: "alice" } } },
      });

      const next = async (p: typeof params) => {
        capturedWhere = (p.args as Record<string, unknown>)["where"] as Record<string, unknown>;
        return [];
      };

      await mw(params, next);
      // Object value should not be HMAC'd
      expect(capturedWhere!["email"]).to.deep.equal({ contains: "alice" });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Model name matching (case-insensitive)
  // ──────────────────────────────────────────────────────────────────
  describe("model name matching", () => {
    it("matches model names case-insensitively", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "user", fields: ["email"] }],
      });

      let capturedData: Record<string, unknown> | null = null;

      const params = mockParams({
        model: "User",
        action: "create",
        args: { data: { email: "test@example.com" } },
      });

      const next = async (p: typeof params) => {
        capturedData = (p.args as Record<string, unknown>)["data"] as Record<string, unknown>;
        return { id: 1 };
      };

      await mw(params, next);
      expect(capturedData!["email"]).to.not.equal("test@example.com");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Non-read/write actions pass through
  // ──────────────────────────────────────────────────────────────────
  describe("other actions", () => {
    it("does not encrypt/decrypt for delete action", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const params = mockParams({
        action: "delete",
        args: { where: { id: 1 } },
      });

      const next = async () => ({ id: 1, email: "plaintext@example.com" });
      const result = (await mw(params, next)) as Record<string, unknown>;
      // delete is not in READ_ACTIONS, so no decryption happens
      expect(result["email"]).to.equal("plaintext@example.com");
    });

    it("does not encrypt/decrypt for count action", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const params = mockParams({
        action: "count",
        args: {},
      });

      const next = async () => 42;
      const result = await mw(params, next);
      expect(result).to.equal(42);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Round-trip: encrypt then decrypt
  // ──────────────────────────────────────────────────────────────────
  describe("round-trip", () => {
    it("encrypts on create and decrypts on findUnique", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      // Simulate create — capture the encrypted value
      let encryptedEmail: string | null = null;

      const createParams = mockParams({
        action: "create",
        args: { data: { email: "round-trip@test.com" } },
      });

      const createNext = async (p: typeof createParams) => {
        encryptedEmail = ((p.args as Record<string, unknown>)["data"] as Record<string, unknown>)["email"] as string;
        return { id: 1 };
      };

      await mw(createParams, createNext);
      expect(encryptedEmail).to.be.a("string");
      expect(encryptedEmail).to.not.equal("round-trip@test.com");

      // Simulate findUnique — return the encrypted value, expect decryption
      const findParams = mockParams({
        action: "findUnique",
        args: { where: { id: 1 } },
      });

      const findNext = async () => ({ id: 1, email: encryptedEmail });
      const result = (await mw(findParams, findNext)) as Record<string, unknown>;
      expect(result["email"]).to.equal("round-trip@test.com");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Where clause without deterministicFields
  // ──────────────────────────────────────────────────────────────────
  describe("where clause without deterministicFields", () => {
    it("does not encrypt where clauses when deterministicFields is undefined", async () => {
      const mw = createEncryptionMiddleware({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        // no deterministicFields
      });

      let capturedWhere: Record<string, unknown> | null = null;

      const params = mockParams({
        action: "findUnique",
        args: { where: { email: "alice@example.com" } },
      });

      const next = async (p: typeof params) => {
        capturedWhere = (p.args as Record<string, unknown>)["where"] as Record<string, unknown>;
        return null;
      };

      await mw(params, next);
      expect(capturedWhere!["email"]).to.equal("alice@example.com");
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// Extension
// ────────────────────────────────────────────────────────────────────
describe("createFieldEncryptionExtension", () => {
  describe("key validation", () => {
    it("throws on empty key", () => {
      expect(() =>
        createFieldEncryptionExtension({
          key: "",
          encryptedFields: [{ model: "User", fields: ["email"] }],
        }),
      ).to.throw("64-character hex string");
    });

    it("throws on short key", () => {
      expect(() =>
        createFieldEncryptionExtension({
          key: "abc",
          encryptedFields: [],
        }),
      ).to.throw("64-character hex string");
    });

    it("accepts valid key", () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });
      expect(ext).to.be.an("object");
    });
  });

  describe("extension structure", () => {
    it("returns an object with name and query", () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });
      expect(ext.name).to.equal("field-encryption");
      expect(ext.query).to.be.an("object");
    });

    it("generates handlers for each configured model", () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [
          { model: "User", fields: ["email"] },
          { model: "Payment", fields: ["cardNumber"] },
        ],
      });

      // Model name is lowercased first char
      expect(ext.query).to.have.property("user");
      expect(ext.query).to.have.property("payment");
    });

    it("generates all CRUD handlers per model", () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const handlers = ext.query["user"];
      expect(handlers).to.have.property("create");
      expect(handlers).to.have.property("update");
      expect(handlers).to.have.property("upsert");
      expect(handlers).to.have.property("findUnique");
      expect(handlers).to.have.property("findFirst");
      expect(handlers).to.have.property("findMany");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Extension query handlers
  // ──────────────────────────────────────────────────────────────────
  describe("create handler", () => {
    it("encrypts data and decrypts result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const createFn = ext.query["user"]["create"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedData: Record<string, unknown> | null = null;

      const result = await createFn({
        args: { data: { email: "create@test.com" } },
        query: async (args) => {
          capturedData = args["data"] as Record<string, unknown>;
          // Return sealed email as if reading back from DB
          return { id: 1, email: capturedData["email"] };
        },
      });

      // Data was encrypted before reaching the query
      expect(capturedData!["email"]).to.not.equal("create@test.com");
      // Result was decrypted
      expect((result as Record<string, unknown>)["email"]).to.equal("create@test.com");
    });

    it("returns non-object results as-is", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const createFn = ext.query["user"]["create"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await createFn({
        args: { data: { email: "test@test.com" } },
        query: async () => null,
      });

      expect(result).to.be.null;
    });
  });

  describe("update handler", () => {
    it("encrypts data and where clause, decrypts result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        deterministicFields: ["email"],
      });

      const updateFn = ext.query["user"]["update"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedArgs: Record<string, unknown> | null = null;

      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "new@test.com",
      });

      const result = await updateFn({
        args: {
          data: { email: "new@test.com" },
          where: { email: "old@test.com" },
        },
        query: async (args) => {
          capturedArgs = args;
          return { id: 1, email: mac };
        },
      });

      // data.email should be HMAC (deterministic)
      expect((capturedArgs!["data"] as Record<string, unknown>)["email"]).to.equal(mac);
      // where.email should also be HMAC
      const expectedWhereMac = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "old@test.com",
      }).mac;
      expect((capturedArgs!["where"] as Record<string, unknown>)["email"]).to.equal(
        expectedWhereMac,
      );
      // Deterministic field returned as-is (one-way)
      expect((result as Record<string, unknown>)["email"]).to.equal(mac);
    });

    it("returns non-object results as-is", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const updateFn = ext.query["user"]["update"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await updateFn({
        args: { data: { email: "x" }, where: { id: 1 } },
        query: async () => null,
      });

      expect(result).to.be.null;
    });
  });

  describe("upsert handler", () => {
    it("encrypts create, update, and where, then decrypts result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const upsertFn = ext.query["user"]["upsert"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedArgs: Record<string, unknown> | null = null;

      const result = await upsertFn({
        args: {
          create: { email: "new@test.com" },
          update: { email: "upd@test.com" },
          where: { id: 1 },
        },
        query: async (args) => {
          capturedArgs = args;
          // Return encrypted email to test decryption
          const encrypted = (args["create"] as Record<string, unknown>)["email"];
          return { id: 1, email: encrypted };
        },
      });

      expect((capturedArgs!["create"] as Record<string, unknown>)["email"]).to.not.equal(
        "new@test.com",
      );
      expect((capturedArgs!["update"] as Record<string, unknown>)["email"]).to.not.equal(
        "upd@test.com",
      );
      // Result should be decrypted
      expect((result as Record<string, unknown>)["email"]).to.equal("new@test.com");
    });

    it("returns non-object results as-is", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const upsertFn = ext.query["user"]["upsert"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await upsertFn({
        args: {
          create: { email: "x" },
          update: { email: "y" },
          where: { id: 1 },
        },
        query: async () => null,
      });

      expect(result).to.be.null;
    });
  });

  describe("findUnique handler", () => {
    it("encrypts where clause and decrypts result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        deterministicFields: ["email"],
      });

      const findUniqueFn = ext.query["user"]["findUnique"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "alice@example.com",
      });

      let capturedWhere: Record<string, unknown> | null = null;

      const result = await findUniqueFn({
        args: { where: { email: "alice@example.com" } },
        query: async (args) => {
          capturedWhere = args["where"] as Record<string, unknown>;
          return { id: 1, email: mac };
        },
      });

      expect(capturedWhere!["email"]).to.equal(mac);
      // Deterministic — returned as-is
      expect((result as Record<string, unknown>)["email"]).to.equal(mac);
    });

    it("returns null result as-is", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findUniqueFn = ext.query["user"]["findUnique"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findUniqueFn({
        args: { where: { id: 1 } },
        query: async () => null,
      });

      expect(result).to.be.null;
    });
  });

  describe("findFirst handler", () => {
    it("encrypts where and decrypts result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findFirstFn = ext.query["user"]["findFirst"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const { sealed } = secretbox.seal(TEST_KEY, "first@test.com");

      const result = await findFirstFn({
        args: {},
        query: async () => ({ id: 1, email: sealed }),
      });

      expect((result as Record<string, unknown>)["email"]).to.equal("first@test.com");
    });

    it("returns null result as-is", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findFirstFn = ext.query["user"]["findFirst"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findFirstFn({
        args: {},
        query: async () => null,
      });

      expect(result).to.be.null;
    });
  });

  describe("findMany handler", () => {
    it("decrypts each record in array result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findManyFn = ext.query["user"]["findMany"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const s1 = secretbox.seal(TEST_KEY, "a@test.com").sealed;
      const s2 = secretbox.seal(TEST_KEY, "b@test.com").sealed;

      const result = await findManyFn({
        args: {},
        query: async () => [
          { id: 1, email: s1 },
          { id: 2, email: s2 },
        ],
      });

      const arr = result as Record<string, unknown>[];
      expect(arr[0]["email"]).to.equal("a@test.com");
      expect(arr[1]["email"]).to.equal("b@test.com");
    });

    it("returns invalid ciphertext as-is in findMany items", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findManyFn = ext.query["user"]["findMany"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findManyFn({
        args: {},
        query: async () => [
          { id: 1, email: "not-encrypted" },
        ],
      });

      const arr = result as Record<string, unknown>[];
      expect(arr[0]["email"]).to.equal("not-encrypted");
    });

    it("handles null items in findMany array", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findManyFn = ext.query["user"]["findMany"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const s1 = secretbox.seal(TEST_KEY, "a@test.com").sealed;

      const result = await findManyFn({
        args: {},
        query: async () => [null, { id: 1, email: s1 }],
      });

      const arr = result as (Record<string, unknown> | null)[];
      expect(arr[0]).to.be.null;
      expect(arr[1]!["email"]).to.equal("a@test.com");
    });

    it("handles empty array result", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findManyFn = ext.query["user"]["findMany"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findManyFn({
        args: {},
        query: async () => [],
      });

      expect(result).to.deep.equal([]);
    });
  });

  describe("encryptWhereClause edge cases", () => {
    it("skips where encryption when where is undefined", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        deterministicFields: ["email"],
      });

      const findFirstFn = ext.query["user"]["findFirst"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      // No where clause at all
      const result = await findFirstFn({
        args: {},
        query: async () => null,
      });

      expect(result).to.be.null;
    });

    it("skips non-deterministic fields in where clause", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email", "ssn"] }],
        deterministicFields: ["email"],
      });

      const findFirstFn = ext.query["user"]["findFirst"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedWhere: Record<string, unknown> | null = null;

      await findFirstFn({
        args: { where: { ssn: "123" } },
        query: async (args) => {
          capturedWhere = args["where"] as Record<string, unknown>;
          return null;
        },
      });

      // ssn is not deterministic, so where value stays unchanged
      expect(capturedWhere!["ssn"]).to.equal("123");
    });

    it("skips where encryption when deterministicFields is undefined", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        // no deterministicFields
      });

      const updateFn = ext.query["user"]["update"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedWhere: Record<string, unknown> | null = null;

      await updateFn({
        args: { data: { email: "x" }, where: { email: "plain" } },
        query: async (args) => {
          capturedWhere = args["where"] as Record<string, unknown>;
          return { id: 1 };
        },
      });

      expect(capturedWhere!["email"]).to.equal("plain");
    });
  });

  describe("extension decryptValue catch branch", () => {
    it("returns invalid ciphertext as-is when decryption fails in findUnique", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findUniqueFn = ext.query["user"]["findUnique"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findUniqueFn({
        args: { where: { id: 1 } },
        query: async () => ({ id: 1, email: "not-valid-sealed-data" }),
      });

      // decryptValue catch branch: returns value as-is
      expect((result as Record<string, unknown>)["email"]).to.equal(
        "not-valid-sealed-data",
      );
    });

    it("returns invalid ciphertext as-is in findFirst", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findFirstFn = ext.query["user"]["findFirst"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findFirstFn({
        args: {},
        query: async () => ({ id: 1, email: "bad-ciphertext" }),
      });

      expect((result as Record<string, unknown>)["email"]).to.equal("bad-ciphertext");
    });

    it("returns non-string values as-is during decryption in extension", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findUniqueFn = ext.query["user"]["findUnique"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findUniqueFn({
        args: { where: { id: 1 } },
        query: async () => ({ id: 1, email: 42 }),
      });

      expect((result as Record<string, unknown>)["email"]).to.equal(42);
    });

    it("passes null/undefined through decryptValue in extension", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const findUniqueFn = ext.query["user"]["findUnique"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await findUniqueFn({
        args: { where: { id: 1 } },
        query: async () => ({ id: 1, email: null }),
      });

      expect((result as Record<string, unknown>)["email"]).to.be.null;
    });
  });

  describe("extension encryptValue edge cases", () => {
    it("passes null/undefined through encryptValue in extension create", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const createFn = ext.query["user"]["create"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedData: Record<string, unknown> | null = null;

      await createFn({
        args: { data: { email: null } },
        query: async (args) => {
          capturedData = args["data"] as Record<string, unknown>;
          return { id: 1, email: null };
        },
      });

      expect(capturedData!["email"]).to.be.null;
    });

    it("JSON-stringifies non-string values in extension create", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const createFn = ext.query["user"]["create"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedData: Record<string, unknown> | null = null;

      await createFn({
        args: { data: { email: { complex: true } } },
        query: async (args) => {
          capturedData = args["data"] as Record<string, unknown>;
          return { id: 1 };
        },
      });

      // Non-string value should be encrypted (base64 string)
      expect(capturedData!["email"]).to.be.a("string");
    });

    it("deterministic encryption in extension uses HMAC", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        deterministicFields: ["email"],
      });

      const createFn = ext.query["user"]["create"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      let capturedData: Record<string, unknown> | null = null;

      await createFn({
        args: { data: { email: "det@test.com" } },
        query: async (args) => {
          capturedData = args["data"] as Record<string, unknown>;
          return { id: 1, email: capturedData!["email"] };
        },
      });

      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "det@test.com",
      });

      expect(capturedData!["email"]).to.equal(mac);
    });

    it("deterministic field returned as-is on decrypt in extension", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
        deterministicFields: ["email"],
      });

      const findUniqueFn = ext.query["user"]["findUnique"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const { mac } = computeHmac({
        algorithm: "sha256",
        key: TEST_KEY,
        data: "det@test.com",
      });

      const result = await findUniqueFn({
        args: { where: { id: 1 } },
        query: async () => ({ id: 1, email: mac }),
      });

      expect((result as Record<string, unknown>)["email"]).to.equal(mac);
    });
  });

  describe("extension encryptRecord with missing data", () => {
    it("handles undefined data in create", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const createFn = ext.query["user"]["create"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await createFn({
        args: {},
        query: async () => ({ id: 1 }),
      });

      expect((result as Record<string, unknown>)["id"]).to.equal(1);
    });

    it("handles undefined data in update", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const updateFn = ext.query["user"]["update"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await updateFn({
        args: { where: { id: 1 } },
        query: async () => ({ id: 1 }),
      });

      expect((result as Record<string, unknown>)["id"]).to.equal(1);
    });

    it("handles undefined create/update in upsert", async () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [{ model: "User", fields: ["email"] }],
      });

      const upsertFn = ext.query["user"]["upsert"] as (ctx: {
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<unknown>;

      const result = await upsertFn({
        args: { where: { id: 1 } },
        query: async () => ({ id: 1 }),
      });

      expect((result as Record<string, unknown>)["id"]).to.equal(1);
    });
  });

  describe("extension with no configured models", () => {
    it("returns empty query handlers", () => {
      const ext = createFieldEncryptionExtension({
        key: TEST_KEY,
        encryptedFields: [],
      });
      expect(ext.query).to.deep.equal({});
    });
  });
});

// ────────────────────────────────────────────────────────────────────
// Barrel exports
// ────────────────────────────────────────────────────────────────────
describe("index barrel exports", () => {
  it("exports createEncryptionMiddleware", async () => {
    const mod = await import("../src/index");
    expect(mod.createEncryptionMiddleware).to.be.a("function");
  });

  it("exports createFieldEncryptionExtension", async () => {
    const mod = await import("../src/index");
    expect(mod.createFieldEncryptionExtension).to.be.a("function");
  });
});
