// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Field codec shared by the middleware and the Client Extension.
 *
 * Stored format (`v2`):
 *
 *   "v2:" || base64(nonce (24 B) || ciphertext || Poly1305 tag (16 B))
 *
 * sealed with XChaCha20-Poly1305 under a subkey derived from the
 * configured key with HKDF-SHA-256 (info `crypto-prisma/enc/v2`), and
 * with associated data `crypto-prisma/v2:<Model>.<field>`, so a value
 * cannot be moved to another model or field without failing to decrypt.
 *
 * Legacy format (written before `v2`): the bare base64 sealed box under
 * the configured key, with no associated data. It is still read (unless
 * `acceptLegacyCiphertext` is `false`) and never written.
 */

import {
  secretbox,
  computeHmac,
  kdfDerive,
} from "@sebastienrousseau/crypto-lib";
import { FieldDecryptionError } from "./errors";
import type { EncryptionConfig } from "./types";

/** Prefix that marks the current ciphertext format. */
export const CIPHERTEXT_PREFIX = "v2:";

/** A 256-bit key written as 64 hexadecimal characters. */
const HEX_KEY_RE = /^[0-9a-fA-F]{64}$/;

/** Plain record shape the codec reads and writes. */
type Rec = Record<string, unknown>;

/** Keys and options resolved once from an {@link EncryptionConfig}. */
interface CodecState {
  /** Configured key: legacy decryption and the legacy blind index. */
  legacyKey: string;
  /** HKDF subkey used to seal and open `v2` values. */
  encKey: string;
  /** Key used for the HMAC blind index. */
  bidxKey: string;
  /** Fields stored as a blind index. */
  deterministicFields: string[];
  /** Whether non-ciphertext values pass through on read. */
  allowPlaintextFallback: boolean;
  /** Whether legacy (pre-`v2`) ciphertexts are accepted on read. */
  acceptLegacyCiphertext: boolean;
}

/**
 * Encrypts and decrypts the configured fields of a model's records.
 *
 * @example
 * ```ts
 * const codec = createFieldCodec({ key, encryptedFields: [] });
 * codec.encryptRecord("User", ["email"], { email: "a@example.com" });
 * ```
 */
export interface FieldCodec {
  /** Encrypt `fields` of a record, or of each record in an array, in place. */
  encryptRecord(model: string, fields: string[], data: unknown): void;
  /** Decrypt `fields` of a record, or of each record in an array, in place. */
  decryptRecord(model: string, fields: string[], data: unknown): void;
  /** Replace blind-index field values in a `where` clause with their MAC. */
  encryptWhere(model: string, fields: string[], where: unknown): void;
}

/** Derive a 256-bit hex subkey from the configured key with HKDF-SHA-256. */
function deriveSubkey(key: string, info: string): string {
  return kdfDerive({
    algorithm: "hkdf-sha256",
    password: Buffer.from(key, "hex"),
    salt: new Uint8Array(32),
    params: { info },
  }).derivedKey;
}

/** Validate the configuration and derive the keys once. */
function resolveState(config: EncryptionConfig): CodecState {
  const { key } = config;
  if (!HEX_KEY_RE.test(key)) {
    throw new Error(
      "Encryption key must be a 64-character hex string (256 bits).",
    );
  }
  return {
    legacyKey: key,
    encKey: deriveSubkey(key, "crypto-prisma/enc/v2"),
    bidxKey:
      config.blindIndexKeyDerivation === "hkdf"
        ? deriveSubkey(key, "crypto-prisma/bidx/v1")
        : key,
    deterministicFields: config.deterministicFields ?? [],
    allowPlaintextFallback: config.allowPlaintextFallback === true,
    acceptLegacyCiphertext: config.acceptLegacyCiphertext !== false,
  };
}

/** Associated data that binds a ciphertext to its model and field. */
function fieldAad(model: string, field: string): Uint8Array {
  return Buffer.from(`crypto-prisma/v2:${model}.${field}`, "utf8");
}

