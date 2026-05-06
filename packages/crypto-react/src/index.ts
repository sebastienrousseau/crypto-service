// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Barrel exports for @sebastienrousseau/crypto-react.
 *
 * React hooks for client-side cryptography -- key generation, encryption,
 * signing, and hashing in a single import.
 */

// Context provider
export {
  CryptoProvider,
  useCryptoContext,
  type CryptoContextValue,
  type CryptoProviderProps,
} from "./provider";

// Hooks
export { useKeypair, type UseKeypairResult } from "./hooks/useKeypair";
export { useEncrypt, type UseEncryptResult } from "./hooks/useEncrypt";
export { useHash, type UseHashResult } from "./hooks/useHash";
export { useSignature, type UseSignatureResult } from "./hooks/useSignature";
