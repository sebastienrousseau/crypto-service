/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Runtime detection for edge and serverless environments.
 *
 * Detects the current JavaScript runtime by probing well-known globals
 * and environment markers. The detection order is intentional: more
 * specific runtimes (Cloudflare, Vercel) are checked before generic
 * ones (browser, Node).
 */

import type { EdgeRuntime, RuntimeCapabilities } from "./types";

/**
 * Detect the current JavaScript runtime environment.
 *
 * Detection heuristics (checked in order):
 *
 * 1. **Cloudflare Workers** -- presence of the `caches` global *and*
 *    the `navigator.userAgent` string `"Cloudflare-Workers"`.
 * 2. **Vercel Edge** -- the `EdgeRuntime` global string (set by Vercel).
 * 3. **Deno** -- the `Deno` global namespace.
 * 4. **Bun** -- the `Bun` global namespace.
 * 5. **Browser** -- `window` exists and `document` exists.
 * 6. **Node.js** -- `process.versions.node` exists.
 * 7. **Unknown** -- none of the above matched.
 *
 * @returns The detected {@link EdgeRuntime} identifier.
 */
export function detectRuntime(): EdgeRuntime {
  const g = globalThis as Record<string, unknown>;

  // Cloudflare Workers: navigator.userAgent === "Cloudflare-Workers"
  if (
    typeof g.navigator !== "undefined" &&
    typeof g.navigator.userAgent === "string" &&
    g.navigator.userAgent.includes("Cloudflare-Workers")
  ) {
    return "cloudflare-workers";
  }

  // Vercel Edge Runtime sets a global `EdgeRuntime` string.
  if (typeof g.EdgeRuntime === "string") {
    return "vercel-edge";
  }

  // Deno
  if (typeof g.Deno !== "undefined" && typeof g.Deno.version === "object") {
    return "deno";
  }

  // Bun
  if (typeof g.Bun !== "undefined") {
    return "bun";
  }

  // Browser (window + document)
  if (typeof g.window !== "undefined" && typeof g.document !== "undefined") {
    return "browser";
  }

  // Node.js
  if (
    typeof g.process !== "undefined" &&
    typeof g.process.versions === "object" &&
    typeof g.process.versions.node === "string"
  ) {
    return "node";
  }

  return "unknown";
}

/**
 * Probe the current environment for cryptographic and encoding
 * capabilities.
 *
 * @returns A {@link RuntimeCapabilities} snapshot describing what is
 * available in the current runtime.
 */
export function getCapabilities(): RuntimeCapabilities {
  const g = globalThis as Record<string, unknown>;
  const runtime = detectRuntime();

  const hasWebCrypto = typeof g.crypto !== "undefined" && g.crypto !== null;

  const hasSubtle =
    hasWebCrypto &&
    typeof g.crypto.subtle !== "undefined" &&
    g.crypto.subtle !== null;

  let hasNodeCrypto = false;
  try {
    // In Node.js we can require node:crypto; in other runtimes this
    // will either throw or not exist.
    if (
      typeof g.process !== "undefined" &&
      typeof g.process.versions === "object" &&
      typeof g.process.versions.node === "string"
    ) {
      require("node:crypto");
      hasNodeCrypto = true;
    }
  } catch {
    hasNodeCrypto = false;
  }

  const hasTextEncoder = typeof g.TextEncoder === "function";

  return {
    runtime,
    hasWebCrypto,
    hasSubtle,
    hasNodeCrypto,
    hasTextEncoder,
  };
}

/**
 * Returns `true` when the runtime supports the Web Crypto
 * `crypto.subtle` API, which is required for most edge crypto
 * operations.
 */
export function isEdgeCryptoAvailable(): boolean {
  return getCapabilities().hasSubtle;
}
