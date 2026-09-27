/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Polyfills for missing APIs in constrained edge runtimes.
 *
 * Some lightweight edge runtimes (e.g., very minimal WASM-based
 * isolates) may lack `TextEncoder`, `TextDecoder`, `btoa`/`atob`, or
 * `crypto.getRandomValues`. This module provides pure-JavaScript
 * fallbacks that are installed **only** when the native API is absent.
 *
 * Call {@link installPolyfills} once at application startup.
 *
 * **Note:** The `crypto.getRandomValues` polyfill uses a non-CSPRNG
 * `Math.random` fallback and should only be used for testing or
 * non-security-critical scenarios. A warning is logged to the console
 * when this fallback is activated.
 */

// ---------------------------------------------------------------------------
// TextEncoder / TextDecoder polyfill
// ---------------------------------------------------------------------------

/**
 * Encode a single Unicode code point into UTF-8 bytes and push to array.
 */
function pushUtf8Bytes(codePoint: number, bytes: number[]): void {
  if (codePoint < 0x80) {
    bytes.push(codePoint);
    return;
  }
  if (codePoint < 0x800) {
    bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    return;
  }
  if (codePoint < 0x10000) {
    bytes.push(
      0xe0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    );
    return;
  }
  bytes.push(
    0xf0 | (codePoint >> 18),
    0x80 | ((codePoint >> 12) & 0x3f),
    0x80 | ((codePoint >> 6) & 0x3f),
    0x80 | (codePoint & 0x3f),
  );
}

/**
 * Decode a single Unicode code point from UTF-8 bytes at index `i`.
 * Returns a tuple of [codePoint, nextIndex].
 */
function readUtf8CodePoint(bytes: Uint8Array, i: number): [number, number] {
  const b0 = bytes[i];
  if (b0 < 0x80) {
    return [b0, i + 1];
  }
  if ((b0 & 0xe0) === 0xc0) {
    return [((b0 & 0x1f) << 6) | (bytes[i + 1] & 0x3f), i + 2];
  }
  if ((b0 & 0xf0) === 0xe0) {
    return [
      ((b0 & 0x0f) << 12) |
        ((bytes[i + 1] & 0x3f) << 6) |
        (bytes[i + 2] & 0x3f),
      i + 3,
    ];
  }
  return [
    ((b0 & 0x07) << 18) |
      ((bytes[i + 1] & 0x3f) << 12) |
      ((bytes[i + 2] & 0x3f) << 6) |
      (bytes[i + 3] & 0x3f),
    i + 4,
  ];
}

/**
 * Convert a Unicode code point to a UTF-16 character or surrogate pair.
 */
function codePointToString(codePoint: number): string {
  if (codePoint <= 0xffff) {
    return String.fromCharCode(codePoint);
  }
  const cp = codePoint - 0x10000;
  return String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
}

/**
 * Minimal UTF-8 `TextEncoder` polyfill.
 *
 * Encodes a JavaScript string into a UTF-8 `Uint8Array`. Handles the
 * full BMP and supplementary planes (surrogate pairs).
 */
class TextEncoderPolyfill {
  /** The encoding used by this encoder, always `"utf-8"`. */
  readonly encoding = "utf-8";

  /**
   * Encode a string into a UTF-8 `Uint8Array`.
   */
  encode(input: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
      let codePoint = input.charCodeAt(i);

      // Handle surrogate pairs
      if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
        const low = input.charCodeAt(i + 1);
        if (low >= 0xdc00 && low <= 0xdfff) {
          codePoint = ((codePoint - 0xd800) << 10) + (low - 0xdc00) + 0x10000;
          i++;
        }
      }

      pushUtf8Bytes(codePoint, bytes);
    }
    return new Uint8Array(bytes);
  }
}

/**
 * Minimal UTF-8 `TextDecoder` polyfill.
 *
 * Decodes a UTF-8 `Uint8Array` back to a JavaScript string.
 */
class TextDecoderPolyfill {
  /** The encoding used by this decoder, always `"utf-8"`. */
  readonly encoding = "utf-8";

  /**
   * Decode a UTF-8 byte buffer into a string.
   */
  decode(input?: ArrayBufferView | ArrayBuffer): string {
    if (!input) return "";

    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);

    let result = "";
    let i = 0;

