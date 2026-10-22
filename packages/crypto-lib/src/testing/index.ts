/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Test hooks: reset crypto-lib's cached runtime detection and
 * keystore, or force a detection result, so a test can exercise each path.
 * They are for test suites only, and live in this `./testing` subpath so
 * the library's main entry points carry no test-only API.
 *
 * @example
 * ```ts
 * import { resetKeystore } from "@sebastienrousseau/crypto-lib/testing";
 * process.env.CRYPTO_KEY_DIR = otherDir;
 * resetKeystore();
 * ```
 */

export { _resetKeystoreForTests as resetKeystore } from "../key/keystore";
export {
  resetNativePqcCache,
  _forceNativePqcDetected as forceNativePqcDetected,
} from "../accel/native-pqc-bridge";
export { _resetWasmDetection as resetWasmDetection } from "../accel/wasm-bridge";
export { _resetModernWebCryptoDetection as resetModernWebCryptoDetection } from "../accel/webcrypto-modern";
