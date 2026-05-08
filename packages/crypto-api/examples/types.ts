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

import { header, task, summary } from "./support";

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

async function main() {
  header("crypto-api -- types");

  // 1. Build a request header
  await task("Build a RequestHeader", () => {
    const h: RequestHeader = {
      key: "Content-Type",
      value: "application/json",
      description: "JSON content type for API requests",
    };
    return h;
  });

  // 2. Build a JSON request
  await task("Build a JsonRequest", () => {
    const h: RequestHeader = {
      key: "Content-Type",
      value: "application/json",
      description: "JSON content type for API requests",
    };
    const request: JsonRequest = {
      header: [h],
      key: "encrypt",
      value: "aes-256-gcm",
      description: "Encrypt a payload using AES-256-GCM",
    };
    return request;
  });

  // 3. Build a response
  await task("Build a ResponseType", () => {
    const response: ResponseType = {
      code: 200,
      status: "OK",
      body: JSON.stringify({ ciphertext: "base64..." }),
    };
    return response;
  });

  // 4. Build an authorization token
  await task("Build an AuthorizationInfo with bearer token", () => {
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
    return auth;
  });

  // 5. Build a method type
  await task("Build a MethodType with request and response", () => {
    const h: RequestHeader = {
      key: "Content-Type",
      value: "application/json",
      description: "JSON content type",
    };
    const request: JsonRequest = {
      header: [h],
      key: "encrypt",
      value: "aes-256-gcm",
      description: "Encrypt a payload",
    };
    const response: ResponseType = {
      code: 200,
      status: "OK",
      body: JSON.stringify({ ciphertext: "base64..." }),
    };
    const method: MethodType = {
      name: "Encrypt Message",
      request,
      response: [response],
    };
    return method;
  });

  // 6. Compose a collection item (endpoint)
  await task("Compose a CollectionItem endpoint", () => {
    const h: RequestHeader = {
      key: "Content-Type",
      value: "application/json",
      description: "JSON content type",
    };
    const request: JsonRequest = {
      header: [h],
      key: "encrypt",
      value: "aes-256-gcm",
      description: "Encrypt a payload",
    };
    const response: ResponseType = {
      code: 200,
      status: "OK",
      body: JSON.stringify({ ciphertext: "base64..." }),
    };
    const endpoint: CollectionItem = {
      name: "Encrypt",
      request,
      response: [response],
    };
    return endpoint;
  });

  // 7. Compose a folder with nested items
  await task("Compose a CollectionItem folder with nested items", () => {
    const endpoint: CollectionItem = { name: "Encrypt" };
    const folder: CollectionItem = {
      name: "Cryptographic Operations",
      item: [endpoint],
    };
    return folder;
  });

  // 8. Compose a full document
  await task("Compose a full JsonDocument", () => {
    const endpoint: CollectionItem = { name: "Encrypt" };
    const folder: CollectionItem = {
      name: "Cryptographic Operations",
      item: [endpoint],
    };
    const doc: JsonDocument = {
      info: {
        name: "Crypto Service Suite APIs",
        description: "REST APIs for common cryptographic operations",
      },
      item: [folder],
    };
    return doc;
  });

  summary(8);
}

main();
