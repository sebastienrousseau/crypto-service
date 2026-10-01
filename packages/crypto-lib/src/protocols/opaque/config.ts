/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OPAQUE configuration: the (OPRF, KDF, MAC, Hash, Group) suite,
 * the key stretching function and the shared context string
 * (RFC 9807 § 7). Client and server must use the same configuration.
 */

import { CryptoError } from "../../errors";
import { DEFAULT_KSF } from "./ksf";
import type { Ksf } from "./ksf";
import { OpaqueErrorCode, getSuite, toBytes } from "./suite";
import type { Suite, SuiteId } from "./suite";

/** Configuration shared by client and server. Every field is optional. */
export interface OpaqueConfig {
  /** Ciphersuite. Default: `"P256-SHA256"`. */
  suite?: SuiteId;
  /**
   * Key stretching function. Default: scrypt with the RFC 9807 § 7
   * parameters (`scryptKsf()`). Only the client runs it.
   */
  ksf?: Ksf;
  /**
   * Shared context string bound into the handshake transcript, e.g.
   * `"myapp-v1"` (RFC 9807 § 6.4.2.1). Default: empty. Not sent on the
   * wire; at most 65535 bytes.
   */
  context?: Uint8Array | string;
}

/** A configuration with defaults applied. @internal */
export interface ResolvedConfig {
  s: Suite;
  ksf: Ksf;
  context: Uint8Array;
}

/** Apply defaults and check limits. @internal */
export function resolveConfig(config: OpaqueConfig): ResolvedConfig {
  const context = toBytes(config.context ?? new Uint8Array(0));
  if (context.length > 0xffff) {
    throw new CryptoError(
      "OPAQUE context must be at most 65535 bytes",
      OpaqueErrorCode.INVALID_INPUT,
    );
  }
  return {
    s: getSuite(config.suite ?? "P256-SHA256"),
    ksf: config.ksf ?? DEFAULT_KSF,
    context,
  };
}
