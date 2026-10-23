/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import type { FastifyReply } from "fastify";
import { CryptoError } from "@sebastienrousseau/crypto-lib";
import {
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
          // sendProblem chains reply.status(...).type(...).send(...).
          type() {
            return this;
          },
          send(body: unknown) {
            state.body = body;
          },
        };
      },
    },
  };
}

describe("Route helpers", () => {
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
      const body = reply.body as { errors: Array<{ field: string }> };
      expect(body.errors.map((e) => e.field)).to.deep.equal(["name", "email"]);
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

    // classifyCryptoError used to match error messages against patterns
    // ("invalid hex", "too short", "unsupported"...). crypto-lib now throws
    // CryptoError with a code for every error of its own, so the server
    // classifies by code, through crypto-lib's isCallerErrorCode, and by
    // class for noble's errors: a RangeError is input of the wrong length.
    // Message text no longer decides anything.
    it("returns 400 for noble's RangeError (input of the wrong length)", () => {
      const { reply } = createMockReply();
      classifyCryptoError(
        new RangeError(
          '"publicKey" expected Uint8Array of length 32, got length=4',
        ),
        createLogRequest(),
        reply,
        "Encapsulation",
      );
      expect(reply.statusCode).to.equal(400);
      expect((reply.body as { detail: string }).detail).to.equal(
        "Encapsulation failed: invalid input",
      );
    });

    it("does not read input errors from message text", () => {
      for (const message of [
        "Invalid hex string",
        "Key must be 32 bytes",
        "Ciphertext too short",
        "Unsupported algorithm: foo",
        "private key of length 32 expected, got 0",
      ]) {
        const { reply } = createMockReply();
        classifyCryptoError(
          new Error(message),
          createLogRequest(),
          reply,
          "Encryption",
        );
        expect(reply.statusCode, message).to.equal(500);
      }
      const { reply } = createMockReply();
      classifyCryptoError("Invalid hex in key", createLogRequest(), reply, "X");
      expect(reply.statusCode).to.equal(500);
    });

    it("uses crypto-lib's list of caller-error codes", () => {
      const token = createMockReply();
      classifyCryptoError(
        new CryptoError("Token expired", "INVALID_TOKEN"),
        createLogRequest(),
        token.reply as unknown as FastifyReply,
        "Token verification",
      );
      expect(token.reply.statusCode).to.equal(400);
      const config = createMockReply();
      classifyCryptoError(
        new CryptoError("CRYPTO_KEY_DIR is not set", "CONFIGURATION"),
        createLogRequest(),
        config.reply as unknown as FastifyReply,
        "Signing",
      );
      expect(config.reply.statusCode).to.equal(500);
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
      expect((reply.body as { detail: string }).detail).to.equal(
        "Encryption failed",
      );
    });

    it("should handle non-Error non-string values as 500", () => {
      const { reply } = createMockReply();
      const request = createLogRequest();
      classifyCryptoError(42, request, reply, "Encryption");
      expect(reply.statusCode).to.equal(500);
      expect((reply.body as { detail: string }).detail).to.equal(
        "Encryption failed",
      );
    });

    it("classifies a crypto-lib CryptoError by its code, not its message", () => {
      const input = createMockReply();
      classifyCryptoError(
        new CryptoError("anything", "INVALID_KEY"),
        createLogRequest(),
        input.reply as unknown as FastifyReply,
        "Signing",
      );
      expect(input.reply.statusCode).to.equal(400);
      expect(input.reply.body).to.deep.include({
        type: "urn:crypto-service:problem:invalid-input",
        detail: "Signing failed: invalid input",
        code: "INVALID_KEY",
      });

      // "invalid hex" would read as input by message; the code wins.
      const internal = createMockReply();
      classifyCryptoError(
        new CryptoError("invalid hex", "BUFFER_DESTROYED"),
        createLogRequest(),
        internal.reply as unknown as FastifyReply,
        "Signing",
      );
      expect(internal.reply.statusCode).to.equal(500);
      expect(internal.reply.body).to.deep.include({
        type: "urn:crypto-service:problem:internal-error",
        detail: "Signing failed",
        code: "BUFFER_DESTROYED",
      });
    });
  });
});
