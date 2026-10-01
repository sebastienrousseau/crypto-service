// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Versioned key material and the ciphertext envelope shared by the
 * in-memory providers (`LocalKmsProvider`, `Pkcs11HsmProvider`).
 *
 * Rotation appends a version instead of replacing the material, so data
 * encrypted or signed under an earlier version stays usable until that
 * version is explicitly destroyed.
 *
 * Ciphertext layout (base64 of):
 *
 * | Bytes | Field                                |
 * | :---- | :----------------------------------- |
 * | 1     | format, `0x01`                       |
 * | 4     | key version, unsigned big-endian     |
 * | 12    | AES-GCM IV                           |
 * | 16    | AES-GCM tag                          |
 * | rest  | AES-256-GCM ciphertext               |
 *
 * The AAD is the 5-byte header followed by the canonical encryption
 * context, so the version cannot be swapped and context key order does
 * not matter.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import {
  generateEd25519KeyPair,
  ed25519Sign,
  ed25519Verify,
  hexToBytes,
} from "@sebastienrousseau/crypto-lib";
import { KmsError } from "../errors";

/** Ciphertext format identifier. */
const FORMAT_V1 = 0x01;
/** Format byte plus 32-bit key version. */
const HEADER_LEN = 5;
const IV_LEN = 12;
const TAG_LEN = 16;
const ED25519_SIG_LEN = 64;

/** One generation of key material. */
export interface KeyVersion {
  /** 1-based version number. */
  readonly version: number;
  /** When this version was created (ISO 8601). */
  readonly createdAt: string;
  /** Secret material; `undefined` once the version is destroyed. */
  material: Uint8Array | undefined;
  /** Ed25519 public key for signing keys. */
  readonly publicKey: Uint8Array | undefined;
}

/** All versions of one key; `versions[n - 1]` is version `n`. */
export interface VersionedKey {
  readonly usage: "encrypt" | "sign" | "wrap";
  readonly versions: KeyVersion[];
}

/** Generate fresh material for the given usage. */
function newVersion(usage: VersionedKey["usage"], version: number): KeyVersion {
  const createdAt = new Date().toISOString();
  if (usage === "sign") {
    const kp = generateEd25519KeyPair();
    return {
      version,
      createdAt,
      material: hexToBytes(kp.privateKey),
      publicKey: hexToBytes(kp.publicKey),
    };
  }
  return {
    version,
    createdAt,
    material: randomBytes(32),
    publicKey: undefined,
  };
}

/** Create a key with a single version (version 1). */
export function createVersionedKey(usage: VersionedKey["usage"]): VersionedKey {
  return { usage, versions: [newVersion(usage, 1)] };
}

/** The version used for new encryptions and signatures. */
export function currentVersion(key: VersionedKey): KeyVersion {
  return key.versions[key.versions.length - 1] as KeyVersion;
}

/** Add a new current version; earlier versions are kept. */
export function rotateVersionedKey(key: VersionedKey): KeyVersion {
  const next = newVersion(key.usage, key.versions.length + 1);
  key.versions.push(next);
  return next;
}

/** Return the material of a version, or throw if it is unknown or destroyed. */
function materialOf(
  key: VersionedKey,
  version: number,
  keyId: string,
): Uint8Array {
  const entry = key.versions[version - 1];
  if (!entry) {
    throw new KmsError(
      "NOT_FOUND",
      `Key version ${version} not found for key ${keyId}`,
      keyId,
    );
  }
  if (!entry.material) {
    throw new KmsError(
      "VERSION_DESTROYED",
      `Key version ${version} of key ${keyId} has been destroyed`,
      keyId,
    );
  }
  return entry.material;
}

/**
 * Destroy the material of a non-current version. Ciphertext and signatures
 * produced under it can no longer be decrypted or verified.
 */
export function destroyVersion(
  key: VersionedKey,
  version: number,
  keyId: string,
): void {
  materialOf(key, version, keyId);
  if (version === currentVersion(key).version) {
    throw new KmsError(
      "INVALID_ARGUMENT",
      `Cannot destroy the current version (${version}) of key ${keyId}; rotate first`,
      keyId,
    );
  }
  (key.versions[version - 1] as KeyVersion).material = undefined;
}

/**
 * Encode an encryption context independently of its key order.
 *
 * Entries are sorted by key (UTF-16 code-unit order) and serialised as a
 * JSON array of `[key, value]` pairs. An absent or empty context encodes
 * to zero bytes. Non-string values are rejected rather than coerced.
 */
