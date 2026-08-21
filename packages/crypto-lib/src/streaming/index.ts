/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

export { createHasher, STREAM_HASH_ALGORITHMS } from "./stream-hash";
/** Re-exported streaming hasher interface and algorithm type. */
export type { StreamingHasher, StreamHashAlgorithm } from "./stream-hash";

export { streamEncrypt, streamDecrypt } from "./stream-aead";
/** Re-exported stream AEAD option and result types. */
export type {
  StreamEncryptOptions,
  StreamEncryptResult,
  StreamDecryptOptions,
} from "./stream-aead";

export {
  createEncryptStream,
  createDecryptStream,
  createHashStream,
  WEB_STREAM_HASH_ALGORITHMS,
} from "./web-streams";
/** Re-exported web stream option and result types. */
export type {
  WebStreamHashAlgorithm,
  HashStreamResult,
  EncryptStreamOptions,
  DecryptStreamOptions,
} from "./web-streams";
