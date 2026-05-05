/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

export * as secretbox from "./secretbox";
export type { SecretboxResult } from "./secretbox";

export * as sealedbox from "./sealedbox";
export type { SealedBoxResult, PqSealedBoxResult } from "./sealedbox";

export { passwordEncrypt, passwordDecrypt } from "./password-encrypt";
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
export type { AesKwWrapResult, X25519AesKwWrapResult } from "./key-wrap";

export {
  multiEncrypt,
  multiDecryptClassical,
  multiDecryptPQ,
} from "./multi-recipient";
export type {
  ClassicalRecipient,
  PqRecipient,
  Recipient,
  WrappedKey,
  MultiRecipientEncryptResult,
} from "./multi-recipient";
