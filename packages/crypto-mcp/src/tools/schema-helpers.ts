// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPToolParameterProperty } from "../types";
import { KEY_HANDLE_PATTERN } from "./keystore";

/** Largest data, plaintext or algorithm-list string a tool accepts. */
export const MAX_TEXT_LENGTH = 1_048_576;

/** Largest PEM or armored key a tool accepts. */
export const MAX_KEY_LENGTH = 16_384;

/** Whole bytes, hex-encoded. */
export const HEX_BYTES = "^(?:[0-9a-fA-F]{2})*$";

/** Hex characters of an X25519 public key (32 bytes). */
export const X25519_PUBLIC_KEY_HEX = 64;

/** Hex characters of an ML-KEM-768 public key (1184 bytes). */
export const ML_KEM_768_PUBLIC_KEY_HEX = 2368;

/** Sentence appended to every tool that issues a key handle. */
export const HANDLE_NOTE =
  "Secret key material stays inside the server; only an opaque keyHandle is returned.";

/** A key handle issued by this server. */
export function keyHandle(description: string): MCPToolParameterProperty {
  return {
    type: "string",
    description: `${description} Key handles look like 'kh_' followed by 32 hex characters.`,
    maxLength: 35,
    pattern: KEY_HANDLE_PATTERN,
  };
}

/** Free text up to {@link MAX_TEXT_LENGTH}. */
export function text(description: string): MCPToolParameterProperty {
  return { type: "string", description, maxLength: MAX_TEXT_LENGTH };
}

/** Hex of exactly `length` characters, or up to `length` when `upTo`. */
export function hex(
  description: string,
  length: number,
  upTo = false,
): MCPToolParameterProperty {
  return {
    type: "string",
    description,
    minLength: upTo ? 2 : length,
    maxLength: length,
    pattern: HEX_BYTES,
  };
}

/** A string restricted to `values`. */
export function oneOf(
  description: string,
  values: string[],
): MCPToolParameterProperty {
  return { type: "string", description, enum: values };
}
