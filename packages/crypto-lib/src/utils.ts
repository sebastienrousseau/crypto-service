/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Cryptographic utilities — constant-time comparison and SecureBuffer.
 */

import { CryptoError, CryptoErrorCode } from "./errors";

/**
 * Constant-time comparison of two byte arrays.
 *
 * Returns `true` only when both arrays have the same length and identical
 * contents. The comparison always examines every byte regardless of where
 * a mismatch occurs, preventing timing side-channel attacks.
 *
 * @param a - First byte array to compare.
 * @param b - Second byte array to compare.
 * @returns `true` if `a` and `b` are identical, `false` otherwise.
 *
 * @example
 * ```ts
 * import { timingSafeEqual } from "@sebastienrousseau/crypto-lib";
 *
 * const mac1 = new Uint8Array([1, 2, 3]);
 * const mac2 = new Uint8Array([1, 2, 3]);
 * timingSafeEqual(mac1, mac2); // true
 * ```
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
 *
 * @example
 * ```ts
 * import { SecureBuffer } from "@sebastienrousseau/crypto-lib";
 *
 * const key = new SecureBuffer(randomBytes(32));
 * doSomething(key.expose());
 * key.destroy();
 * ```
 */
export class SecureBuffer {
  private buf: Uint8Array;
  private destroyed = false;

  /**
   * Create a new SecureBuffer from raw bytes or a hex string.
   *
   * @param data - The key material as a `Uint8Array` or hex-encoded string.
   *
   * @example
   * ```ts
   * const buf = new SecureBuffer("abcdef0123456789".repeat(4));
   * ```
   */
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

  /**
   * Get the raw bytes.
   *
   * @returns The underlying `Uint8Array`.
   * @throws {CryptoError} If the buffer has already been destroyed.
   *
   * @example
   * ```ts
   * const buf = new SecureBuffer(new Uint8Array([1, 2, 3]));
   * buf.expose(); // Uint8Array([1, 2, 3])
   * ```
   */
  expose(): Uint8Array {
    if (this.destroyed) {
      throw new CryptoError(
        "SecureBuffer has been destroyed",
        CryptoErrorCode.BUFFER_DESTROYED,
      );
    }
    return this.buf;
  }

  /**
   * Get hex-encoded string.
   *
   * @returns The buffer contents as a lowercase hex string.
   * @throws {CryptoError} If the buffer has already been destroyed.
   *
   * @example
   * ```ts
   * const buf = new SecureBuffer(new Uint8Array([0xab, 0xcd]));
   * buf.toHex(); // "abcd"
   * ```
   */
  toHex(): string {
    if (this.destroyed) {
      throw new CryptoError(
        "SecureBuffer has been destroyed",
        CryptoErrorCode.BUFFER_DESTROYED,
      );
    }
    return Buffer.from(this.buf).toString("hex");
  }

  /**
   * Zero the buffer and mark as destroyed.
   *
   * After calling this method, any subsequent calls to `expose()` or
   * `toHex()` will throw a `CryptoError`.
   *
   * @example
   * ```ts
   * const buf = new SecureBuffer(new Uint8Array(32));
   * buf.destroy();
   * buf.isDestroyed; // true
   * ```
   */
  destroy(): void {
    if (!this.destroyed) {
      this.buf.fill(0);
      this.destroyed = true;
    }
  }
}
