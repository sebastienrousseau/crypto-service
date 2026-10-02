/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PASETO v4 — Platform-Agnostic Security Tokens.
 *
 * PASETO is a modern, type-safe alternative to JWT that eliminates
 * algorithm confusion attacks by design. v4 uses:
 * - v4.local: XChaCha20 encryption with a BLAKE2b MAC (encrypt-then-MAC)
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

import { xchacha20 } from "@noble/ciphers/chacha.js";
import { equalBytes, randomBytes } from "@noble/ciphers/utils.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import { blake2b } from "@noble/hashes/blake2.js";

// --- Constants ---

/** PASETO v4.local token prefix. */
const V4_LOCAL_HEADER = "v4.local.";
/** PASETO v4.public token prefix. */
const V4_PUBLIC_HEADER = "v4.public.";
/** PASETO v4.local nonce length in bytes. */
const NONCE_LEN = 32;
/** PASETO v4.local derived encryption key length in bytes. */
const EK_LEN = 32;
/** XChaCha20 nonce (n2) length in bytes. */
const N2_LEN = 24;
/** PASETO v4.local authentication tag length in bytes. */
const TAG_LEN = 32;
/** Ed25519 signature length in bytes. */
const SIG_LEN = 64;
/** Regex matching unpadded base64url. */
const BASE64URL_RE = /^[A-Za-z0-9_-]*$/;
/** Regex matching valid hexadecimal strings. */
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
  return Buffer.from(buf).toString("base64url");
}

/**
 * Decode unpadded base64url strictly, as PASETO requires: padding, other
 * alphabets and non-canonical encodings (unused trailing bits set) are
 * rejected rather than silently accepted.
 */
function fromBase64url(s: string): Uint8Array {
  const bytes = Buffer.from(s, "base64url");
  if (!BASE64URL_RE.test(s) || bytes.toString("base64url") !== s) {
    throw new Error("Invalid base64url encoding");
  }
  return bytes;
}

const encoder = new TextEncoder();

// --- v4.local ---

/** Throw unless `key` is a 32-byte hex key. */
function localKey(key: string): Uint8Array {
  const keyBytes = hexToBytes(key);
  if (keyBytes.length !== 32) {
    throw new Error(`Key must be 32 bytes, got ${keyBytes.length}`);
  }
  return keyBytes;
}

/** BLAKE2b keyed with `key` over `info || nonce`. */
function deriveFromNonce(
  key: Uint8Array,
  info: string,
  nonce: Uint8Array,
  dkLen: number,
): Uint8Array {
  const label = encoder.encode(info);
  const msg = new Uint8Array(label.length + nonce.length);
  msg.set(label);
  msg.set(nonce, label.length);
  return blake2b(msg, { key, dkLen });
}

/**
 * The v4.local subkeys for one nonce: Ek and n2 from
 * BLAKE2b-448("paseto-encryption-key" || n), Ak from
 * BLAKE2b-256("paseto-auth-key-for-aead" || n), both keyed with the key.
 */
function localSubkeys(key: Uint8Array, nonce: Uint8Array) {
  const tmp = deriveFromNonce(
    key,
    "paseto-encryption-key",
    nonce,
    EK_LEN + N2_LEN,
  );
  return {
    ek: tmp.subarray(0, EK_LEN),
    n2: tmp.subarray(EK_LEN),
    ak: deriveFromNonce(key, "paseto-auth-key-for-aead", nonce, TAG_LEN),
  };
}

/** The v4.local tag: BLAKE2b-256 keyed with Ak over PAE(h, n, c, f, i). */
function localTag(
  ak: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  footer: Uint8Array,
  implicit: Uint8Array,
): Uint8Array {
  const preAuth = pae(
    encoder.encode(V4_LOCAL_HEADER),
    nonce,
    ciphertext,
    footer,
    implicit,
  );
  return blake2b(preAuth, { key: ak, dkLen: TAG_LEN });
}