export function canonicalContext(context?: Record<string, string>): Buffer {
  const entries = Object.entries(context ?? {});
  if (entries.length === 0) return Buffer.alloc(0);
  for (const [k, v] of entries) {
    if (typeof v !== "string") {
      throw new KmsError(
        "INVALID_ARGUMENT",
        `Encryption context value for '${k}' must be a string`,
      );
    }
  }
  entries.sort(([a], [b]) => (a < b ? -1 : 1));
  return Buffer.from(JSON.stringify(entries), "utf8");
}

/** Build the 5-byte envelope header for a key version. */
function header(version: number): Buffer {
  const h = Buffer.alloc(HEADER_LEN);
  h[0] = FORMAT_V1;
  h.writeUInt32BE(version, 1);
  return h;
}

/** Encrypt under the current version; returns base64 ciphertext and version. */
export function sealCurrent(
  key: VersionedKey,
  plaintext: Uint8Array,
  context?: Record<string, string>,
): { ciphertext: string; version: number } {
  const aadContext = canonicalContext(context);
  const { version, material } = currentVersion(key);
  const head = header(version);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", material as Uint8Array, iv);
  cipher.setAAD(Buffer.concat([head, aadContext]));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const packed = Buffer.concat([head, iv, cipher.getAuthTag(), body]);
  return { ciphertext: packed.toString("base64"), version };
}

/** Parse the envelope header, rejecting truncated or foreign input. */
function parseEnvelope(ciphertext: string, keyId: string) {
  const data = Buffer.from(ciphertext, "base64");
  if (data.length < HEADER_LEN + IV_LEN + TAG_LEN) {
    throw new KmsError("INVALID_CIPHERTEXT", "Ciphertext too short", keyId);
  }
  if (data[0] !== FORMAT_V1) {
    throw new KmsError(
      "INVALID_CIPHERTEXT",
      "Unsupported ciphertext format",
      keyId,
    );
  }
  return {
    head: data.subarray(0, HEADER_LEN),
    version: data.readUInt32BE(1),
    iv: data.subarray(HEADER_LEN, HEADER_LEN + IV_LEN),
    tag: data.subarray(HEADER_LEN + IV_LEN, HEADER_LEN + IV_LEN + TAG_LEN),
    body: data.subarray(HEADER_LEN + IV_LEN + TAG_LEN),
  };
}

/** Decrypt with the version named in the ciphertext. */
export function openVersioned(
  key: VersionedKey,
  keyId: string,
  ciphertext: string,
  context?: Record<string, string>,
): { plaintext: Uint8Array; version: number } {
  const aadContext = canonicalContext(context);
  const env = parseEnvelope(ciphertext, keyId);
  const material = materialOf(key, env.version, keyId);
  const decipher = createDecipheriv("aes-256-gcm", material, env.iv);
  decipher.setAuthTag(env.tag);
  decipher.setAAD(Buffer.concat([env.head, aadContext]));
  try {
    const out = Buffer.concat([decipher.update(env.body), decipher.final()]);
    return { plaintext: new Uint8Array(out), version: env.version };
  } catch {
    throw new KmsError("DECRYPTION_FAILED", "Decryption failed", keyId);
  }
}

/**
 * The message the providers sign: `data` itself, so signatures are plain
 * Ed25519 and verify with any standard implementation. (Releases before
 * 0.0.7 signed the UTF-8 bytes of the hex encoding of `data`.)
 */
function signedMessage(data: Uint8Array): Uint8Array {
  return data;
}

/** Sign with the current version; returns the raw 64-byte signature. */
export function signCurrent(key: VersionedKey, data: Uint8Array): Uint8Array {
  const { material } = currentVersion(key);
  const { signature } = ed25519Sign(
    material as Uint8Array,
    signedMessage(data),
  );
  return hexToBytes(signature);
}

/**
 * Verify against every version whose material has not been destroyed.
 * Malformed signatures verify as `false`.
 */
export function verifyAnyVersion(
  key: VersionedKey,
  data: Uint8Array,
  signature: Uint8Array,
): boolean {
  if (signature.length !== ED25519_SIG_LEN) return false;
  return key.versions.some(
    (v) =>
      v.material !== undefined &&
      ed25519Verify(v.publicKey as Uint8Array, signedMessage(data), signature)
        .valid,
  );
}
