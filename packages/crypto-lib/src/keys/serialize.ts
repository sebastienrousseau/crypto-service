/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Key serialization — hex, base64, base64url, JWK, PEM.
 *
 * Provides lossless conversion between key formats commonly used in
 * web applications, infrastructure tools, and standards like JWT/JOSE.
 */

import { sha256 } from "@noble/hashes/sha256";

// ─── Raw format conversions ────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error("Invalid hex string");
  if (hex.length % 2 !== 0) throw new Error("Hex string must have even length");
  return Buffer.from(hex, "hex");
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  return Buffer.from(b64, "base64");
}

export function bytesToBase64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  return Buffer.from(b64 + "=".repeat(pad), "base64");
}

// ─── PEM ───────────────────────────────────────────────────────────

export type PemLabel =
  | "PUBLIC KEY"
  | "PRIVATE KEY"
  | "CERTIFICATE"
  | "ED25519 PRIVATE KEY"
  | "ED25519 PUBLIC KEY"
  | "X25519 PRIVATE KEY"
  | "X25519 PUBLIC KEY";

/**
 * Encode raw bytes into PEM format with the given label.
 */
export function encodePem(label: PemLabel, der: Uint8Array): string {
  const b64 = Buffer.from(der).toString("base64");
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.slice(i, i + 64));
  }
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/**
 * Decode PEM to raw bytes.  Returns the DER content and the label.
 */
export function decodePem(pem: string): { label: string; data: Uint8Array } {
  const match = pem.match(
    /-----BEGIN ([A-Z0-9 ]+)-----\s*([\s\S]+?)\s*-----END \1-----/,
  );
  if (!match) throw new Error("Invalid PEM format");
  const label = match[1]!;
  const b64 = match[2]!.replace(/\s/g, "");
  return { label, data: Buffer.from(b64, "base64") };
}

// ─── JWK ───────────────────────────────────────────────────────────

export interface Jwk {
  kty: string;
  crv?: string;
  alg?: string;
  use?: string;
  kid?: string;
  x?: string;
  d?: string;
  [key: string]: unknown;
}

/**
 * Export an Ed25519 key pair as JWK.
 */
export function ed25519ToJwk(
  publicKeyHex: string,
  privateKeyHex?: string,
): Jwk {
  const pub = hexToBytes(publicKeyHex);
  const jwk: Jwk = {
    kty: "OKP",
    crv: "Ed25519",
    alg: "EdDSA",
    x: bytesToBase64url(pub),
  };
  if (privateKeyHex) {
    jwk.d = bytesToBase64url(hexToBytes(privateKeyHex));
  }
  return jwk;
}

/**
 * Export an X25519 key pair as JWK.
 */
export function x25519ToJwk(publicKeyHex: string, privateKeyHex?: string): Jwk {
  const pub = hexToBytes(publicKeyHex);
  const jwk: Jwk = {
    kty: "OKP",
    crv: "X25519",
    alg: "ECDH-ES",
    x: bytesToBase64url(pub),
  };
  if (privateKeyHex) {
    jwk.d = bytesToBase64url(hexToBytes(privateKeyHex));
  }
  return jwk;
}

/**
 * Import a JWK to raw hex key(s).
 */
export function jwkToHex(jwk: Jwk): { publicKey: string; privateKey?: string } {
  if (!jwk.x) throw new Error("JWK missing 'x' (public key) field");
  const pub = base64urlToBytes(jwk.x);
  const result: { publicKey: string; privateKey?: string } = {
    publicKey: bytesToHex(pub),
  };
  if (jwk.d) {
    result.privateKey = bytesToHex(base64urlToBytes(jwk.d));
  }
  return result;
}

/**
 * Compute a JWK Thumbprint (RFC 7638) using SHA-256.
 */
export function jwkThumbprint(jwk: Jwk): string {
  // Per RFC 7638: lexicographic order of required members
  let members: Record<string, unknown>;
  if (jwk.kty === "OKP") {
    members = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
  } else if (jwk.kty === "EC") {
    members = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk["y"] };
  } else {
    members = { kty: jwk.kty };
  }
  const json = JSON.stringify(members, Object.keys(members).sort());
  const digest = sha256(Buffer.from(json, "utf8"));
  return bytesToBase64url(digest);
}
