/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

export * as secretbox from "./secretbox";
/** Re-exported secretbox result type. */
export type { SecretboxResult } from "./secretbox";

export * as sealedbox from "./sealedbox";
/** Re-exported sealed-box result types. */
export type { SealedBoxResult, PqSealedBoxResult } from "./sealedbox";

export { passwordEncrypt, passwordDecrypt } from "./password-encrypt";
/** Re-exported password encryption option and result types. */
export type {
  PasswordEncryptOptions,
  PasswordEncryptResult,
} from "./password-encrypt";

export {
  aesKwWrap,
  aesKwUnwrap,
  aesKwpWrap,
  aesKwpUnwrap,
  x25519AesKwWrap,
  x25519AesKwUnwrap,
} from "./key-wrap";
/** Re-exported AES key-wrap result types. */
export type { AesKwWrapResult, X25519AesKwWrapResult } from "./key-wrap";

export {
  multiEncrypt,
  multiDecryptClassical,
  multiDecryptPQ,
} from "./multi-recipient";
/** Re-exported multi-recipient encryption types. */
export type {
  ClassicalRecipient,
  PqRecipient,
  Recipient,
  WrappedKey,
  MultiRecipientEncryptResult,
} from "./multi-recipient";
