/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Access to Node.js's `crypto` without importing it.
 */

import type * as NodeCrypto from "node:crypto";

/**
 * Node.js's `crypto` module, loaded at run time so that bundlers for
 * browsers and edge runtimes never see an import of it; null there, and
 * on Node.js before 22.3, which lacks `process.getBuiltinModule`.
 */
export function runtimeCrypto(): typeof NodeCrypto | null {
  const runtime = (
    globalThis as {
      process?: { getBuiltinModule?: (id: string) => unknown };
    }
  ).process;
  const crypto = runtime?.getBuiltinModule?.("node:crypto");
  return (crypto ?? null) as typeof NodeCrypto | null;
}