/** Serialise a non-null field value to the string that gets protected. */
function toPlaintext(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Encrypt one field value (or compute its blind index). */
function encryptValue(
  state: CodecState,
  model: string,
  field: string,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return value;
  const plaintext = toPlaintext(value);
  if (state.deterministicFields.includes(field)) {
    return computeHmac({
      algorithm: "sha256",
      key: state.bidxKey,
      data: plaintext,
    }).mac;
  }
  const { sealed } = secretbox.seal(
    state.encKey,
    plaintext,
    fieldAad(model, field),
  );
  return CIPHERTEXT_PREFIX + sealed;
}

/** Open a sealed box, returning `undefined` instead of throwing. */
function tryOpen(
  key: string,
  sealed: string,
  aad?: Uint8Array,
): string | undefined {
  try {
    return Buffer.from(secretbox.open(key, sealed, aad)).toString("utf8");
  } catch {
    return undefined;
  }
}

/** Decrypt a stored string, failing closed unless an opt-in applies. */
function openStored(
  state: CodecState,
  model: string,
  field: string,
  stored: string,
): string {
  if (stored.startsWith(CIPHERTEXT_PREFIX)) {
    const body = stored.slice(CIPHERTEXT_PREFIX.length);
    const plain = tryOpen(state.encKey, body, fieldAad(model, field));
    if (plain === undefined) throw new FieldDecryptionError(model, field);
    return plain;
  }
  const legacy = state.acceptLegacyCiphertext
    ? tryOpen(state.legacyKey, stored)
    : undefined;
  if (legacy !== undefined) return legacy;
  if (state.allowPlaintextFallback) return stored;
  throw new FieldDecryptionError(model, field);
}

/** Decrypt one field value; blind-index fields return the stored MAC. */
function decryptValue(
  state: CodecState,
  model: string,
  field: string,
  value: unknown,
): unknown {
  if (typeof value !== "string") return value;
  if (state.deterministicFields.includes(field)) return value;
  return openStored(state, model, field, value);
}

/** Apply `fn` to `data` if it is a record, or to each record of an array. */
function forEachRecord(data: unknown, fn: (record: Rec) => void): void {
  const records = Array.isArray(data) ? data : [data];
  for (const record of records) {
    if (record && typeof record === "object") fn(record as Rec);
  }
}

/** Replace each configured field present in `record` with `map(field, value)`. */
function mapFields(
  record: Rec,
  fields: string[],
  map: (field: string, value: unknown) => unknown,
): void {
  for (const field of fields) {
    if (field in record) record[field] = map(field, record[field]);
  }
}

/**
 * Build a {@link FieldCodec} from an {@link EncryptionConfig}, validating
 * the key and deriving the subkeys once.
 *
 * @throws If the key is not a 64-character hex string.
 *
 * @example
 * ```ts
 * const codec = createFieldCodec({
 *   key: process.env.FIELD_ENCRYPTION_KEY!,
 *   encryptedFields: [{ model: "User", fields: ["email"] }],
 * });
 * ```
 */
export function createFieldCodec(config: EncryptionConfig): FieldCodec {
  const state = resolveState(config);
  return {
    encryptRecord(model, fields, data) {
      forEachRecord(data, (record) =>
        mapFields(record, fields, (field, value) =>
          encryptValue(state, model, field, value),
        ),
      );
    },
    decryptRecord(model, fields, data) {
      forEachRecord(data, (record) =>
        mapFields(record, fields, (field, value) =>
          decryptValue(state, model, field, value),
        ),
      );
    },
    encryptWhere(model, fields, where) {
      const searchable = fields.filter((f) =>
        state.deterministicFields.includes(f),
      );
      forEachRecord(where, (record) =>
        mapFields(record, searchable, (field, value) =>
          typeof value === "string"
            ? encryptValue(state, model, field, value)
            : value,
        ),
      );
    },
  };
}
