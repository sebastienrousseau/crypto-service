/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Cryptographic utilities — constant-time comparison and SecureBuffer.
 */

/**
 * Constant-time comparison of two byte arrays.
 *
 * Returns `true` only when both arrays have the same length and identical
 * contents. The comparison always examines every byte regardless of where
 * a mismatch occurs, preventing timing side-channel attacks.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a[i] as number) ^ (b[i] as number);
  }
  return result === 0;
}

/**
 * A buffer that zeros its contents on `destroy()`.
 *
 * Use this for holding sensitive key material in memory. Call `destroy()`
 * when the key is no longer needed to minimize the window during which
 * key bytes are accessible in the process address space.
 *
 * Note: JavaScript's garbage collector may copy the underlying ArrayBuffer
 * during compaction, so this is a best-effort mitigation, not a guarantee.
 */
export class SecureBuffer {
  private buf: Uint8Array;
  private destroyed = false;

  constructor(data: Uint8Array | string) {
    if (typeof data === "string") {
      this.buf = Buffer.from(data, "hex");
    } else {
      this.buf = new Uint8Array(data);
    }
  }

  /** Number of bytes in the buffer. */
  get length(): number {
    return this.buf.length;
  }

  /** Whether the buffer has been destroyed. */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Get the raw bytes. Throws if destroyed. */
  expose(): Uint8Array {
    if (this.destroyed) {
      throw new Error("SecureBuffer has been destroyed");
    }
    return this.buf;
  }

  /** Get hex-encoded string. Throws if destroyed. */
  toHex(): string {
    if (this.destroyed) {
      throw new Error("SecureBuffer has been destroyed");
    }
    return Buffer.from(this.buf).toString("hex");
  }

  /** Zero the buffer and mark as destroyed. */
  destroy(): void {
    if (!this.destroyed) {
      this.buf.fill(0);
      this.destroyed = true;
    }
  }
}
