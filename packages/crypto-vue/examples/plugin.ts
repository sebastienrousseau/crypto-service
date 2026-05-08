// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * CryptoPlugin installation and injection key inspection.
 *
 * Demonstrates that the Vue plugin and its injection symbol are
 * exported correctly and can be used with `app.use()`.
 *
 * Run: `npx ts-node examples/plugin.ts`
 */

import { header, task, summary } from "./support";
import { CryptoPlugin, CryptoSymbol } from "../src";

async function main() {
  header("crypto-vue -- plugin");

  await task("Inspect CryptoPlugin export", () => {
    if (!CryptoPlugin || typeof CryptoPlugin.install !== "function") {
      throw new Error("CryptoPlugin is not a valid Vue plugin");
    }
  });

  await task("Inspect CryptoSymbol injection key", () => {
    if (typeof CryptoSymbol !== "symbol") {
      throw new Error("CryptoSymbol is not a Symbol");
    }
  });

  await task("Verify plugin has install method", () => {
    if (typeof CryptoPlugin.install !== "function") {
      throw new Error("CryptoPlugin.install is not a function");
    }
  });

  summary(3);
}

main();
