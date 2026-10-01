// SPDX-License-Identifier: MIT OR Apache-2.0
import { expect } from "chai";
import {
  createEncryptionMiddleware,
  createFieldEncryptionExtension,
} from "../src/index";
import * as barrel from "../src/index";
import type { EncryptionConfig } from "../src/types";
import {
  secretbox,
  computeHmac,
  kdfDerive,
} from "@sebastienrousseau/crypto-lib";

// 256-bit key as 64-char hex string
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

type Rec = Record<string, unknown>;
type Handler = (ctx: {
  args: Rec;
  query: (args: Rec) => Promise<unknown>;
}) => Promise<unknown>;

const BASE: EncryptionConfig = {
  key: TEST_KEY,
  encryptedFields: [
    { model: "User", fields: ["email", "phone"] },
    { model: "Customer", fields: ["email"] },
  ],
};

function handler(config: EncryptionConfig, model: string, op: string) {
  const ext = createFieldEncryptionExtension(config);
  return ext.query[model]![op] as Handler;
}

/** Write `data` through the extension and return what reached the DB. */
async function writeThroughExtension(
  config: EncryptionConfig,
  model: string,
  data: Rec,
): Promise<Rec> {
  let stored: Rec = {};
  await handler(
    config,
    model,
    "create",
  )({
    args: { data: { ...data } },
    query: async (args) => {
      stored = { ...(args["data"] as Rec) };
      return null;
    },
  });
  return stored;
}

/** Read `row` back through the extension's findUnique. */
async function readThroughExtension(
  config: EncryptionConfig,
  model: string,
  row: Rec,
): Promise<Rec> {
  return (await handler(
    config,
    model,
    "findUnique",
  )({
    args: { where: { id: 1 } },
    query: async () => ({ ...row }),
  })) as Rec;
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (err) {
    return err as Error;
  }
  throw new Error("expected the promise to reject");
}

/** Flip one bit of the authentication tag of a `v2:` ciphertext. */
function flipLastChar(value: string): string {
  const raw = Buffer.from(value.slice(3), "base64");
  raw[raw.length - 1] = raw[raw.length - 1]! ^ 0x01;
  return `v2:${raw.toString("base64")}`;
}

