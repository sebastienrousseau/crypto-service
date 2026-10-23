/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Byte encodings for crypto-lib: hex, UTF-8, base64 and
 * base64url, and concatenation, without Node's Buffer, so the library runs
 * in browsers and edge runtimes as well as Node.js.
 *
 * Hex is strict: `Buffer.from(hex, "hex")` stopped at the first character
 * that was not hex and dropped a trailing odd nibble, so a lax check let
 * "abc" become one byte and "zz" become none. A string is hex here only if
 * it is all hex digits and has an even length.
 */

import {
  bytesToHex,
  concatBytes,
  hexToBytes as nobleHexToBytes,
} from "@noble/hashes/utils.js";
import { CryptoError, CryptoErrorCode } from "./errors";

/** Hex digits only. */
const HEX_DIGITS = /^[0-9a-fA-F]*$/;

/**
 * Whether `value` is hex: a string of hex digits, an even number of them.
 * Anything else, including a missing value from a JavaScript caller, is
 * not.
 */
export function isHex(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length % 2 === 0 &&
    HEX_DIGITS.test(value)
  );
}

/**
 * Decodes hex, refusing anything {@link isHex} rejects with a CryptoError
 * `INVALID_HEX`.
 */
export function decodeHex(value: string): Uint8Array {
  if (!isHex(value)) {
    throw new CryptoError("Invalid hex string", CryptoErrorCode.INVALID_HEX);
  }
  return nobleHexToBytes(value);
}

/** Lower-case hex of `bytes`. */
export const toHex = (bytes: Uint8Array): string => bytesToHex(bytes);

/** UTF-8 encoding of `text`. */
export const utf8 = (text: string): Uint8Array =>
  new TextEncoder().encode(text);

/** `bytes` decoded as UTF-8 (invalid sequences become U+FFFD). */
export const fromUtf8 = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

/** `parts` joined into one new array. */
export const concat = (parts: readonly Uint8Array[]): Uint8Array =>
  concatBytes(...parts);

/** The base64 alphabet (RFC 4648 section 4). */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** The value of each base64 or base64url character; -1 for any other. */
const B64_VALUE = new Int16Array(128).fill(-1);
for (let i = 0; i < 64; i++) B64_VALUE[B64.charCodeAt(i)] = i;
B64_VALUE["-".charCodeAt(0)] = 62;
B64_VALUE["_".charCodeAt(0)] = 63;

/** Base64 (RFC 4648 section 4, with padding) of `bytes`. */
export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) out += encodeGroup(bytes, i);
  return out;
}

/** Four base64 characters for `bytes[i..i+3]`, "="-padded past the end. */
function encodeGroup(bytes: Uint8Array, i: number): string {
  const n =
    (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
  const chars = [18, 12, 6, 0].map((shift) => B64[(n >> shift) & 63]!);
  // One input byte gives two characters, two give three, three give four.
  return chars
    .slice(0, bytes.length - i + 1)
    .join("")
    .padEnd(4, "=");
}

/** Base64url (RFC 4648 section 5, without padding) of `bytes`. */
export const toBase64url = (bytes: Uint8Array): string =>
  trimPadding(toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_"));

/**
 * Decodes base64 or base64url, with or without padding; whitespace is
 * ignored. Any other character, or a length no encoding produces, is a
 * CryptoError `INVALID_INPUT` (Buffer skipped such characters silently).
 */
export function fromBase64(text: string): Uint8Array {
  const clean = trimPadding(text.replace(/\s+/g, ""));
  if (clean.length % 4 === 1) throw invalidBase64();
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let pending = 0; // bits held in `value`, at most 13
  let value = 0;
  let o = 0;
  for (const char of clean) {
    value = ((value << 6) | base64Value(char)) & 0x3fff;
    pending += 6;
    if (pending >= 8) {
      pending -= 8;
      out[o++] = (value >> pending) & 0xff;
    }
  }
  return out;
}

/** The 6-bit value of a base64 or base64url character. */
function base64Value(char: string): number {
  const code = char.charCodeAt(0);
  const v = code < 128 ? B64_VALUE[code]! : -1;
  if (v < 0) throw invalidBase64();
  return v;
}

/**
 * `text` without its trailing "=" padding. A loop, not /=+$/: the regular
 * expression retried from every "=" of a run that did not end the text,
 * which took quadratic time on untrusted input.
 */
function trimPadding(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === "=") end--;
  return text.slice(0, end);
}

/** The error for text that is not base64. */
const invalidBase64 = (): CryptoError =>
  new CryptoError("Invalid base64 encoding", CryptoErrorCode.INVALID_INPUT);
