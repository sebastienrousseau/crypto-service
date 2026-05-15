/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PASETO v4 — Platform-Agnostic Security Tokens.
 *
 * PASETO is a modern, type-safe alternative to JWT that eliminates
 * algorithm confusion attacks by design. v4 uses:
 * - v4.local: XChaCha20-Poly1305 symmetric encryption
 * - v4.public: Ed25519 digital signatures
 *
 * @example
 * ```ts
 * import { v4local, v4public } from "./tokens/paseto";
 *
 * // Symmetric encryption
 * const key = "aa".repeat(32);
 * const { token } = v4local.encrypt({ key, payload: { sub: "user1" } });
 * const { payload } = v4local.decrypt({ key, token });
 *
 * // Asymmetric signing
 * const { token: signed } = v4public.sign({ secretKey, payload: { sub: "user1" } });
 * const { payload: verified } = v4public.verify({ publicKey, token: signed });
 * ```
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import { blake2b } from "@noble/hashes/blake2.js";

// --- Constants ---

const V4_LOCAL_HEADER = "v4.local.";
const V4_PUBLIC_HEADER = "v4.public.";
const NONCE_LEN = 32;
const EK_LEN = 32;
const N3_LEN = 24;
const SIG_LEN = 64;
const HEX_RE = /^[0-9a-fA-F]*$/;

// --- Types ---

/** Options for encrypting a PASETO v4.local token. */
export interface PasetoLocalEncryptOptions {
  /** Hex-encoded 256-bit symmetric key. */
  key: string;
  /** JSON-serializable payload. */
  payload: Record<string, unknown>;
  /** Optional footer (public, unencrypted but authenticated). */
  footer?: string;
  /** Optional implicit assertions (not transmitted). */
  implicit?: string;
}

/** Options for decrypting a PASETO v4.local token. */
export interface PasetoLocalDecryptOptions {
  /** Hex-encoded 256-bit symmetric key. */
  key: string;
  /** PASETO v4.local token string. */
  token: string;
  /** Optional footer (must match what was used during encryption). */
  footer?: string;
  /** Optional implicit assertions. */
  implicit?: string;
}

/** Options for signing a PASETO v4.public token. */
export interface PasetoPublicSignOptions {
  /** Hex-encoded Ed25519 secret key (64 bytes = seed + public). */
  secretKey: string;
  /** JSON-serializable payload. */
  payload: Record<string, unknown>;
  /** Optional footer. */
  footer?: string;
  /** Optional implicit assertions. */
  implicit?: string;
}

/** Options for verifying a PASETO v4.public token. */
export interface PasetoPublicVerifyOptions {
  /** Hex-encoded Ed25519 public key (32 bytes). */
  publicKey: string;
  /** PASETO v4.public token string. */
  token: string;
  /** Optional footer (must match). */
  footer?: string;
  /** Optional implicit assertions. */
  implicit?: string;
}

/** Result of PASETO token creation. */
export interface PasetoToken {
  /** The full PASETO token string. */
  token: string;
}

/** Result of PASETO token verification / decryption. */
export interface PasetoPayload {
  /** The decoded payload. */
  payload: Record<string, unknown>;
  /** The footer, if present. */
  footer?: string;
}

// --- Helpers ---

/**
 * Pre-Authentication Encoding (PAE).
 *
 * Encodes multiple byte-string pieces into a single unambiguous byte
 * string by prefixing each piece with its LE64 length and the count.
 *
 * @example
 * ```ts
 * const encoded = pae(new Uint8Array([1]), new Uint8Array([2, 3]));
 * ```
 *
 * @param pieces - Byte arrays to encode.
 * @returns The PAE-encoded byte array.
 */
