// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using API types for type-safe requests.
 *
 * Demonstrates how to import and compose the shared type definitions
 * exported by crypto-api to build fully typed API request and response
 * objects that are consumed by crypto-server and crypto-sdk.
 *
 * Run: `npx ts-node examples/types.ts`
 */

import type {
  AuthorizationToken,
  AuthorizationInfo,
  CollectionItem,
  JsonDocument,
  JsonRequest,
  MethodType,
  RequestHeader,
  ResponseType,
} from "../src/@types/types";

function main() {
  console.log("\n=== crypto-api — types ===\n");

  // 1. Build a request header
  const header: RequestHeader = {
    key: "Content-Type",
    value: "application/json",
    description: "JSON content type for API requests",
  };
  console.log("RequestHeader:", header);

  // 2. Build a JSON request
  const request: JsonRequest = {
    header: [header],
    key: "encrypt",
    value: "aes-256-gcm",
    description: "Encrypt a payload using AES-256-GCM",
  };
  console.log("JsonRequest:", request);

  // 3. Build a response
  const response: ResponseType = {
    code: 200,
    status: "OK",
    body: JSON.stringify({ ciphertext: "base64..." }),
  };
  console.log("ResponseType:", response);

  // 4. Build an authorization token
  const token: AuthorizationToken = {
    key: "token",
    type: "string",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  };

  const auth: AuthorizationInfo = {
    bearer: [token],
    key: "Authorization",
    type: "Bearer",
    value: token.value,
  };
  console.log("AuthorizationInfo:", auth);

  // 5. Build a method type
  const method: MethodType = {
    name: "Encrypt Message",
    request,
    response: [response],
  };
  console.log("MethodType:", method);

  // 6. Compose a collection item (endpoint)
  const endpoint: CollectionItem = {
    name: "Encrypt",
    request,
    response: [response],
  };

  // 7. Compose a folder with nested items
  const folder: CollectionItem = {
    name: "Cryptographic Operations",
    item: [endpoint],
  };

  // 8. Compose a full document
  const doc: JsonDocument = {
    info: {
      name: "Crypto Service Suite APIs",
      description: "REST APIs for common cryptographic operations",
    },
    item: [folder],
  };
  console.log("JsonDocument:", JSON.stringify(doc, null, 2));

  console.log("\nDone.");
}

main();
