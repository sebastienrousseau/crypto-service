// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * CryptoProvider context setup and access.
 *
 * Demonstrates how CryptoProvider supplies shared configuration
 * (defaultKey, serverUrl, apiKey) to all hooks via React context.
 *
 * Run: `npx ts-node examples/provider.ts`
 */

import { header, task, summary } from "./support";
import { CryptoProvider, useCryptoContext } from "../src";

async function main() {
  header("crypto-react -- provider");

  await task("Inspect CryptoProvider export", () => {
    if (typeof CryptoProvider !== "function") {
      throw new Error("CryptoProvider is not a function");
    }
  });

  await task("Inspect useCryptoContext export", () => {
    if (typeof useCryptoContext !== "function") {
      throw new Error("useCryptoContext is not a function");
    }
  });

  await task("Verify default context returns empty object", () => {
    // Outside a provider, context defaults to {}
    const ctx = useCryptoContext();
    if (ctx.defaultKey !== undefined) {
      throw new Error("Expected defaultKey to be undefined");
    }
    if (ctx.serverUrl !== undefined) {
      throw new Error("Expected serverUrl to be undefined");
    }
    if (ctx.apiKey !== undefined) {
      throw new Error("Expected apiKey to be undefined");
    }
  });

  summary(3);
}

main();