    while (i < bytes.length) {
      const [codePoint, nextI] = readUtf8CodePoint(bytes, i);
      result += codePointToString(codePoint);
      i = nextI;
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// btoa / atob polyfill
// ---------------------------------------------------------------------------

/** Standard Base64 alphabet used by the btoa/atob polyfills. */
const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a 3-byte chunk (with optional NaN padding) into 4 Base64 characters.
 */
function encodeBase64Triplet(a: number, b: number, c: number): string {
  const idx1 = a >> 2;
  const idx2 = ((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4);
  const char3 = isNaN(b)
    ? "="
    : BASE64_CHARS[((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6)];
  const char4 = isNaN(c) ? "=" : BASE64_CHARS[c & 63];
  return BASE64_CHARS[idx1] + BASE64_CHARS[idx2] + char3 + char4;
}

/**
 * Pure-JavaScript `btoa` replacement. Encodes a binary string to
 * Base64.
 */
function btoaPolyfill(input: string): string {
  let result = "";
  let i = 0;

  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = i < input.length ? input.charCodeAt(i++) : NaN;
    const c = i < input.length ? input.charCodeAt(i++) : NaN;
    result += encodeBase64Triplet(a, b, c);
  }

  return result;
}

/**
 * Pure-JavaScript `atob` replacement. Decodes a Base64 string to a
 * binary string.
 */
function atobPolyfill(input: string): string {
  let str = input;
  while (str.endsWith("=")) {
    str = str.slice(0, -1);
  }
  let result = "";

  for (let i = 0; i < str.length; i += 4) {
    const a = BASE64_CHARS.indexOf(str[i]);
    const b = BASE64_CHARS.indexOf(str[i + 1]);
    const c = BASE64_CHARS.indexOf(str[i + 2]);
    const d = BASE64_CHARS.indexOf(str[i + 3]);

    const bits = (a << 18) | (b << 12) | (c << 6) | d;

    result += String.fromCharCode((bits >> 16) & 0xff);
    if (c !== -1) result += String.fromCharCode((bits >> 8) & 0xff);
    if (d !== -1) result += String.fromCharCode(bits & 0xff);
  }

  return result;
}

// ---------------------------------------------------------------------------
// crypto.getRandomValues polyfill (INSECURE -- testing only)
// ---------------------------------------------------------------------------

/**
 * **INSECURE** `Math.random`-based fallback for
 * `crypto.getRandomValues`. This is NOT cryptographically secure and
 * must only be used in environments where no CSPRNG is available (e.g.,
 * unit tests in constrained runtimes).
 */
function insecureGetRandomValues<T extends ArrayBufferView>(array: T): T {
  const bytes = new Uint8Array(
    array.buffer,
    array.byteOffset,
    array.byteLength,
  );
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

/** Tracks whether polyfills have been installed. */
let _installed = false;

/**
 * Install polyfills for missing global APIs.
 *
 * Safe to call multiple times -- subsequent calls are no-ops.
 *
 * @returns An object describing which polyfills were installed.
 *
 * @example
 * ```ts
 * import { installPolyfills } from "@sebastienrousseau/crypto-edge";
 *
 * const installed = installPolyfills();
 * console.log(installed.textEncoder); // true if polyfill was needed
 * ```
 */
export function installPolyfills(): {
  /** Whether the `TextEncoder` polyfill was installed. */
  textEncoder: boolean;
  /** Whether the `TextDecoder` polyfill was installed. */
  textDecoder: boolean;
  /** Whether the `btoa` polyfill was installed. */
  btoa: boolean;
  /** Whether the `atob` polyfill was installed. */
  atob: boolean;
  /** Whether the insecure `crypto.getRandomValues` polyfill was installed. */
  getRandomValues: boolean;
} {
  if (_installed) {
    return {
      textEncoder: false,
      textDecoder: false,
      btoa: false,
      atob: false,
      getRandomValues: false,
    };
  }

  const g = globalThis as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const result = {
    textEncoder: false,
    textDecoder: false,
    btoa: false,
    atob: false,
    getRandomValues: false,
  };

  if (typeof g.TextEncoder !== "function") {
    g.TextEncoder = TextEncoderPolyfill;
    result.textEncoder = true;
  }

  if (typeof g.TextDecoder !== "function") {
    g.TextDecoder = TextDecoderPolyfill;
    result.textDecoder = true;
  }

  if (typeof g.btoa !== "function") {
    g.btoa = btoaPolyfill;
    result.btoa = true;
  }

  if (typeof g.atob !== "function") {
    g.atob = atobPolyfill;
    result.atob = true;
  }

  if (
    typeof g.crypto === "undefined" ||
    typeof g.crypto.getRandomValues !== "function"
  ) {
    if (typeof g.crypto === "undefined") {
      g.crypto = {};
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[crypto-edge] Installing INSECURE Math.random-based polyfill for " +
        "crypto.getRandomValues. Do NOT use this in production.",
    );
    g.crypto.getRandomValues = insecureGetRandomValues;
    result.getRandomValues = true;
  }

  _installed = true;
  return result;
}

/**
 * Reset the internal installation flag. Useful for testing.
 * @internal
 *
 * @example
 * ```ts
 * import { _resetPolyfillState, installPolyfills } from "@aspect/crypto-edge";
 *
 * _resetPolyfillState();
 * const result = installPolyfills(); // re-runs polyfill detection
 * ```
 */
export function _resetPolyfillState(): void {
  _installed = false;
}

// Export polyfill classes/functions for direct use if needed.
export {
  TextEncoderPolyfill,
  TextDecoderPolyfill,
  btoaPolyfill,
  atobPolyfill,
  insecureGetRandomValues,
};
