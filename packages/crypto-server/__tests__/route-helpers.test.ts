/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { rejectUnauthorized, collectValidation } from "../src/utils/route-helpers";
import { validateRequiredString, validateRequiredNumber, ValidationResult } from "../src/utils/validation";

function createMockReply(): {
  reply: { status: (code: number) => { send: (body: unknown) => void }; statusCode: number; body: unknown };
} {
  const state = { statusCode: 200, body: null as unknown };
  return {
    reply: {
      get statusCode() { return state.statusCode; },
      get body() { return state.body; },
      status(code: number) {
        state.statusCode = code;
        return {
          send(body: unknown) {
            state.body = body;
          },
        };
      },
    },
  };
}

function createMockRequest(headers: Record<string, unknown> = {}): {
  headers: Record<string, unknown>;
} {
  return { headers };
}

describe("Route helpers", () => {
  describe("rejectUnauthorized", () => {
    const originalEnv = process.env["CRYPTO_API_KEY"];

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env["CRYPTO_API_KEY"] = originalEnv;
      } else {
        delete process.env["CRYPTO_API_KEY"];
      }
    });

    it("should allow when no API key is configured", () => {
      delete process.env["CRYPTO_API_KEY"];
      const { reply } = createMockReply();
      const request = createMockRequest();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(rejectUnauthorized(request as any, reply as any)).to.be.false;
    });

    it("should reject when API key is missing from request", () => {
      process.env["CRYPTO_API_KEY"] = "test-key";
      const { reply } = createMockReply();
      const request = createMockRequest();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(rejectUnauthorized(request as any, reply as any)).to.be.true;
      expect(reply.statusCode).to.equal(401);
    });

    it("should accept when API key matches", () => {
      process.env["CRYPTO_API_KEY"] = "test-key";
      const { reply } = createMockReply();
      const request = createMockRequest({ "x-api-key": "test-key" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(rejectUnauthorized(request as any, reply as any)).to.be.false;
    });

    it("should reject when API key does not match", () => {
      process.env["CRYPTO_API_KEY"] = "test-key";
      const { reply } = createMockReply();
      const request = createMockRequest({ "x-api-key": "wrong-key" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(rejectUnauthorized(request as any, reply as any)).to.be.true;
      expect(reply.statusCode).to.equal(401);
    });
  });

  describe("collectValidation", () => {
    it("should return unwrapped values when all valid", () => {
      const { reply } = createMockReply();
      const result = collectValidation(
        {
          name: validateRequiredString("Alice", "name"),
          age: validateRequiredNumber(30, "age"),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reply as any,
      );
      expect(result).to.not.be.null;
      expect(result!.name).to.equal("Alice");
      expect(result!.age).to.equal(30);
    });

    it("should return null and send 400 when any validation fails", () => {
      const { reply } = createMockReply();
      const result = collectValidation(
        {
          name: validateRequiredString("", "name"),
          age: validateRequiredNumber(30, "age"),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reply as any,
      );
      expect(result).to.be.null;
      expect(reply.statusCode).to.equal(400);
    });

    it("should collect multiple errors", () => {
      const { reply } = createMockReply();
      const result = collectValidation(
        {
          name: validateRequiredString("", "name"),
          email: validateRequiredString("", "email"),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reply as any,
      );
      expect(result).to.be.null;
      expect(reply.statusCode).to.equal(400);
      const body = reply.body as { details: Array<{ field: string }> };
      expect(body.details).to.have.length(2);
    });

    it("should handle mixed valid and invalid results", () => {
      const { reply } = createMockReply();
      const results: Record<string, ValidationResult<unknown>> = {
        good: { valid: true, value: "ok" },
        bad: { valid: false, error: { field: "bad", message: "invalid" } },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = collectValidation(results, reply as any);
      expect(result).to.be.null;
    });
  });
});
