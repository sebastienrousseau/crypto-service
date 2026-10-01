// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks ISO 20022 Post-Quantum Dual-Signature Protocol for Wholesale Payment Rails.
 *
 * Implements dual-signature envelopes for financial payment messages
 * (pacs.008, pain.001, camt.053): an Ed25519 signature and a NIST FIPS 204
 * ML-DSA signature (ML-DSA-65 by default; ML-DSA-44 and ML-DSA-87 are also
 * accepted) over the same signing statement. The envelope is valid only when
 * both signatures verify.
 *
 * Signing statement (format v2): a domain-separation label followed by
 * length-prefixed fields (4-byte big-endian length, then UTF-8 bytes) for the
 * message type, message ID, digest algorithm, payload digest, timestamp, both
 * algorithm identifiers and both signer public keys. Verification checks the
 * signatures against public keys supplied by the verifier, never against the
 * keys carried in the envelope. Envelopes produced by format v1 (a
 * `:`-joined statement without the timestamp) do not verify under v2.
 */

import { createHash } from "node:crypto";
import { ed25519Sign, ed25519Verify } from "../modern/signing";
import { mlDsaSign, mlDsaVerify, type MlDsaLevel } from "../modern/pq-sign";
import { bytesToHex } from "../keys/serialize";

/** Supported ISO 20022 payment message types. */
export type Iso20022MessageType =
  "pacs.008" | "pain.001" | "camt.053" | "generic";

/** Supported cryptographic hash algorithms for message digests. */
export type Iso20022DigestAlgorithm = "sha256" | "sha384" | "sha512";

/** Canonical dual-signature envelope container for ISO 20022 messages. */
export interface Iso20022DualSignatureEnvelope {
  /** Unique business message identifier (e.g., EndToEndIdentification). */
  messageId: string;
  /** ISO 20022 message schema identifier. */
  messageType: Iso20022MessageType;
  /** Hex-encoded cryptographic digest of the canonicalized payload. */
  payloadDigest: string;
  /** Hash algorithm used to compute the payload digest. */
  digestAlgorithm: Iso20022DigestAlgorithm;
  /** ISO 8601 creation timestamp. */
  timestamp: string;
  /** Classical signature container for legacy RTGS / clearing rails. */
  classical: {
    algorithm: "ed25519";
    signature: string;
    publicKey: string;
  };
  /** Quantum-resistant lattice signature container (FIPS 204 ML-DSA). */
  postQuantum: {
    algorithm: "ml-dsa-44" | "ml-dsa-65" | "ml-dsa-87";
    signature: string;
    publicKey: string;
  };
}

/** Parameters required to sign an ISO 20022 payment message. */
export interface Iso20022SignOptions {
  /** Business message reference ID. */
  messageId: string;
  /** ISO 20022 message type. */
  messageType?: Iso20022MessageType;
  /** Raw payment payload (XML string or JSON record). */
  payload: string | Record<string, unknown>;
  /** Classical signing key pair. */
  classicalKey: {
    privateKeyHex: string;
    publicKeyHex: string;
  };
  /** Post-quantum signing key pair. */
  postQuantumKey: {
    secretKeyHex: string;
    publicKeyHex: string;
    level?: MlDsaLevel;
  };
  /** Digest algorithm to use (defaults to sha256). */
  digestAlgorithm?: Iso20022DigestAlgorithm;
}

/** Result of validating an ISO 20022 dual-signature envelope. */
export interface Iso20022VerifyResult {
  /** Whether the overall envelope is fully valid (both signatures and digest pass). */
  valid: boolean;
  /** Whether the canonical payload digest matches the envelope digest. */
  digestMatches: boolean;
  /** Whether the classical signature verified successfully. */
  classicalValid: boolean;
  /** Whether the post-quantum signature verified successfully. */
  postQuantumValid: boolean;
  /** Message ID verified. */
  messageId: string;
}

/**
 * Public keys the verifier trusts for the signer of an envelope.
 *
 * These must come from the verifier's own key registry (a counterparty
 * directory, a pinned configuration), never from the envelope being
 * verified: an attacker who controls the envelope controls its keys.
 */
