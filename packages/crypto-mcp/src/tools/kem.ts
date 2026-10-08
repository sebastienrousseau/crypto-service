// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import {
  MlKemLevel,
  hybridKemDecapsulate,
  hybridKemEncapsulate,
  mlKemDecap,
  mlKemEncap,
  unwrapDekHybrid,
  wrapDekHybrid,
} from "@sebastienrousseau/crypto-lib";
import { keyStore, symmetricKey } from "./keystore";
import { ToolHandler, jsonResult } from "./result";

/*
 * ML-KEM (FIPS 203) and Hybrid KEM (RFC 9180/10024, X25519 + ML-KEM).
 * The shared secret is a 256-bit key: it goes into the key store as a
 * `symmetric-256` key, usable with crypto_encrypt, and only its handle
 * is returned.
 */

function resolveKemLevel(
  levelArg: unknown,
  defaultLevel: MlKemLevel = 768,
): MlKemLevel {
  const num = Number(levelArg);
  if (num === 512 || num === 768 || num === 1024) {
    return num;
  }
  return defaultLevel;
}

function inferLevelFromKey(keyKind: string): MlKemLevel {
  if (keyKind === "ml-kem-512") return 512;
  if (keyKind === "ml-kem-1024") return 1024;
  return 768;
}

/** `crypto_kem_encapsulate`: encapsulate to an ML-KEM public key (512, 768, 1024). */
export const kemEncapsulate: ToolHandler = async (args) => {
  const level = resolveKemLevel(args.level, 768);
  const { ciphertext, sharedSecret, algorithm } = mlKemEncap(
    level,
    String(args.publicKey),
  );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} encapsulation`,
    ),
  );
  return jsonResult({ algorithm, ciphertext, keyHandle });
};

/** `crypto_kem_decapsulate`: decapsulate with an ML-KEM key handle (512, 768, 1024). */
export const kemDecapsulate: ToolHandler = async (args) => {
  const key = keyStore.use(String(args.keyHandle), [
    "ml-kem-512",
    "ml-kem-768",
    "ml-kem-1024",
  ]);
  const defaultLevel = inferLevelFromKey(key.kind);
  const level = resolveKemLevel(args.level, defaultLevel);
  const { sharedSecret, algorithm } = mlKemDecap(
    level,
    (key.secret as Buffer).toString("hex"),
    String(args.ciphertext),
  );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} decapsulation`,
    ),
  );
  return jsonResult({ algorithm, keyHandle });
};

/** `crypto_hybrid_kem_encapsulate`: hybrid post-quantum encapsulation (X25519 + ML-KEM). */
export const hybridKemEncapsulateHandler: ToolHandler = async (args) => {
  const level = resolveKemLevel(args.level, 768);
  const { x25519EphemeralPublic, mlKemCiphertext, sharedSecret, algorithm } =
    hybridKemEncapsulate(
      level,
      String(args.x25519PublicKey),
      String(args.mlKemPublicKey),
    );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} encapsulation`,
    ),
  );
  return jsonResult({
    algorithm,
    x25519EphemeralPublic,
    mlKemCiphertext,
    keyHandle,
  });
};

/** `crypto_hybrid_kem_decapsulate`: hybrid post-quantum decapsulation (X25519 + ML-KEM). */
export const hybridKemDecapsulateHandler: ToolHandler = async (args) => {
  const xKey = keyStore.use(String(args.x25519KeyHandle), ["x25519"]);
  const kemKey = keyStore.use(String(args.mlKemKeyHandle), [
    "ml-kem-512",
    "ml-kem-768",
    "ml-kem-1024",
  ]);
  const defaultLevel = inferLevelFromKey(kemKey.kind);
  const level = resolveKemLevel(args.level, defaultLevel);
  const { sharedSecret, algorithm } = hybridKemDecapsulate(
    level,
    (xKey.secret as Buffer).toString("hex"),
    (kemKey.secret as Buffer).toString("hex"),
    String(args.x25519EphemeralPublic),
    String(args.mlKemCiphertext),
  );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} decapsulation`,
    ),
  );
  return jsonResult({ algorithm, keyHandle });
};

interface HybridRecipientInput {
  id?: string;
  x25519PublicKey: string;
  mlKemPublicKey: string;
}

function parseHybridRecipients(raw: unknown): HybridRecipientInput[] {
  const parsed = JSON.parse(String(raw));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "recipients must be a non-empty array of recipient objects",
    );
  }
  return parsed as HybridRecipientInput[];
}

