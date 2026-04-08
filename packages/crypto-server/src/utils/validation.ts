/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Input validation utilities for secure parameter handling.
 *
 * Body-based validators (unknown → typed result). The earlier
 * header-array input shape was specific to Fastify's `request.headers`
 * and does not apply to JSON body fields.
 */

import { FastifyReply } from "fastify";

/**
 * Validation error response shape.
 */
export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: ValidationError };

/**
 * Validates that a required string field is present and non-empty.
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
): ValidationResult<string> {
  if (value === undefined || value === null) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} is required` },
    };
  }
  if (typeof value !== "string" || value.trim() === "") {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a non-empty string` },
    };
  }
  return { valid: true, value };
}

/**
 * Validates that a required number field is present and in range.
 */
export function validateRequiredNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number },
): ValidationResult<number> {
  if (value === undefined || value === null) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} is required` },
    };
  }
  const numValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numValue)) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a valid number` },
    };
  }
  if (options?.min !== undefined && numValue < options.min) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be at least ${options.min}` },
    };
  }
  if (options?.max !== undefined && numValue > options.max) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be at most ${options.max}` },
    };
  }
  return { valid: true, value: numValue };
}

/**
 * Validates an optional number field with a default value.
 */
export function validateOptionalNumber(
  value: unknown,
  defaultValue: number,
  fieldName: string,
  options?: { min?: number; max?: number },
): ValidationResult<number> {
  if (value === undefined || value === null || value === "") {
    return { valid: true, value: defaultValue };
  }
  return validateRequiredNumber(value, fieldName, options);
}

/**
 * Validates base64-encoded string format.
 */
export function validateBase64(
  value: unknown,
  fieldName: string,
): ValidationResult<string> {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) return stringResult;

  // Allow standard and URL-safe base64 alphabets.
  const base64Regex = /^[A-Za-z0-9+/=_-]*$/;
  if (!base64Regex.test(stringResult.value)) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be valid base64 encoded data` },
    };
  }
  return { valid: true, value: stringResult.value };
}

/**
 * Validates email format.
 */
export function validateEmail(
  value: unknown,
  fieldName: string,
): ValidationResult<string> {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) return stringResult;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(stringResult.value)) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a valid email address` },
    };
  }
  return { valid: true, value: stringResult.value };
}

/**
 * Validates enum value against allowed values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
): ValidationResult<T> {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) return stringResult;

  if (!allowedValues.includes(stringResult.value as T)) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be one of: ${allowedValues.join(", ")}`,
      },
    };
  }
  return { valid: true, value: stringResult.value as T };
}

/**
 * Validates an ISO date string.
 */
export function validateDateString(
  value: unknown,
  fieldName: string,
): ValidationResult<Date> {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) return stringResult;

  const date = new Date(stringResult.value);
  if (Number.isNaN(date.getTime())) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a valid ISO date string` },
    };
  }
  return { valid: true, value: date };
}

/**
 * Sends validation error response.
 */
export function sendValidationError(
  reply: FastifyReply,
  errors: ValidationError[],
): void {
  reply.status(400).send({
    error: "Validation failed",
    details: errors,
  });
}

/**
 * API Key validation for authentication.
 */
export function validateApiKey(
  apiKey: unknown,
  expectedKey: string | undefined,
): boolean {
  if (!expectedKey) {
    // Dev mode: no key configured → allow all.
    return true;
  }
  if (apiKey === undefined || apiKey === null) return false;
  const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;
  return typeof key === "string" && key === expectedKey;
}
