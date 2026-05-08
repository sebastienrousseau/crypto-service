// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Detect the current JavaScript runtime and inspect its capabilities.
 *
 * Run: `npx ts-node examples/detect.ts`
 */

import { detectRuntime, getCapabilities, isEdgeCryptoAvailable } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

async function main() {
  header("crypto-edge -- detect");

  const runtime = await task("Detect runtime", () => detectRuntime());

  const caps = await task("Get capabilities", () => getCapabilities());

  await taskWithOutput("Print capability matrix", () => [
    `runtime:        ${caps.runtime}`,
    `hasWebCrypto:   ${caps.hasWebCrypto}`,
    `hasSubtle:      ${caps.hasSubtle}`,
    `hasNodeCrypto:  ${caps.hasNodeCrypto}`,
    `hasTextEncoder: ${caps.hasTextEncoder}`,
  ]);

  await taskWithOutput("Check Web Crypto availability", () => {
    const available = isEdgeCryptoAvailable();
    return [available
      ? `Web Crypto API is available on ${runtime}`
      : "Web Crypto API is NOT available"];
  });

  summary(4);
}

main();
