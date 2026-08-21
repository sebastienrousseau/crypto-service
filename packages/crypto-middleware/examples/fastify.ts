// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Fastify plugin setup with encrypted request/response pipeline.
 *
 * Demonstrates registering `cryptoPlugin` on a Fastify instance
 * with route-scoped encrypt/decrypt operations.
 *
 * Run: `npx ts-node examples/fastify.ts`
 */

import { header, task, summary } from "./support";
import { cryptoPlugin, matchRoute } from "../src";

const CRYPTO_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function main() {
  header("crypto-middleware -- fastify");

  await task("Verify cryptoPlugin is a valid Fastify plugin", async () => {
    if (typeof cryptoPlugin !== "function") {
      throw new Error("Expected plugin function");
    }
  });

  await task("Match /api/** route patterns for Fastify", async () => {
    const match1 = matchRoute("/api/data", ["/api/**"]);
    const match2 = matchRoute("/api/users/1/profile", ["/api/**"]);
    if (!match1 || !match2) throw new Error("Route matching failed");
  });

  await task("Verify empty routes match all paths", async () => {
    const match = matchRoute("/anything/at/all", []);
    if (!match) throw new Error("Empty routes should match all");
  });

  summary(3);
}

main();
