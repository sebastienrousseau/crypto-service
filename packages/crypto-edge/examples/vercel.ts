// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Vercel Edge Function example for crypto-edge.
 *
 * Place this file at `app/api/crypto/route.ts` (App Router) or
 * `pages/api/crypto.ts` (Pages Router with `export const config =
 * { runtime: "edge" }`).
 *
 * Run: `npx ts-node examples/vercel.ts`
 */

import {
  detectRuntime,
  getCapabilities,
  hash,
  sign,
  verify,
} from "../src";
import { header, task, taskWithOutput, summary } from "./support";

/**
 * Vercel Edge Function handler.
 */
export async function GET(request: Request): Promise<Response> {
  const runtime = detectRuntime();
  const caps = getCapabilities();
  const url = new URL(request.url);
  const message = url.searchParams.get("message") || "hello vercel edge";

  const digest = await hash("SHA-256", message);

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
      hmac: { signatureLength: signature.length, verified: valid },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Export the edge runtime config for Vercel.
 */
export const config = {
  runtime: "edge" as const,
};

async function main() {
  header("crypto-edge -- vercel");

  await taskWithOutput("Detect runtime", () => {
    return [detectRuntime()];
  });

  await taskWithOutput("SHA-256 hash", async () => {
    const digest = await hash("SHA-256", "hello vercel edge");
    return [digest];
  });

  await taskWithOutput("HMAC sign and verify", async () => {
    const hmacKey = new Uint8Array(32);
    crypto.getRandomValues(hmacKey);
    const data = new TextEncoder().encode("hello vercel edge");
    const signature = await sign({ key: hmacKey, data });
    const valid = await verify({ key: hmacKey, data, signature });
    return [
      `signature length: ${signature.length}`,
      `verified:         ${valid}`,
    ];
  });

  summary(3);
}

main();
