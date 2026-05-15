/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import type { FastifyRequest, FastifyReply } from "fastify";
import {
  rejectUnauthorized,
  collectValidation,
  classifyCryptoError,
} from "../src/utils/route-helpers";
import {
  validateRequiredString,
  validateRequiredNumber,
  ValidationResult,
} from "../src/utils/validation";

function createMockReply(): {
  reply: {
    status: (code: number) => { send: (body: unknown) => void };
    statusCode: number;
    body: unknown;
  };
} {
  const state = { statusCode: 200, body: null as unknown };
  return {
    reply: {
      get statusCode() {
        return state.statusCode;
      },
      get body() {
        return state.body;
      },
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

      expect(
        rejectUnauthorized(
          request as unknown as FastifyRequest,
          reply as unknown as FastifyReply,
        ),
      ).to.be.false;
    });

    it("should reject when API key is missing from request", () => {
      process.env["CRYPTO_API_KEY"] = "test-key";
      const { reply } = createMockReply();
      const request = createMockRequest();

      expect(
        rejectUnauthorized(
          request as unknown as FastifyRequest,
          reply as unknown as FastifyReply,
        ),
      ).to.be.true;
      expect(reply.statusCode).to.equal(401);
    });

    it("should accept when API key matches", () => {
      process.env["CRYPTO_API_KEY"] = "test-key";
      const { reply } = createMockReply();
      const request = createMockRequest({ "x-api-key": "test-key" });

      expect(
        rejectUnauthorized(
          request as unknown as FastifyRequest,
          reply as unknown as FastifyReply,
        ),
      ).to.be.false;
    });

    it("should reject when API key does not match", () => {
      process.env["CRYPTO_API_KEY"] = "test-key";
      const { reply } = createMockReply();
      const request = createMockRequest({ "x-api-key": "wrong-key" });

      expect(
        rejectUnauthorized(
          request as unknown as FastifyRequest,
          reply as unknown as FastifyReply,
        ),
      ).to.be.true;
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

        reply as unknown as FastifyReply,
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

        reply as unknown as FastifyReply,
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

        reply as unknown as FastifyReply,
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

      const result = collectValidation(
        results,
        reply as unknown as FastifyReply,
      );
      expect(result).to.be.null;
    });
  });

  describe("classifyCryptoError", () => {
    function createLogRequest(): {
      log: { error: (err: unknown, msg: string) => void };
      logged: { err: unknown; msg: string }[];
    } {
      const logged: { err: unknown; msg: string }[] = [];
      return {
        log: {
          error: (err: unknown, msg: string) => {
            logged.push({ err, msg });
          },
        },
        logged,
      };
    }

    it("should return 400 for invalid hex errors", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(
        new Error("Invalid hex string"),
        request,
        reply,
        "Encryption",
      );
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { error: string }).error).to.equal(
        "Encryption failed: invalid input",
      );
    });

    it("should return 400 for 'must be N bytes' errors", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(
        new Error("Key must be 32 bytes"),
        request,
        reply,
        "Encryption",
      );
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { error: string }).error).to.equal(
        "Encryption failed: invalid input",
      );
    });

    it("should return 400 for 'too short' errors", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(
        new Error("Ciphertext too short"),
        request,
        reply,
        "Decryption",
      );
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { error: string }).error).to.equal(
        "Decryption failed: invalid input",
      );
    });

    it("should return 400 for 'unsupported' errors", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(
        new Error("Unsupported algorithm: foo"),
        request,
        reply,
        "Hash computation",
      );
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { error: string }).error).to.equal(
        "Hash computation failed: invalid input",
      );
    });

    it("should return 400 for 'expected.*length' errors", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(
        new Error("private key of length 32 expected, got 0"),
        request,
        reply,
        "Signing",
      );
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { error: string }).error).to.equal(
        "Signing failed: invalid input",
      );
    });

    it("should return 500 for unknown errors", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(
        new Error("Something unexpected happened"),
        request,
        reply,
        "Encryption",
      );
      expect(reply.statusCode).to.equal(500);
      expect((reply.body as { error: string }).error).to.equal(
        "Encryption failed",
      );
    });

    it("should handle non-Error values", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError("Invalid hex in key", request, reply, "Decryption");
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { error: string }).error).to.equal(
        "Decryption failed: invalid input",
      );
    });

    it("should handle non-Error non-string values as 500", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(42, request, reply, "Encryption");
      expect(reply.statusCode).to.equal(500);
      expect((reply.body as { error: string }).error).to.equal(
        "Encryption failed",
      );
    });
  });
});
