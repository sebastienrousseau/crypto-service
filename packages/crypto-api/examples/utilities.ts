// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using exported utility functions.
 *
 * Demonstrates how to use the Markdown-generation utilities shipped by
 * crypto-api to convert a Postman-style JSON collection into readable
 * Markdown documentation.
 *
 * Run: `npx ts-node examples/utilities.ts`
 */

import type { JsonDocument } from "../src/@types/types";
import {
  createMarkdown,
  readAuthorization,
  readRequest,
  readResponse,
} from "../src/utils";

function main() {
  console.log("\n=== crypto-api — utilities ===\n");

  // 1. createMarkdown — convert a full document
  const doc: JsonDocument = {
    info: {
      name: "Crypto Service Suite APIs",
      description: "REST APIs for common cryptographic operations.",
    },
    item: [
      {
        name: "Key Generation",
        item: [
          {
            name: "Generate Ed25519 Key Pair",
            request: {
              header: [
                {
                  key: "Content-Type",
                  value: "application/json",
                  description: "JSON content type",
                },
              ],
              key: "generate",
              value: "ed25519",
              description: "## Generate Keys\n",
            },
            response: [
              {
                code: 200,
                status: "OK",
                body: '{\n  "publicKey": "base64...",\n  "secretKey": "base64..."\n}',
              },
            ],
          },
        ],
      },
    ],
  };

  console.log("--- createMarkdown ---");
  const markdown = createMarkdown(doc);
  console.log(markdown);

  // 2. readAuthorization — render auth info
  console.log("--- readAuthorization ---");
  const authMarkdown = readAuthorization({
    bearer: [
      { key: "token", type: "string", value: "eyJhbGciOi..." },
      { key: "expiry", type: "number", value: "3600" },
    ],
    key: "Authorization",
    type: "Bearer",
    value: "eyJhbGciOi...",
  });
  console.log(authMarkdown || "(empty — no bearer data)");

  // 3. readRequest — render request headers
  console.log("--- readRequest ---");
  const reqMarkdown = readRequest({
    header: [
      { key: "Content-Type", value: "application/json", description: "JSON" },
      { key: "X-Request-Id", value: "uuid-1234", description: "Trace ID" },
    ],
    key: "encrypt",
    value: "aes-256-gcm",
    description: "Encrypt endpoint",
  });
  console.log(reqMarkdown || "(empty — no headers)");

  // 4. readResponse — render response table
  console.log("--- readResponse ---");
  const resMarkdown = readResponse([
    { code: 200, status: "OK", body: '{"result":"success"}' },
    { code: 400, status: "Bad Request", body: '{"error":"invalid input"}' },
  ]);
  console.log(resMarkdown || "(empty — no responses)");

  // 5. Edge case — empty / undefined input
  console.log("--- edge cases ---");
  console.log("createMarkdown(null):", JSON.stringify(createMarkdown(null as unknown as JsonDocument)));
  console.log("readAuthorization(undefined):", JSON.stringify(readAuthorization(undefined)));
  console.log("readRequest(undefined):", JSON.stringify(readRequest(undefined)));
  console.log("readResponse(undefined):", JSON.stringify(readResponse(undefined)));

  console.log("\nDone.");
}

main();
