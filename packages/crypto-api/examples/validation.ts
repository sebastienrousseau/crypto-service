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

import { header, task, summary } from "./support";

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

async function main() {
  header("crypto-api -- validation");

  // 1. Validate a well-formed document
  await task("Validate a correct JsonDocument", () => {
    const payload = {
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
    if (!isJsonDocument(payload)) throw new Error("Expected valid JsonDocument");
    if (!isJsonRequest(payload.item[0].request)) throw new Error("Expected valid JsonRequest");
    if (!isResponseType(payload.item[0].response![0])) throw new Error("Expected valid ResponseType");
    return true;
  });

  // 2. Reject document without info
  await task("Reject a document missing the info field", () => {
    const missingInfo = { item: [] };
    if (isJsonDocument(missingInfo)) throw new Error("Should have rejected missing info");
    return true;
  });

  // 3. Reject malformed request
  await task("Reject a malformed JsonRequest", () => {
    const badRequest = { header: "not-an-array", key: 42 };
    if (isJsonRequest(badRequest)) throw new Error("Should have rejected bad request");
    return true;
  });

  // 4. Reject malformed response
  await task("Reject a malformed ResponseType", () => {
    const badResponse = { code: "200", status: 404 };
    if (isResponseType(badResponse)) throw new Error("Should have rejected bad response");
    return true;
  });

  // 5. Reject null input across all validators
  await task("Reject null input for all validators", () => {
    if (isJsonDocument(null)) throw new Error("Should have rejected null");
    if (isJsonRequest(null)) throw new Error("Should have rejected null");
    if (isResponseType(null)) throw new Error("Should have rejected null");
    return true;
  });

  summary(5);
}

main();