/** `crypto_hybrid_kem_multi_encapsulate`: multi-recipient post-quantum hybrid KEM encapsulation. */
export const hybridKemMultiEncapsulateHandler: ToolHandler = async (args) => {
  const recipients = parseHybridRecipients(args.recipients);
  let dek: Buffer;
  let keyHandle: string;

  if (args.keyHandle !== undefined && args.keyHandle !== null) {
    keyHandle = String(args.keyHandle);
    const stored = keyStore.use(keyHandle, ["symmetric-256"]);
    dek = Buffer.from(stored.secret as Buffer);
  } else {
    dek = crypto.randomBytes(32);
    keyHandle = keyStore.add(
      symmetricKey(dek, "multi-recipient hybrid KEM DEK"),
    );
  }

  const encryptedRecipients = recipients.map((r) => {
    const wrapped = wrapDekHybrid(
      dek,
      String(r.x25519PublicKey),
      String(r.mlKemPublicKey),
    );
    return {
      ...(r.id !== undefined ? { id: String(r.id) } : {}),
      ephemeralPublicKey: wrapped.ephemeralPublicKey,
      mlKemCiphertext: wrapped.mlKemCiphertext,
      wrappedKey: wrapped.wrappedKey,
      encryptedKey: wrapped.wrappedKey,
    };
  });

  return jsonResult({
    algorithm: "multi-hybrid-kem-768-aes-256-gcm",
    keyHandle,
    recipients: encryptedRecipients,
  });
};

interface EncryptedRecipientEntry {
  id?: string;
  ephemeralPublicKey: string;
  mlKemCiphertext: string;
  wrappedKey?: string;
  encryptedKey?: string;
}

interface ResolvedRecipient {
  ephemeralPublicKey: string;
  mlKemCiphertext: string;
  wrappedKey: string;
}

function resolveDirectRecipient(
  args: Record<string, unknown>,
): ResolvedRecipient | undefined {
  const encKey = args.wrappedKey ?? args.encryptedKey;
  if (!args.ephemeralPublicKey || !args.mlKemCiphertext || !encKey) {
    return undefined;
  }
  return {
    ephemeralPublicKey: String(args.ephemeralPublicKey),
    mlKemCiphertext: String(args.mlKemCiphertext),
    wrappedKey: String(encKey),
  };
}

function resolveListRecipient(
  args: Record<string, unknown>,
): ResolvedRecipient | undefined {
  if (args.recipients === undefined) return undefined;
  const list: EncryptedRecipientEntry[] = JSON.parse(String(args.recipients));
  const item =
    args.recipientId !== undefined
      ? list.find((e) => e.id === String(args.recipientId))
      : list[
          args.recipientIndex !== undefined ? Number(args.recipientIndex) : 0
        ];
  if (!item) return undefined;
  const key = item.wrappedKey ?? item.encryptedKey;
  if (!key) return undefined;
  return {
    ephemeralPublicKey: item.ephemeralPublicKey,
    mlKemCiphertext: item.mlKemCiphertext,
    wrappedKey: String(key),
  };
}

function resolveRecipientEntry(
  args: Record<string, unknown>,
): ResolvedRecipient {
  const resolved = resolveDirectRecipient(args) ?? resolveListRecipient(args);
  if (!resolved) {
    throw new Error(
      "Missing recipient encryption details (ephemeralPublicKey, mlKemCiphertext, wrappedKey)",
    );
  }
  return resolved;
}

/** `crypto_hybrid_kem_multi_decapsulate`: multi-recipient post-quantum hybrid KEM decapsulation. */
export const hybridKemMultiDecapsulateHandler: ToolHandler = async (args) => {
  const xKey = keyStore.use(String(args.x25519KeyHandle), ["x25519"]);
  const kemKey = keyStore.use(String(args.mlKemKeyHandle), ["ml-kem-768"]);
  const entry = resolveRecipientEntry(args);

  const dek = unwrapDekHybrid(
    xKey.secret as Buffer,
    kemKey.secret as Buffer,
    entry.ephemeralPublicKey,
    entry.mlKemCiphertext,
    entry.wrappedKey,
  );

  const keyHandle = keyStore.add(
    symmetricKey(Buffer.from(dek), "multi-recipient hybrid KEM DEK"),
  );

  return jsonResult({
    algorithm: "multi-hybrid-kem-768-aes-256-gcm",
    keyHandle,
  });
};
