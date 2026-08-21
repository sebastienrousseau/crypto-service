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

import { header, task, summary } from "./support";

import type { JsonDocument } from "../src/@types/types";
import {
  createMarkdown,
  readAuthorization,
  readRequest,
  readResponse,
} from "../src/utils";

async function main() {
  header("crypto-api -- utilities");

  // 1. createMarkdown -- convert a full document
  await task("createMarkdown -- convert a full JsonDocument to Markdown", () => {
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
    const markdown = createMarkdown(doc);
    if (!markdown) throw new Error("createMarkdown returned empty string");
    return markdown;
  });

  // 2. readAuthorization -- render auth info
  await task("readAuthorization -- render bearer auth as Markdown table", () => {
    const authMarkdown = readAuthorization({
      bearer: [
        { key: "token", type: "string", value: "eyJhbGciOi..." },
        { key: "expiry", type: "number", value: "3600" },
      ],
      key: "Authorization",
      type: "Bearer",
      value: "eyJhbGciOi...",
    });
    if (!authMarkdown) throw new Error("readAuthorization returned empty string");
    return authMarkdown;
  });

  // 3. readRequest -- render request headers
  await task("readRequest -- render request headers as Markdown table", () => {
    const reqMarkdown = readRequest({
      header: [
        { key: "Content-Type", value: "application/json", description: "JSON" },
        { key: "X-Request-Id", value: "uuid-1234", description: "Trace ID" },
      ],
      key: "encrypt",
      value: "aes-256-gcm",
      description: "Encrypt endpoint",
    });
    if (!reqMarkdown) throw new Error("readRequest returned empty string");
    return reqMarkdown;
  });

  // 4. readResponse -- render response table
  await task("readResponse -- render response codes as Markdown table", () => {
    const resMarkdown = readResponse([
      { code: 200, status: "OK", body: '{"result":"success"}' },
      { code: 400, status: "Bad Request", body: '{"error":"invalid input"}' },
    ]);
    if (!resMarkdown) throw new Error("readResponse returned empty string");
    return resMarkdown;
  });

  // 5. Edge cases -- empty / undefined input
  await task("Edge cases -- empty and undefined inputs return empty strings", () => {
    const r1 = createMarkdown(null as unknown as JsonDocument);
    const r2 = readAuthorization(undefined);
    const r3 = readRequest(undefined);
    const r4 = readResponse(undefined);
    if (r1 !== "" || r2 !== "" || r3 !== "" || r4 !== "") {
      throw new Error("Expected empty strings for undefined inputs");
    }
    return true;
  });

  summary(5);
}

main();
