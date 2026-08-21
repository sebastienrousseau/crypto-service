/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import {
  validateRequiredString,
  validateRequiredNumber,
  validateOptionalNumber,
  validateBase64,
  validateEmail,
  validateEnum,
  validateDateString,
  validateApiKey,
} from "../src/utils/validation";

describe("Validation utilities", () => {
  describe("validateRequiredString", () => {
    it("should accept a non-empty string", () => {
      const result = validateRequiredString("hello", "field");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal("hello");
    });

    it("should reject undefined", () => {
      const result = validateRequiredString(undefined, "field");
      expect(result.valid).to.be.false;
      if (!result.valid) expect(result.error.field).to.equal("field");
    });

    it("should reject null", () => {
      const result = validateRequiredString(null, "field");
      expect(result.valid).to.be.false;
    });

    it("should reject empty string", () => {
      const result = validateRequiredString("", "field");
      expect(result.valid).to.be.false;
    });

    it("should reject whitespace-only string", () => {
      const result = validateRequiredString("   ", "field");
      expect(result.valid).to.be.false;
    });

    it("should reject non-string types", () => {
      const result = validateRequiredString(42, "field");
      expect(result.valid).to.be.false;
    });
  });

  describe("validateRequiredNumber", () => {
    it("should accept a valid number", () => {
      const result = validateRequiredNumber(42, "field");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal(42);
    });

    it("should accept a numeric string", () => {
      const result = validateRequiredNumber("42", "field");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal(42);
    });

    it("should reject undefined", () => {
      const result = validateRequiredNumber(undefined, "field");
      expect(result.valid).to.be.false;
    });

    it("should reject NaN", () => {
      const result = validateRequiredNumber(NaN, "field");
      expect(result.valid).to.be.false;
    });

    it("should reject Infinity", () => {
      const result = validateRequiredNumber(Infinity, "field");
      expect(result.valid).to.be.false;
    });

    it("should enforce min bound", () => {
      const result = validateRequiredNumber(5, "field", { min: 10 });
      expect(result.valid).to.be.false;
      if (!result.valid) expect(result.error.message).to.include("at least 10");
    });

    it("should enforce max bound", () => {
      const result = validateRequiredNumber(100, "field", { max: 50 });
      expect(result.valid).to.be.false;
      if (!result.valid) expect(result.error.message).to.include("at most 50");
    });

    it("should accept value within range", () => {
      const result = validateRequiredNumber(25, "field", { min: 10, max: 50 });
      expect(result.valid).to.be.true;
    });
  });

  describe("validateOptionalNumber", () => {
    it("should return default for undefined", () => {
      const result = validateOptionalNumber(undefined, 99, "field");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal(99);
    });

    it("should return default for null", () => {
      const result = validateOptionalNumber(null, 99, "field");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal(99);
    });

    it("should return default for empty string", () => {
      const result = validateOptionalNumber("", 99, "field");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal(99);
    });

    it("should validate provided value", () => {
      const result = validateOptionalNumber(42, 99, "field", { min: 10 });
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal(42);
    });

    it("should reject invalid provided value", () => {
      const result = validateOptionalNumber(5, 99, "field", { min: 10 });
      expect(result.valid).to.be.false;
    });
  });

  describe("validateBase64", () => {
    it("should accept valid base64", () => {
      const result = validateBase64("SGVsbG8gV29ybGQ=", "field");
      expect(result.valid).to.be.true;
    });

    it("should accept URL-safe base64", () => {
      const result = validateBase64("SGVsbG8-V29ybGQ_", "field");
      expect(result.valid).to.be.true;
    });

    it("should reject invalid base64 characters", () => {
      const result = validateBase64("not!valid#base64", "field");
      expect(result.valid).to.be.false;
    });

    it("should reject empty string", () => {
      const result = validateBase64("", "field");
      expect(result.valid).to.be.false;
    });

    it("should reject non-string", () => {
      const result = validateBase64(123, "field");
      expect(result.valid).to.be.false;
    });
  });

  describe("validateEmail", () => {
    it("should accept valid email", () => {
      const result = validateEmail("test@example.com", "email");
      expect(result.valid).to.be.true;
    });

    it("should reject missing @", () => {
      const result = validateEmail("testexample.com", "email");
      expect(result.valid).to.be.false;
    });

    it("should reject missing domain", () => {
      const result = validateEmail("test@", "email");
      expect(result.valid).to.be.false;
    });

    it("should reject spaces", () => {
      const result = validateEmail("test @example.com", "email");
      expect(result.valid).to.be.false;
    });

    it("should reject non-string input", () => {
      const result = validateEmail(123, "email");
      expect(result.valid).to.be.false;
      if (!result.valid) expect(result.error.field).to.equal("email");
    });

    it("should reject null", () => {
      const result = validateEmail(null, "email");
      expect(result.valid).to.be.false;
    });
  });

  describe("validateEnum", () => {
    const ALLOWED = ["a", "b", "c"] as const;

    it("should accept allowed value", () => {
      const result = validateEnum("a", "field", ALLOWED);
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.equal("a");
    });

    it("should reject disallowed value", () => {
      const result = validateEnum("d", "field", ALLOWED);
      expect(result.valid).to.be.false;
      if (!result.valid) expect(result.error.message).to.include("a, b, c");
    });

    it("should reject non-string", () => {
      const result = validateEnum(42, "field", ALLOWED);
      expect(result.valid).to.be.false;
    });
  });

  describe("validateDateString", () => {
    it("should accept valid ISO date", () => {
      const result = validateDateString("2023-10-09T08:07:06Z", "date");
      expect(result.valid).to.be.true;
      if (result.valid) expect(result.value).to.be.instanceOf(Date);
    });

    it("should reject invalid date string", () => {
      const result = validateDateString("not-a-date", "date");
      expect(result.valid).to.be.false;
    });

    it("should reject empty", () => {
      const result = validateDateString("", "date");
      expect(result.valid).to.be.false;
    });
  });

  describe("validateApiKey", () => {
    it("should allow all when no expected key configured", () => {
      expect(validateApiKey("anything", undefined)).to.be.true;
    });

    it("should allow all when expected key is empty string", () => {
      expect(validateApiKey("anything", "")).to.be.true;
    });

    it("should reject undefined api key when expected is set", () => {
      expect(validateApiKey(undefined, "secret")).to.be.false;
    });

    it("should reject null api key", () => {
      expect(validateApiKey(null, "secret")).to.be.false;
    });

    it("should accept matching key", () => {
      expect(validateApiKey("secret", "secret")).to.be.true;
    });

    it("should reject non-matching key", () => {
      expect(validateApiKey("wrong", "secret")).to.be.false;
    });

    it("should reject non-string key", () => {
      expect(validateApiKey(42, "secret")).to.be.false;
    });

    it("should handle array input (Fastify header format)", () => {
      expect(validateApiKey(["secret"], "secret")).to.be.true;
    });

    it("should reject array with wrong key", () => {
      expect(validateApiKey(["wrong"], "secret")).to.be.false;
    });

    it("should use timing-safe comparison (different length keys reject)", () => {
      expect(validateApiKey("short", "a-much-longer-secret-key")).to.be.false;
    });
  });
});