export interface Iso20022TrustedKeys {
  /** Trusted Ed25519 public key of the signer (hex). */
  classicalPublicKeyHex: string;
  /** Trusted ML-DSA public key of the signer (hex). */
  postQuantumPublicKeyHex: string;
}

/** Domain-separation label of the v2 signing statement. */
const STATEMENT_DOMAIN = "crypto-service/iso20022-dual-signature/v2";

/** Accepted ML-DSA algorithm identifiers and their FIPS 204 levels. */
const ML_DSA_LEVELS: Readonly<Record<string, MlDsaLevel>> = {
  "ml-dsa-44": 44,
  "ml-dsa-65": 65,
  "ml-dsa-87": 87,
};

/** Fields bound by the signing statement. */
interface StatementFields {
  messageType: string;
  messageId: string;
  digestAlgorithm: string;
  payloadDigest: string;
  timestamp: string;
  classicalAlgorithm: string;
  classicalPublicKeyHex: string;
  postQuantumAlgorithm: string;
  postQuantumPublicKeyHex: string;
}

/**
 * Encodes the v2 signing statement: the domain label and every field, each
 * as a 4-byte big-endian length followed by its UTF-8 bytes, so no field can
 * absorb bytes from its neighbour.
 */
function encodeStatement(fields: StatementFields): Buffer {
  const parts = [
    STATEMENT_DOMAIN,
    fields.messageType,
    fields.messageId,
    fields.digestAlgorithm,
    fields.payloadDigest,
    fields.timestamp,
    fields.classicalAlgorithm,
    fields.classicalPublicKeyHex.toLowerCase(),
    fields.postQuantumAlgorithm,
    fields.postQuantumPublicKeyHex.toLowerCase(),
  ];
  const chunks: Buffer[] = [];
  for (const part of parts) {
    const bytes = Buffer.from(part, "utf8");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(bytes.length, 0);
    chunks.push(len, bytes);
  }
  return Buffer.concat(chunks);
}

/**
 * Canonicalizes a payment payload deterministically for digest computation.
 * For JSON objects, sorts keys recursively; for strings, trims and normalizes whitespace.
 */
export function canonicalizePayload(
  payload: string | Record<string, unknown>,
): string {
  if (typeof payload === "string") {
    return payload.replace(/\r\n/g, "\n").trim();
  }
  return JSON.stringify(sortObjectKeys(payload));
}

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/** Computes the cryptographic digest of a canonicalized ISO 20022 payload. */
export function computeIso20022Digest(
  payload: string | Record<string, unknown>,
  algorithm: Iso20022DigestAlgorithm = "sha256",
): string {
  const canonical = canonicalizePayload(payload);
  return createHash(algorithm).update(canonical, "utf8").digest("hex");
}

/**
 * Creates an ISO 20022 post-quantum dual-signature envelope.
 *
 * Produces an envelope containing both a classical signature (Ed25519) and a
 * post-quantum lattice signature (ML-DSA-65 by default, FIPS 204) over the v2
 * signing statement, which binds the payload digest, message metadata,
 * timestamp, algorithm identifiers and both signer public keys.
 *
 * @example
 * ```ts
 * const envelope = signIso20022Payment({
 *   messageId: "TX-20260929-88910",
 *   messageType: "pacs.008",
 *   payload: { amount: 1500000, currency: "EUR", debtor: "DE89370400440532013000" },
 *   classicalKey: { privateKeyHex: edKey.privateKey, publicKeyHex: edKey.publicKey },
 *   postQuantumKey: { secretKeyHex: mlKey.secretKey, publicKeyHex: mlKey.publicKey, level: 65 },
 * });
 * ```
 */