describe("security: fail closed on decryption failure (F21)", () => {
  it("extension rejects a plaintext value in an encrypted column", async () => {
    const err = await rejection(
      readThroughExtension(BASE, "user", { id: 1, email: "injected" }),
    );
    expect(err.name).to.equal("FieldDecryptionError");
    expect(err).to.be.instanceOf(barrel.FieldDecryptionError);
    expect(
      (err as InstanceType<typeof barrel.FieldDecryptionError>).model,
    ).to.equal("User");
    expect(
      (err as InstanceType<typeof barrel.FieldDecryptionError>).field,
    ).to.equal("email");
    expect(err.message).to.not.contain("injected");
  });

  it("extension rejects a tampered v2 ciphertext", async () => {
    const stored = await writeThroughExtension(BASE, "user", {
      email: "alice@example.com",
    });
    const err = await rejection(
      readThroughExtension(BASE, "user", {
        id: 1,
        email: flipLastChar(stored["email"] as string),
      }),
    );
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("middleware rejects a plaintext value on findMany", async () => {
    const mw = createEncryptionMiddleware(BASE);
    const err = await rejection(
      mw(
        {
          model: "User",
          action: "findMany",
          args: {},
          dataPath: [],
          runInTransaction: false,
        },
        async () => [{ id: 1, email: "injected" }],
      ),
    );
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("allowPlaintextFallback returns non-ciphertext values as-is", async () => {
    const config = { ...BASE, allowPlaintextFallback: true };
    const row = await readThroughExtension(config, "user", {
      id: 1,
      email: "not-yet-migrated@example.com",
    });
    expect(row["email"]).to.equal("not-yet-migrated@example.com");
  });

  it("allowPlaintextFallback still rejects a tampered v2 ciphertext", async () => {
    const config = { ...BASE, allowPlaintextFallback: true };
    const stored = await writeThroughExtension(config, "user", {
      email: "alice@example.com",
    });
    const err = await rejection(
      readThroughExtension(config, "user", {
        id: 1,
        email: flipLastChar(stored["email"] as string),
      }),
    );
    expect(err.name).to.equal("FieldDecryptionError");
  });
});

describe("security: ciphertexts are bound to model and field (F22)", () => {
  it("writes the v2 format", async () => {
    const stored = await writeThroughExtension(BASE, "user", {
      email: "alice@example.com",
    });
    expect(stored["email"]).to.be.a("string").and.match(/^v2:/);
  });

  it("round-trips a v2 value", async () => {
    const stored = await writeThroughExtension(BASE, "user", {
      email: "alice@example.com",
      phone: "+1-555-0100",
    });
    const row = await readThroughExtension(BASE, "user", { id: 1, ...stored });
    expect(row["email"]).to.equal("alice@example.com");
    expect(row["phone"]).to.equal("+1-555-0100");
  });

  it("rejects a ciphertext swapped between two fields", async () => {
    const stored = await writeThroughExtension(BASE, "user", {
      email: "alice@example.com",
      phone: "+1-555-0100",
    });
    const err = await rejection(
      readThroughExtension(BASE, "user", {
        id: 1,
        email: stored["phone"],
        phone: stored["email"],
      }),
    );
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("rejects a ciphertext moved to another model", async () => {
    const stored = await writeThroughExtension(BASE, "user", {
      email: "alice@example.com",
    });
    const err = await rejection(
      readThroughExtension(BASE, "customer", { id: 1, email: stored["email"] }),
    );
    expect(err.name).to.equal("FieldDecryptionError");
  });

  it("middleware and extension share one format", async () => {
    const mw = createEncryptionMiddleware(BASE);
    let stored: Rec = {};
    await mw(
      {
        model: "user",
        action: "create",
        args: { data: { email: "shared@example.com" } },
        dataPath: [],
        runInTransaction: false,
      },
      async (p) => {
        stored = { ...(p.args["data"] as Rec) };
        return null;
      },
    );
    const row = await readThroughExtension(BASE, "user", { id: 1, ...stored });
    expect(row["email"]).to.equal("shared@example.com");
  });

  it("still reads legacy (pre-v2) ciphertexts by default", async () => {
    const legacy = secretbox.seal(TEST_KEY, "legacy@example.com").sealed;
    const row = await readThroughExtension(BASE, "user", {
      id: 1,
      email: legacy,
    });
    expect(row["email"]).to.equal("legacy@example.com");
  });

  it("acceptLegacyCiphertext: false rejects legacy ciphertexts", async () => {
    const legacy = secretbox.seal(TEST_KEY, "legacy@example.com").sealed;
    const err = await rejection(
      readThroughExtension({ ...BASE, acceptLegacyCiphertext: false }, "user", {
        id: 1,
        email: legacy,
      }),
    );
    expect(err.name).to.equal("FieldDecryptionError");
  });
});

describe("security: separate keys for encryption and blind index (F23)", () => {
  it("does not encrypt v2 values with the configured key itself", async () => {
    const stored = await writeThroughExtension(BASE, "user", {
      email: "alice@example.com",
    });
    const body = (stored["email"] as string).slice(3);
    const aad = Buffer.from("crypto-prisma/v2:User.email", "utf8");
    expect(() => secretbox.open(TEST_KEY, body, aad)).to.throw();
    const encKey = kdfDerive({
      algorithm: "hkdf-sha256",
      password: Buffer.from(TEST_KEY, "hex"),
      salt: new Uint8Array(32),
      params: { info: "crypto-prisma/enc/v2" },
    }).derivedKey;
    const plain = secretbox.open(encKey, body, aad);
    expect(Buffer.from(plain).toString("utf8")).to.equal("alice@example.com");
  });

  it("keeps the legacy blind-index key by default", async () => {
    const config = { ...BASE, deterministicFields: ["email"] };
    const stored = await writeThroughExtension(config, "user", {
      email: "alice@example.com",
    });
    const legacyMac = computeHmac({
      algorithm: "sha256",
      key: TEST_KEY,
      data: "alice@example.com",
    }).mac;
    expect(stored["email"]).to.equal(legacyMac);
  });

  it("blindIndexKeyDerivation: hkdf uses a derived blind-index key", async () => {
    const config: EncryptionConfig = {
      ...BASE,
      deterministicFields: ["email"],
      blindIndexKeyDerivation: "hkdf",
    };
    const stored = await writeThroughExtension(config, "user", {
      email: "alice@example.com",
    });
    const bidxKey = kdfDerive({
      algorithm: "hkdf-sha256",
      password: Buffer.from(TEST_KEY, "hex"),
      salt: new Uint8Array(32),
      params: { info: "crypto-prisma/bidx/v1" },
    }).derivedKey;
    const expected = computeHmac({
      algorithm: "sha256",
      key: bidxKey,
      data: "alice@example.com",
    }).mac;
    expect(stored["email"]).to.equal(expected);
  });

  it("deterministic fields return the stored MAC on read", async () => {
    const config = { ...BASE, deterministicFields: ["email"] };
    const stored = await writeThroughExtension(config, "user", {
      email: "alice@example.com",
    });
    const row = await readThroughExtension(config, "user", {
      id: 1,
      ...stored,
    });
    expect(row["email"]).to.equal(stored["email"]);
    expect(row["email"]).to.not.equal("alice@example.com");
  });

  it("rejects a 64-character key that is not hex", () => {
    expect(() =>
      createFieldEncryptionExtension({ ...BASE, key: "z".repeat(64) }),
    ).to.throw("64-character hex string");
    expect(() =>
      createEncryptionMiddleware({ ...BASE, key: "z".repeat(64) }),
    ).to.throw("64-character hex string");
  });
});

describe("operations that previously bypassed encryption", () => {
  it("extension encrypts every row of createMany", async () => {
    let rows: Rec[] = [];
    await handler(
      BASE,
      "user",
      "createMany",
    )({
      args: { data: [{ email: "a@test.com" }, { email: "b@test.com" }] },
      query: async (args) => {
        rows = args["data"] as Rec[];
        return { count: 2 };
      },
    });
    expect(rows).to.have.length(2);
    for (const row of rows) expect(row["email"]).to.match(/^v2:/);
  });

  it("extension encrypts updateMany data", async () => {
    let data: Rec = {};
    await handler(
      BASE,
      "user",
      "updateMany",
    )({
      args: { where: { id: 1 }, data: { email: "c@test.com" } },
      query: async (args) => {
        data = args["data"] as Rec;
        return { count: 1 };
      },
    });
    expect(data["email"]).to.match(/^v2:/);
  });

  for (const op of ["findUniqueOrThrow", "findFirstOrThrow"]) {
    it(`extension decrypts ${op} results`, async () => {
      const stored = await writeThroughExtension(BASE, "user", {
        email: "d@test.com",
      });
      const row = (await handler(
        BASE,
        "user",
        op,
      )({ args: {}, query: async () => ({ id: 1, ...stored }) })) as Rec;
      expect(row["email"]).to.equal("d@test.com");
    });
  }

  for (const action of ["create", "findUniqueOrThrow"]) {
    it(`middleware decrypts ${action} results`, async () => {
      const mw = createEncryptionMiddleware(BASE);
      const stored = await writeThroughExtension(BASE, "user", {
        email: "e@test.com",
      });
      const row = (await mw(
        {
          model: "User",
          action,
          args: {},
          dataPath: [],
          runInTransaction: false,
        },
        async () => ({ id: 1, ...stored }),
      )) as Rec;
      expect(row["email"]).to.equal("e@test.com");
    });
  }
});

describe("middleware argument edge cases", () => {
  it("passes a findMany without arguments through", async () => {
    const mw = createEncryptionMiddleware(BASE);
    const result = await mw(
      {
        model: "User",
        action: "findMany",
        args: undefined as unknown as Rec,
        dataPath: [],
        runInTransaction: false,
      },
      async () => [],
    );
    expect(result).to.deep.equal([]);
  });
});
