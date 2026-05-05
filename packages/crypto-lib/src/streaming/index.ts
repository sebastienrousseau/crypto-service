/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

export { createHasher, STREAM_HASH_ALGORITHMS } from "./stream-hash";
export type { StreamingHasher, StreamHashAlgorithm } from "./stream-hash";

export { streamEncrypt, streamDecrypt } from "./stream-aead";
export type {
  StreamEncryptOptions,
  StreamEncryptResult,
  StreamDecryptOptions,
} from "./stream-aead";