/**
 * Encrypt with a caller-supplied 32-byte nonce. Exposed only so the
 * PASETO test vectors can be reproduced; use {@link v4local.encrypt},
 * which draws the nonce from the CSPRNG.
 *
 * @internal
 */
export function localEncryptWithNonce(
  opts: PasetoLocalEncryptOptions,
  nonce: Uint8Array,
): PasetoToken {
  const { key, payload, footer = "", implicit = "" } = opts;
  const keyBytes = localKey(key);
  if (nonce.length !== NONCE_LEN) {
    throw new Error(`Nonce must be ${NONCE_LEN} bytes, got ${nonce.length}`);
  }
  const footerBytes = encoder.encode(footer);
  const { ek, n2, ak } = localSubkeys(keyBytes, nonce);
  const ciphertext = xchacha20(ek, n2, encoder.encode(JSON.stringify(payload)));
  const tag = localTag(
    ak,
    nonce,
    ciphertext,
    footerBytes,
    encoder.encode(implicit),
  );

  const body = new Uint8Array(NONCE_LEN + ciphertext.length + TAG_LEN);
  body.set(nonce);
  body.set(ciphertext, NONCE_LEN);
  body.set(tag, NONCE_LEN + ciphertext.length);

  let token = V4_LOCAL_HEADER + toBase64url(body);
  if (footer) {
    token += "." + toBase64url(footerBytes);
  }
  return { token };
}

/**
 * Encrypt a payload into a PASETO v4.local token, as specified in the
 * PASETO v4 protocol: XChaCha20 encryption with a BLAKE2b-MAC over
 * PAE(header, nonce, ciphertext, footer, implicit), subkeys derived
 * from a random 32-byte nonce.
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
  return localEncryptWithNonce(opts, randomBytes(NONCE_LEN));
}

/**
 * Throw unless the token's footer (base64url, may be empty) equals
 * `footer`, compared in constant time.
 */
function assertFooter(footerB64: string, footer: string): void {
  const expected = encoder.encode(footer);
  if (!equalBytes(fromBase64url(footerB64), expected)) {
    throw new Error("Footer mismatch");
  }
}

/**
 * Decrypt a PASETO v4.local token. The tag is checked, in constant
 * time, before anything is decrypted.
 *
 * @example
 * ```ts
 * const { payload } = decrypt({ key, token });
 * ```
 *
 * @param opts - Decryption options.
 * @returns The decrypted payload and footer.
 */
function localDecrypt(opts: PasetoLocalDecryptOptions): PasetoPayload {
  const { key, token, footer = "", implicit = "" } = opts;
  const keyBytes = localKey(key);

  if (!token.startsWith(V4_LOCAL_HEADER)) {
    throw new Error(`Invalid token header: expected "${V4_LOCAL_HEADER}"`);
  }

  const parts = token.slice(V4_LOCAL_HEADER.length).split(".");
  assertFooter(parts[1] ?? "", footer);

  const body = fromBase64url(parts[0]!);
  if (body.length < NONCE_LEN + TAG_LEN) {
    throw new Error("Token body too short");
  }
  const nonce = body.subarray(0, NONCE_LEN);
  const ciphertext = body.subarray(NONCE_LEN, body.length - TAG_LEN);
  const tag = body.subarray(body.length - TAG_LEN);

  const { ek, n2, ak } = localSubkeys(keyBytes, nonce);
  const expected = localTag(
    ak,
    nonce,
    ciphertext,
    encoder.encode(footer),
    encoder.encode(implicit),
  );
  if (!equalBytes(tag, expected)) {
    throw new Error("Invalid token: authentication failed");
  }

  const plaintext = xchacha20(ek, n2, ciphertext);
  const payload = JSON.parse(Buffer.from(plaintext).toString("utf8")) as Record<
    string,
    unknown
  >;
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

  assertFooter(footerB64, footer);
  const footerBytes = encoder.encode(footer);

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