export function pae(...pieces: Uint8Array[]): Uint8Array {
  const le64 = (n: number): Uint8Array => {
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, BigInt(n), true);
    return buf;
  };
  const parts: Uint8Array[] = [le64(pieces.length)];
  for (const p of pieces) {
    parts.push(le64(p.length));
    parts.push(p);
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

function hexToBytes(hex: string): Uint8Array {
  if (!HEX_RE.test(hex)) throw new Error("Invalid hex string");
  return Buffer.from(hex, "hex");
}

function toBase64url(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(s: string): Uint8Array {
  // Restore standard base64 padding
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

const encoder = new TextEncoder();

// --- v4.local ---

/**
 * Encrypt a payload into a PASETO v4.local token.
 *
 * Uses BLAKE2b for nonce derivation and key splitting, then
 * XChaCha20-Poly1305 for authenticated encryption.
 *
 * @example
 * ```ts
 * const key = "aa".repeat(32);
 * const { token } = encrypt({ key, payload: { sub: "user1" } });
 * ```
 *
 * @param opts - Encryption options.
 * @returns The sealed PASETO v4.local token.
 */
function localEncrypt(opts: PasetoLocalEncryptOptions): PasetoToken {
  const { key, payload, footer = "", implicit = "" } = opts;
  const keyBytes = hexToBytes(key);
  if (keyBytes.length !== 32) {
    throw new Error(`Key must be 32 bytes, got ${keyBytes.length}`);
  }

  const header = encoder.encode(V4_LOCAL_HEADER);
  const message = encoder.encode(JSON.stringify(payload));
  const footerBytes = encoder.encode(footer);
  const implicitBytes = encoder.encode(implicit);

  // Step 1: Random nonce material
  const randomN = randomBytes(NONCE_LEN);

  // Step 2: Derive nonce via BLAKE2b(message, key=randomN) → 32 bytes
  const nonce = blake2b(message, { key: randomN, dkLen: NONCE_LEN });

  // Step 3: Split — derive Ek (32 bytes) and n3 (24 bytes) from key || nonce_first_16
  const ekInput = new Uint8Array(keyBytes.length + 16);
  ekInput.set(keyBytes);
  ekInput.set(nonce.subarray(0, 16), keyBytes.length);
  const derived = blake2b(encoder.encode("paseto-encryption-key"), {
    key: ekInput,
    dkLen: EK_LEN + N3_LEN,
  });
  const ek = derived.subarray(0, EK_LEN);
  const n3 = derived.subarray(EK_LEN, EK_LEN + N3_LEN);

  // Step 4: AAD = PAE(header, nonce, footer, implicit)
  const aad = pae(header, nonce, footerBytes, implicitBytes);

  // Step 5: Encrypt with XChaCha20-Poly1305
  const cipher = xchacha20poly1305(ek, n3, aad);
  const ciphertext = cipher.encrypt(message);

  // Step 6: Assemble token = header + base64url(nonce || ciphertext) [+ "." + base64url(footer)]
  const body = new Uint8Array(NONCE_LEN + ciphertext.length);
  body.set(nonce);
  body.set(ciphertext, NONCE_LEN);

  let token = V4_LOCAL_HEADER + toBase64url(body);
  if (footer) {
    token += "." + toBase64url(footerBytes);
  }

  return { token };
}

/**
 * Decrypt a PASETO v4.local token.
 *
 * @example
 * ```ts
 * const key = "aa".repeat(32);
 * const { payload } = decrypt({ key, token });
 * ```
 *
 * @param opts - Decryption options.
 * @returns The decoded payload and optional footer.
 * @throws If the token is invalid, tampered, or the key is wrong.
 */
function localDecrypt(opts: PasetoLocalDecryptOptions): PasetoPayload {
  const { key, token, footer = "", implicit = "" } = opts;
  const keyBytes = hexToBytes(key);
  if (keyBytes.length !== 32) {
    throw new Error(`Key must be 32 bytes, got ${keyBytes.length}`);
  }

  if (!token.startsWith(V4_LOCAL_HEADER)) {
    throw new Error(`Invalid token header: expected "${V4_LOCAL_HEADER}"`);
  }

  const withoutHeader = token.slice(V4_LOCAL_HEADER.length);
  const parts = withoutHeader.split(".");
  const bodyB64 = parts[0]!;
  const footerB64 = parts[1] ?? "";

  // Validate footer match
  const footerBytes = encoder.encode(footer);
  if (footerB64) {
    const tokenFooter = fromBase64url(footerB64);
    if (Buffer.from(tokenFooter).toString("utf8") !== footer) {
      throw new Error("Footer mismatch");
    }
  } else if (footer) {
    throw new Error("Footer mismatch");
  }

  const body = fromBase64url(bodyB64);
  if (body.length < NONCE_LEN + 16) {
    throw new Error("Token body too short");
  }

  const header = encoder.encode(V4_LOCAL_HEADER);
  const implicitBytes = encoder.encode(implicit);

  const nonce = body.subarray(0, NONCE_LEN);
  const ciphertext = body.subarray(NONCE_LEN);

  // Derive Ek and n3 (same as encryption)
  const ekInput = new Uint8Array(keyBytes.length + 16);
  ekInput.set(keyBytes);
  ekInput.set(nonce.subarray(0, 16), keyBytes.length);
  const derived = blake2b(encoder.encode("paseto-encryption-key"), {
    key: ekInput,
    dkLen: EK_LEN + N3_LEN,
  });
  const ek = derived.subarray(0, EK_LEN);
  const n3 = derived.subarray(EK_LEN, EK_LEN + N3_LEN);

  // AAD = PAE(header, nonce, footer, implicit)
  const aad = pae(header, nonce, footerBytes, implicitBytes);

  // Decrypt
  const cipher = xchacha20poly1305(ek, n3, aad);
  const plaintext = cipher.decrypt(ciphertext);

  const payloadStr = Buffer.from(plaintext).toString("utf8");
  const payload = JSON.parse(payloadStr) as Record<string, unknown>;

  return { payload, ...(footer ? { footer } : {}) };
}

// --- v4.public ---

/**
 * Sign a payload into a PASETO v4.public token.
 *
 * Uses Ed25519 digital signatures for authenticity.
 *
 * @example
 * ```ts
 * const { token } = sign({ secretKey, payload: { sub: "user1" } });
 * ```
 *
 * @param opts - Signing options.
 * @returns The signed PASETO v4.public token.
 */
function publicSign(opts: PasetoPublicSignOptions): PasetoToken {
  const { secretKey, payload, footer = "", implicit = "" } = opts;
  const skBytes = hexToBytes(secretKey);
  if (skBytes.length !== 64 && skBytes.length !== 32) {
    throw new Error(`Secret key must be 32 or 64 bytes, got ${skBytes.length}`);
  }

  const header = encoder.encode(V4_PUBLIC_HEADER);
  const message = encoder.encode(JSON.stringify(payload));
  const footerBytes = encoder.encode(footer);
  const implicitBytes = encoder.encode(implicit);

  // m2 = PAE(header, message, footer, implicit)
  const m2 = pae(header, message, footerBytes, implicitBytes);

  // Sign with Ed25519 — use first 32 bytes as seed if 64-byte key
  const seed = skBytes.length === 64 ? skBytes.subarray(0, 32) : skBytes;
  const sig = ed25519.sign(m2, seed);

  // Token = header + base64url(message || signature) [+ "." + base64url(footer)]
  const body = new Uint8Array(message.length + sig.length);
  body.set(message);
  body.set(sig, message.length);

  let token = V4_PUBLIC_HEADER + toBase64url(body);
  if (footer) {
    token += "." + toBase64url(footerBytes);
  }

  return { token };
}

/**
 * Verify a PASETO v4.public token.
 *
 * @example
 * ```ts
 * const { payload } = verify({ publicKey, token });
 * ```
 *
 * @param opts - Verification options.
 * @returns The decoded payload and optional footer.
 * @throws If the signature is invalid or the token is malformed.
 */
function publicVerify(opts: PasetoPublicVerifyOptions): PasetoPayload {
  const { publicKey, token, footer = "", implicit = "" } = opts;
  const pkBytes = hexToBytes(publicKey);
  if (pkBytes.length !== 32) {
    throw new Error(`Public key must be 32 bytes, got ${pkBytes.length}`);
  }

  if (!token.startsWith(V4_PUBLIC_HEADER)) {
    throw new Error(`Invalid token header: expected "${V4_PUBLIC_HEADER}"`);
  }

  const withoutHeader = token.slice(V4_PUBLIC_HEADER.length);
  const parts = withoutHeader.split(".");
  const bodyB64 = parts[0]!;
  const footerB64 = parts[1] ?? "";

  // Validate footer match
  const footerBytes = encoder.encode(footer);
  if (footerB64) {
    const tokenFooter = fromBase64url(footerB64);
    if (Buffer.from(tokenFooter).toString("utf8") !== footer) {
      throw new Error("Footer mismatch");
    }
  } else if (footer) {
    throw new Error("Footer mismatch");
  }

  const body = fromBase64url(bodyB64);
  if (body.length < SIG_LEN) {
    throw new Error("Token body too short");
  }

  const message = body.subarray(0, body.length - SIG_LEN);
  const sig = body.subarray(body.length - SIG_LEN);

  const header = encoder.encode(V4_PUBLIC_HEADER);
  const implicitBytes = encoder.encode(implicit);

  // m2 = PAE(header, message, footer, implicit)
  const m2 = pae(header, message, footerBytes, implicitBytes);

  const valid = ed25519.verify(sig, m2, pkBytes);
  if (!valid) {
    throw new Error("Invalid signature");
  }

  const payloadStr = Buffer.from(message).toString("utf8");
  const payload = JSON.parse(payloadStr) as Record<string, unknown>;

  return { payload, ...(footer ? { footer } : {}) };
}

// --- Public API namespaces ---

/**
 * PASETO v4.local — symmetric authenticated encryption.
 *
 * @example
 * ```ts
 * const { token } = v4local.encrypt({ key, payload: { sub: "user1" } });
 * const { payload } = v4local.decrypt({ key, token });
 * ```
 */
export const v4local = {
  /** Encrypt a payload into a PASETO v4.local token. */
  encrypt: localEncrypt,
  /** Decrypt a PASETO v4.local token. */
  decrypt: localDecrypt,
} as const;

/**
 * PASETO v4.public — Ed25519 digital signatures.
 *
 * @example
 * ```ts
 * const { token } = v4public.sign({ secretKey, payload: { sub: "user1" } });
 * const { payload } = v4public.verify({ publicKey, token });
 * ```
 */
export const v4public = {
  /** Sign a payload into a PASETO v4.public token. */
  sign: publicSign,
  /** Verify a PASETO v4.public token. */
  verify: publicVerify,
} as const;