export function signIso20022Payment(
  options: Iso20022SignOptions,
): Iso20022DualSignatureEnvelope {
  const digestAlgorithm = options.digestAlgorithm ?? "sha256";
  const messageType = options.messageType ?? "generic";
  const level = options.postQuantumKey.level ?? 65;
  const payloadDigest = computeIso20022Digest(options.payload, digestAlgorithm);
  const timestamp = new Date().toISOString();
  const postQuantumAlgorithm = `ml-dsa-${level}` as const;

  const statementBytes = encodeStatement({
    messageType,
    messageId: options.messageId,
    digestAlgorithm,
    payloadDigest,
    timestamp,
    classicalAlgorithm: "ed25519",
    classicalPublicKeyHex: options.classicalKey.publicKeyHex,
    postQuantumAlgorithm,
    postQuantumPublicKeyHex: options.postQuantumKey.publicKeyHex,
  });

  const classicalSig = ed25519Sign(
    options.classicalKey.privateKeyHex,
    bytesToHex(statementBytes),
  );
  const pqSig = mlDsaSign(
    level,
    options.postQuantumKey.secretKeyHex,
    statementBytes,
  );

  return {
    messageId: options.messageId,
    messageType,
    payloadDigest,
    digestAlgorithm,
    timestamp,
    classical: {
      algorithm: "ed25519",
      signature: classicalSig.signature,
      publicKey: options.classicalKey.publicKeyHex,
    },
    postQuantum: {
      algorithm: pqSig.algorithm,
      signature: pqSig.signature,
      publicKey: options.postQuantumKey.publicKeyHex,
    },
  };
}

/** Verifies the Ed25519 signature; any decoding error counts as invalid. */
function verifyClassical(
  publicKeyHex: string,
  statement: Buffer,
  signatureHex: string,
): boolean {
  try {
    return ed25519Verify(publicKeyHex, bytesToHex(statement), signatureHex)
      .valid;
  } catch {
    return false;
  }
}

/** Verifies the ML-DSA signature; unknown algorithms and errors are invalid. */
function verifyPostQuantum(
  algorithm: string,
  publicKeyHex: string,
  statement: Buffer,
  signatureHex: string,
): boolean {
  const level = ML_DSA_LEVELS[algorithm];
  if (level === undefined) {
    return false;
  }
  try {
    return mlDsaVerify(level, publicKeyHex, statement, signatureHex).valid;
  } catch {
    return false;
  }
}

/**
 * Verifies an ISO 20022 post-quantum dual-signature envelope against the
 * original payload and the signer's trusted public keys.
 *
 * Both signatures are checked against `trustedKeys`; the public keys carried
 * in the envelope are informational and are ignored. The envelope is valid
 * only when the payload digest matches and both signatures verify. The
 * timestamp is signed but its freshness is not checked here: apply your own
 * replay window to `envelope.timestamp` after verification.
 *
 * @example
 * ```ts
 * const result = verifyIso20022Payment(envelope, payload, {
 *   classicalPublicKeyHex: registry.ed25519For(sender),
 *   postQuantumPublicKeyHex: registry.mlDsaFor(sender),
 * });
 * console.log(`Valid: ${result.valid}, Classical: ${result.classicalValid}, PQC: ${result.postQuantumValid}`);
 * ```
 */
export function verifyIso20022Payment(
  envelope: Iso20022DualSignatureEnvelope,
  payload: string | Record<string, unknown>,
  trustedKeys: Iso20022TrustedKeys,
): Iso20022VerifyResult {
  const computedDigest = computeIso20022Digest(
    payload,
    envelope.digestAlgorithm,
  );
  const digestMatches = computedDigest === envelope.payloadDigest;

  const statement = encodeStatement({
    messageType: envelope.messageType,
    messageId: envelope.messageId,
    digestAlgorithm: envelope.digestAlgorithm,
    payloadDigest: envelope.payloadDigest,
    timestamp: envelope.timestamp,
    classicalAlgorithm: envelope.classical.algorithm,
    classicalPublicKeyHex: trustedKeys.classicalPublicKeyHex,
    postQuantumAlgorithm: envelope.postQuantum.algorithm,
    postQuantumPublicKeyHex: trustedKeys.postQuantumPublicKeyHex,
  });

  const classicalValid = verifyClassical(
    trustedKeys.classicalPublicKeyHex,
    statement,
    envelope.classical.signature,
  );
  const postQuantumValid = verifyPostQuantum(
    envelope.postQuantum.algorithm,
    trustedKeys.postQuantumPublicKeyHex,
    statement,
    envelope.postQuantum.signature,
  );

  return {
    valid: digestMatches && classicalValid && postQuantumValid,
    digestMatches,
    classicalValid,
    postQuantumValid,
    messageId: envelope.messageId,
  };
}
