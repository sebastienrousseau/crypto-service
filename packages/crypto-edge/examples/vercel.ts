/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Vercel Edge Function example.
 *
 * Demonstrates how to use crypto-edge inside a Vercel Edge Function.
 * Place this file at `app/api/crypto/route.ts` (App Router) or
 * `pages/api/crypto.ts` (Pages Router with `export const config =
 * { runtime: "edge" }`).
 *
 * ```ts
 * // app/api/crypto/route.ts
 * export { GET } from "./handler";
 * export const runtime = "edge";
 * ```
 */

import {
  detectRuntime,
  getCapabilities,
  hash,
  sign,
  verify,
} from "../src";

/**
 * Vercel Edge Function handler.
 */
export async function GET(request: Request): Promise<Response> {
  const runtime = detectRuntime();
  const caps = getCapabilities();
  const url = new URL(request.url);
  const message = url.searchParams.get("message") || "hello vercel edge";

  // Hash the message
  const digest = await hash("SHA-256", message);

  // HMAC sign and verify
  const hmacKey = new Uint8Array(32);
  crypto.getRandomValues(hmacKey);

  const data = new TextEncoder().encode(message);
  const signature = await sign({ key: hmacKey, data });
  const valid = await verify({ key: hmacKey, data, signature });

  return new Response(
    JSON.stringify({
      runtime,
      capabilities: caps,
      message,
      sha256: digest,
      hmac: {
        signatureLength: signature.length,
        verified: valid,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Export the edge runtime config for Vercel.
 */
export const config = {
  runtime: "edge" as const,
};
