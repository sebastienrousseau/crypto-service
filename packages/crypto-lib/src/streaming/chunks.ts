/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Chunk layout shared by the streaming AEAD constructions.
 */

/**
 * Throw unless `chunkSize` is a positive integer. Zero made encryption
 * loop forever, and NaN or a negative size produced a stream with no
 * chunks, silently dropping the plaintext.
 */
export function assertChunkSize(chunkSize: number): void {
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
    throw new Error(`chunkSize must be a positive integer, got ${chunkSize}`);
  }
}
