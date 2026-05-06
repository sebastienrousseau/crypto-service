// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Validating API payloads against types.
 *
 * Shows how to write lightweight runtime validation helpers that enforce
 * the shapes defined by the crypto-api type definitions, useful when
 * processing untrusted input in crypto-server route handlers.
 *
 * Run: `npx ts-node examples/validation.ts`
 */

import type {
  JsonDocument,
  JsonRequest,
  RequestHeader,
  ResponseType,
} from "../src/@types/types";

// ---- Validation helpers ----

function isRequestHeader(obj: unknown): obj is RequestHeader {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.key === "string" &&
    typeof o.value === "string" &&
    typeof o.description === "string"
  );
}

function isJsonRequest(obj: unknown): obj is JsonRequest {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.header) &&
    o.header.every(isRequestHeader) &&
    typeof o.key === "string" &&
    typeof o.value === "string" &&
    typeof o.description === "string"
  );
}

function isResponseType(obj: unknown): obj is ResponseType {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.code === "number" &&
    typeof o.status === "string" &&
    typeof o.body === "string"
  );
}

function isJsonDocument(obj: unknown): obj is JsonDocument {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.info !== "object" || o.info === null) return false;
  const info = o.info as Record<string, unknown>;
  return (
    typeof info.name === "string" &&
    typeof info.description === "string" &&
    Array.isArray(o.item)
  );
}

// ---- Main ----

function main() {
  console.log("\n=== crypto-api — validation ===\n");

  // Valid payload
  const validPayload = {
    info: {
      name: "Crypto Service Suite APIs",
      description: "REST APIs for common cryptographic operations",
    },
    item: [
      {
        name: "Generate Key Pair",
        request: {
          header: [
            { key: "type", value: "ecc", description: "Key algorithm type" },
          ],
          key: "generate",
          value: "ed25519",
          description: "Generate an Ed25519 key pair",
        },
        response: [
          { code: 200, status: "OK", body: '{"publicKey":"..."}' },
        ],
      },
    ],
  };

  console.log("Validating correct document...");
  console.log("  isJsonDocument:", isJsonDocument(validPayload));
  console.log("  isJsonRequest:", isJsonRequest(validPayload.item[0].request));
  console.log("  isResponseType:", isResponseType(validPayload.item[0].response[0]));

  // Invalid payloads
  const missingInfo = { item: [] };
  console.log("\nValidating document without info...");
  console.log("  isJsonDocument:", isJsonDocument(missingInfo));

  const badRequest = { header: "not-an-array", key: 42 };
  console.log("\nValidating malformed request...");
  console.log("  isJsonRequest:", isJsonRequest(badRequest));

  const badResponse = { code: "200", status: 404 };
  console.log("\nValidating malformed response...");
  console.log("  isResponseType:", isResponseType(badResponse));

  const nullInput = null;
  console.log("\nValidating null input...");
  console.log("  isJsonDocument:", isJsonDocument(nullInput));
  console.log("  isJsonRequest:", isJsonRequest(nullInput));
  console.log("  isResponseType:", isResponseType(nullInput));

  console.log("\nDone.");
}

main();
