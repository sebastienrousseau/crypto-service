// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Check WASM availability and capabilities in the current runtime.
 *
 * Run: `npx ts-node examples/detect.ts`
 */

import {
  detectCapabilities,
  isWasmSupported,
  isStreamingSupported,
  isSimdSupported,
} from "../src";

function main() {
  console.log("\n=== crypto-wasm — detect ===\n");

  console.log("Individual checks:");
  console.log(`  WebAssembly supported:  ${isWasmSupported()}`);
  console.log(`  Streaming supported:    ${isStreamingSupported()}`);
  console.log(`  SIMD supported:         ${isSimdSupported()}`);

  console.log("\nAll capabilities:");
  const caps = detectCapabilities();
  console.log(caps);

  if (caps.wasmSupported) {
    console.log(
      "\nThis runtime supports WebAssembly. Install the compiled",
    );
    console.log(
      "WASM module (wasm/crypto_accel.wasm) for acceleration.",
    );
  } else {
    console.log("\nWebAssembly is NOT supported in this runtime.");
    console.log("crypto-lib will use the pure-JS fallback.");
  }

  console.log("\nDone.");
}

main();
