/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Input validation utilities for secure parameter handling
 * @author The Crypto Service Suite
 */

import { FastifyReply } from 'fastify';

/**
 * Validation error response
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates that a required string header is present and non-empty
 */
export function validateRequiredString(
  value: string | string[] | undefined,
  fieldName: string
): { valid: true; value: string } | { valid: false; error: ValidationError } {
  if (value === undefined || value === null) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} is required` }
    };
  }

  const strValue = Array.isArray(value) ? value[0] : value;

  if (typeof strValue !== 'string' || strValue.trim() === '') {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a non-empty string` }
    };
  }

  return { valid: true, value: strValue };
}

/**
 * Validates that a required number header is present and valid
 */
export function validateRequiredNumber(
  value: string | string[] | undefined,
  fieldName: string,
  options?: { min?: number; max?: number }
): { valid: true; value: number } | { valid: false; error: ValidationError } {
  if (value === undefined || value === null) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} is required` }
    };
  }

  const strValue = Array.isArray(value) ? value[0] : value;
  const numValue = Number(strValue);

  if (isNaN(numValue)) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a valid number` }
    };
  }

  if (options?.min !== undefined && numValue < options.min) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be at least ${options.min}` }
    };
  }

  if (options?.max !== undefined && numValue > options.max) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be at most ${options.max}` }
    };
  }

  return { valid: true, value: numValue };
}

/**
 * Validates an optional number header with a default value
 */
export function validateOptionalNumber(
  value: string | string[] | undefined,
  defaultValue: number,
  fieldName: string,
  options?: { min?: number; max?: number }
): { valid: true; value: number } | { valid: false; error: ValidationError } {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: defaultValue };
  }

  return validateRequiredNumber(value, fieldName, options);
}

/**
 * Validates base64 encoded string format
 */
export function validateBase64(
  value: string | string[] | undefined,
  fieldName: string
): { valid: true; value: string } | { valid: false; error: ValidationError } {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) {
    return stringResult;
  }

  // Basic base64 validation (allows standard and URL-safe base64)
  const base64Regex = /^[A-Za-z0-9+/=_-]*$/;
  if (!base64Regex.test(stringResult.value)) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be valid base64 encoded data` }
    };
  }

  return { valid: true, value: stringResult.value };
}

/**
 * Validates email format
 */
export function validateEmail(
  value: string | string[] | undefined,
  fieldName: string
): { valid: true; value: string } | { valid: false; error: ValidationError } {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) {
    return stringResult;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(stringResult.value)) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a valid email address` }
    };
  }

  return { valid: true, value: stringResult.value };
}

/**
 * Validates enum value against allowed values
 */
export function validateEnum<T extends string>(
  value: string | string[] | undefined,
  fieldName: string,
  allowedValues: readonly T[]
): { valid: true; value: T } | { valid: false; error: ValidationError } {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) {
    return stringResult;
  }

  if (!allowedValues.includes(stringResult.value as T)) {
    return {
      valid: false,
      error: {
        field: fieldName,
        message: `${fieldName} must be one of: ${allowedValues.join(', ')}`
      }
    };
  }

  return { valid: true, value: stringResult.value as T };
}

/**
 * Validates ISO date string format
 */
export function validateDateString(
  value: string | string[] | undefined,
  fieldName: string
): { valid: true; value: Date } | { valid: false; error: ValidationError } {
  const stringResult = validateRequiredString(value, fieldName);
  if (!stringResult.valid) {
    return stringResult;
  }

  const date = new Date(stringResult.value);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: { field: fieldName, message: `${fieldName} must be a valid ISO date string` }
    };
  }

  return { valid: true, value: date };
}

/**
 * Sends validation error response
 */
export function sendValidationError(
  reply: FastifyReply,
  errors: ValidationError[]
): void {
  reply.status(400).send({
    error: 'Validation failed',
    details: errors
  });
}

/**
 * API Key validation for authentication
 */
export function validateApiKey(
  apiKey: string | string[] | undefined,
  expectedKey: string | undefined
): boolean {
  if (!expectedKey) {
    // If no API key is configured, allow all requests (development mode)
    return true;
  }

  if (!apiKey) {
    return false;
  }

  const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;
  return key === expectedKey;
}
