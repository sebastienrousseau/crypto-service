// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Barrel export for @sebastienrousseau/crypto-vue.
 *
 * Re-exports the Vue plugin and all composables.
 */

// Plugin
export { CryptoPlugin, CryptoSymbol } from "./plugin";
/** Re-exported plugin options type from the plugin module. */
export type { CryptoPluginOptions } from "./plugin";

// Composables
export { useKeypair } from "./composables/useKeypair";
/** Re-exported keypair composable return type. */
export type { UseKeypairReturn } from "./composables/useKeypair";

export { useEncrypt } from "./composables/useEncrypt";
/** Re-exported encrypt composable return type. */
export type { UseEncryptReturn } from "./composables/useEncrypt";

export { useHash } from "./composables/useHash";
/** Re-exported hash composable return and algorithm types. */
export type { UseHashReturn, HashAlgorithm } from "./composables/useHash";

export { useSignature } from "./composables/useSignature";
/** Re-exported signature composable return and algorithm types. */
export type {
  UseSignatureReturn,
  SignAlgorithm,
} from "./composables/useSignature";
