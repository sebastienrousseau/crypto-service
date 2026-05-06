// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Barrel export for @sebastienrousseau/crypto-vue.
 *
 * Re-exports the Vue plugin and all composables.
 */

// Plugin
export { CryptoPlugin, CryptoSymbol } from "./plugin";
export type { CryptoPluginOptions } from "./plugin";

// Composables
export { useKeypair } from "./composables/useKeypair";
export type { UseKeypairReturn } from "./composables/useKeypair";

export { useEncrypt } from "./composables/useEncrypt";
export type { UseEncryptReturn } from "./composables/useEncrypt";

export { useHash } from "./composables/useHash";
export type { UseHashReturn, HashAlgorithm } from "./composables/useHash";

export { useSignature } from "./composables/useSignature";
export type {
  UseSignatureReturn,
  SignAlgorithm,
} from "./composables/useSignature";
