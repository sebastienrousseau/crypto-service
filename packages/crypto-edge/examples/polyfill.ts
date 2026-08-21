// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Demonstrates polyfill installation for constrained runtimes.
 *
 * Run: `npx ts-node examples/polyfill.ts`
 */

import { installPolyfills, detectRuntime, getCapabilities } from "../src";
import { header, task, taskWithOutput, summary } from "./support";

async function main() {
  header("crypto-edge -- polyfill");

  await taskWithOutput("Detect current runtime", () => {
    const runtime = detectRuntime();
    return [`runtime: ${runtime}`];
  });

  await taskWithOutput("Install polyfills", () => {
    const result = installPolyfills();
    return [
      `textEncoder:     ${result.textEncoder}`,
      `textDecoder:     ${result.textDecoder}`,
      `btoa:            ${result.btoa}`,
      `atob:            ${result.atob}`,
      `getRandomValues: ${result.getRandomValues}`,
    ];
  });

  await taskWithOutput("Detect capabilities after polyfill installation", () => {
    const caps = getCapabilities();
    return [
      `runtime:        ${caps.runtime}`,
      `hasWebCrypto:   ${caps.hasWebCrypto}`,
      `hasSubtle:      ${caps.hasSubtle}`,
      `hasNodeCrypto:  ${caps.hasNodeCrypto}`,
      `hasTextEncoder: ${caps.hasTextEncoder}`,
    ];
  });

  summary(3);
}

main();
