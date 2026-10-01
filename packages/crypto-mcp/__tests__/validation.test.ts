// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import {
  MCPToolInputSchema,
  MCPToolParameterProperty,
  TOOLS,
  executeTool,
  validateArguments,
} from "../src";
import { newKey } from "./helpers";

/** A well-formed handle that this server never issued. */
const UNISSUED = `kh_${"0".repeat(32)}`;

/**
 * One valid argument set per tool, built once real key handles exist.
 * Every tool must have an entry, so a new tool cannot ship without being
 * run through the checks below.
 */
const VALID: Record<string, Record<string, unknown>> = {};

async function buildFixtures(): Promise<void> {
  const sym = await newKey("symmetric-256");
  const mac = await newKey("hmac-sha256");
  const kem = await newKey("ml-kem-768");
  const doomed = await newKey("hmac-sha256");
  Object.assign(VALID, {
    crypto_generate_key: { type: "ed25519" },
    crypto_key_list: {},
    crypto_key_destroy: { keyHandle: doomed.keyHandle },
    crypto_inspect_key: { keyData: "x" },
    crypto_encrypt: {
      plaintext: "p",
      algorithm: "aes-256-gcm",
      keyHandle: sym.keyHandle,
    },
    crypto_decrypt: {
      ciphertext: "00",
      algorithm: "aes-256-gcm",
      keyHandle: sym.keyHandle,
      iv: "00".repeat(12),
      authTag: "00".repeat(16),
    },
    crypto_kem_encapsulate: { publicKey: kem.publicKey },
    crypto_kem_decapsulate: {
      keyHandle: kem.keyHandle,
      ciphertext: "00".repeat(1088),
    },
    crypto_sign: { data: "d", keyHandle: mac.keyHandle },
    crypto_verify: { data: "d", signature: "00", keyHandle: UNISSUED },
    crypto_hash: { data: "d", algorithm: "sha256" },
    crypto_kms_wrap: {
      provider: "local",
      keyId: "roundtrip",
      keyHandle: sym.keyHandle,
    },
    crypto_kms_unwrap: { provider: "local", keyId: "k", wrappedKey: "00" },
    crypto_audit_cbom: { algorithms: "RSA-2048" },
  });
}

const text = (res: { content: Array<{ text: string }> }) => res.content[0].text;

/** A value of the wrong JSON type for a property. */
function wrongType(prop: MCPToolParameterProperty): unknown {
  return prop.type === "string" ? 123 : "not-a-number";
}

/** A value of the right type that no declared enum contains. */
function outsideEnum(prop: MCPToolParameterProperty): unknown {
  return prop.type === "string" ? "__not_in_enum__" : 1;
}

/** A string of the allowed length that matches none of the patterns. */
function badFormat(prop: MCPToolParameterProperty): string {
  return "z".repeat(Math.max(prop.minLength ?? 0, 2));
}

async function expectRejected(
  tool: string,
  args: unknown,
  fragment: string,
): Promise<void> {
  const res = await executeTool(tool, args as Record<string, unknown>);
  expect(res.isError, `${tool} ${fragment}`).to.be.true;
  expect(text(res)).to.include(`Invalid arguments for ${tool}`);
  expect(text(res)).to.include(fragment);
}

describe("Tool argument validation", () => {
  before(buildFixtures);

  it("has a valid fixture for every declared tool", () => {
    expect(Object.keys(VALID).sort()).to.deep.equal(
      TOOLS.map((t) => t.name).sort(),
    );
  });

  for (const tool of TOOLS) {
    const schema = tool.inputSchema;
    const props = Object.entries(schema.properties);

    describe(tool.name, () => {
      it("declares a closed, bounded schema", () => {
        expect(schema.additionalProperties).to.equal(false);
        for (const name of schema.required ?? []) {
          expect(schema.properties, name).to.have.property(name);
        }
        for (const [name, prop] of props) {
          if (prop.type !== "string" || prop.enum) continue;
          expect(prop.maxLength, `${name} maxLength`).to.be.a("number");
        }
      });

      it("accepts its fixture and runs the handler", async () => {
        expect(validateArguments(schema, VALID[tool.name])).to.be.undefined;
        const res = await executeTool(tool.name, VALID[tool.name]);
        expect(text(res)).to.not.include("Invalid arguments");
        expect(text(res)).to.not.include("Unknown tool");
      });

      it("rejects arguments that are not an object", async () => {
        for (const args of [null, [], "x", 1]) {
          await expectRejected(tool.name, args, "must be a JSON object");
        }
      });

      it("rejects unknown properties", async () => {
        const args = { ...VALID[tool.name], unexpected: "x" };
        await expectRejected(tool.name, args, 'unknown property "unexpected"');
      });

      it("rejects a missing required property", async () => {
        for (const name of schema.required ?? []) {
          const args = { ...VALID[tool.name] };
          delete args[name];
          await expectRejected(tool.name, args, `"${name}"`);
        }
      });

      it("rejects wrong types, enums, lengths and formats", async () => {
        for (const [name, prop] of props) {
          const base = VALID[tool.name];
          const bad = (value: unknown) => ({ ...base, [name]: value });
          await expectRejected(tool.name, bad(wrongType(prop)), `"${name}"`);
          await expectRejected(tool.name, bad(null), `"${name}"`);
          if (prop.enum) {
            await expectRejected(
              tool.name,
              bad(outsideEnum(prop)),
              `"${name}" must be one of`,
            );
          }
          if (prop.maxLength !== undefined) {
            await expectRejected(
              tool.name,
              bad("a".repeat(prop.maxLength + 1)),
              `"${name}" must be at most`,
            );
          }
          if (prop.minLength) {
            await expectRejected(
              tool.name,
              bad(""),
              `"${name}" must be at least`,
            );
          }
          if (prop.pattern !== undefined) {
            await expectRejected(
              tool.name,
              bad(badFormat(prop)),
              `"${name}" has an invalid format`,
            );
          }
        }
      });
    });
  }

  describe("validateArguments", () => {
    const schema: MCPToolInputSchema = {
      type: "object",
      additionalProperties: false,
      properties: {
        count: { type: "integer", description: "c", minimum: 1, maximum: 3 },
        ratio: { type: "number", description: "r" },
        flag: { type: "boolean", description: "f" },
      },
    };

    it("enforces integer, number and boolean bounds", () => {
      expect(validateArguments(schema, { count: 2, ratio: 0.5, flag: true })).to
        .be.undefined;
      expect(validateArguments(schema, { count: 0 })).to.include(
        "must be at least 1",
      );
      expect(validateArguments(schema, { count: 4 })).to.include(
        "must be at most 3",
      );
      expect(validateArguments(schema, { count: 1.5 })).to.include(
        "must be of type integer",
      );
      expect(validateArguments(schema, { ratio: Infinity })).to.include(
        "must be of type number",
      );
      expect(validateArguments(schema, { flag: "true" })).to.include(
        "must be of type boolean",
      );
    });

    it("rejects inherited and prototype-polluting keys", () => {
      const args = JSON.parse('{"__proto__": {"count": 1}}');
      expect(validateArguments(schema, args)).to.include(
        'unknown property "__proto__"',
      );
    });

    it("truncates long unknown property names in messages", () => {
      const name = "n".repeat(200);
      const problem = validateArguments(schema, { [name]: 1 }) as string;
      expect(problem).to.include("...");
      expect(problem.length).to.be.below(120);
    });
  });
});
