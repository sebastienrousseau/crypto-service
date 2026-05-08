// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Express middleware setup with encrypted request/response pipeline.
 *
 * Demonstrates registering `createCryptoMiddleware` on an Express app
 * with route-scoped encrypt/decrypt operations.
 *
 * Run: `npx ts-node examples/express.ts`
 */

import { header, task, summary } from "./support";
import { createCryptoMiddleware, matchRoute } from "../src";

const CRYPTO_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function main() {
  header("crypto-middleware -- express");

  await task("Create Express crypto middleware", async () => {
    const mw = createCryptoMiddleware({
      key: CRYPTO_KEY,
      routes: ["/api/**"],
      operations: ["decrypt-request", "encrypt-response"],
    });
    if (typeof mw !== "function") throw new Error("Expected middleware function");
  });

  await task("Match /api/** route patterns", async () => {
    const match1 = matchRoute("/api/data", ["/api/**"]);
    const match2 = matchRoute("/api/users/42", ["/api/**"]);
    const noMatch = matchRoute("/health", ["/api/**"]);
    if (!match1 || !match2 || noMatch) throw new Error("Route matching failed");
  });

  await task("Skip non-matching routes", async () => {
    const match = matchRoute("/public/index.html", ["/api/*"]);
    if (match) throw new Error("Should not match /public path");
  });

  summary(3);
}

main();
