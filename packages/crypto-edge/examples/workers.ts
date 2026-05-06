/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Cloudflare Workers example.
 *
 * Demonstrates how to use crypto-edge inside a Cloudflare Workers
 * handler. Deploy this as a Worker script to hash, encrypt, or sign
 * data at the edge.
 *
 * ```bash
 * wrangler deploy examples/workers.ts
 * ```
 */

import {
  detectRuntime,
  hash,
  encrypt,
  decrypt,
  generateKey,
} from "../src";

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
