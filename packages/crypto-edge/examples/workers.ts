// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Cloudflare Workers example for crypto-edge.
 *
 * Deploy this as a Worker script to hash, encrypt, or sign data at the edge.
 *
 * Run: `npx ts-node examples/workers.ts`
 */

import {
  detectRuntime,
  hash,
  encrypt,
  decrypt,
  generateKey,
} from "../src";
import { header, task, taskWithOutput, summary } from "./support";

/**
 * Cloudflare Workers fetch handler.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const runtime = detectRuntime();
    const url = new URL(request.url);
    const action = url.pathname.slice(1) || "hash";

    switch (action) {
      case "hash": {
        const body = await request.text();
        const digest = await hash("SHA-256", body || "hello from the edge");
        return new Response(
          JSON.stringify({ runtime, action: "hash", digest }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      case "encrypt": {
        const body = await request.text();
        const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
        const { ciphertext } = await encrypt({
          key,
          plaintext: new TextEncoder().encode(body || "secret"),
        });
        const plaintext = await decrypt({ key, ciphertext });
        const decoded = new TextDecoder().decode(plaintext);
        return new Response(
          JSON.stringify({
            runtime,
            action: "encrypt-decrypt",
            original: body || "secret",
            decrypted: decoded,
            match: decoded === (body || "secret"),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      default:
        return new Response(
          JSON.stringify({
            runtime,
            error: `Unknown action: ${action}`,
            available: ["hash", "encrypt"],
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
    }
  },
};

async function main() {
  header("crypto-edge -- workers");

  await taskWithOutput("Detect runtime", () => {
    return [detectRuntime()];
  });

  await taskWithOutput("SHA-256 hash", async () => {
    const digest = await hash("SHA-256", "hello from the edge");
    return [digest];
  });

  await taskWithOutput("AES-GCM encrypt and decrypt", async () => {
    const key = await generateKey({ algorithm: "AES-GCM", length: 256 });
    const message = "secret";
    const { ciphertext } = await encrypt({
      key,
      plaintext: new TextEncoder().encode(message),
    });
    const plaintext = await decrypt({ key, ciphertext });
    const decoded = new TextDecoder().decode(plaintext);
    return [
      `decrypted: "${decoded}"`,
      `match:     ${decoded === message}`,
    ];
  });

  summary(3);
}

main();
