// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks ISO 20022 Post-Quantum Dual-Signature Protocol for Wholesale Payment Rails.
 *
 * Implements composite dual-signature envelopes for financial payment messages
 * (pacs.008, pain.001, camt.053) combining classical digital signatures (Ed25519)
 * with NIST FIPS 204 ML-DSA lattice signatures.
 *
 * Conforms to the European Payments Architecture Guidelines and RFC 10024
 * composite migration paradigms.
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
 * post-quantum lattice signature (ML-DSA-65 / FIPS 204) protecting the canonical
 * payload digest.
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

  // Bind messageId, messageType, and payload digest into the signing string
  const signingStatement = `ISO20022:${messageType}:${options.messageId}:${payloadDigest}`;
  const statementBytes = Buffer.from(signingStatement, "utf8");

  // 1. Classical signature (Ed25519)
  const classicalSig = ed25519Sign(
    options.classicalKey.privateKeyHex,
    bytesToHex(statementBytes),
  );

  // 2. Post-quantum signature (ML-DSA)
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
    timestamp: new Date().toISOString(),
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

/**
 * Verifies an ISO 20022 post-quantum dual-signature envelope against the original payload.
 *
 * Evaluates both the classical signature and the ML-DSA lattice signature.
 *
 * @example
 * ```ts
 * const result = verifyIso20022Payment(envelope, payload);
 * console.log(`Valid: ${result.valid}, Classical: ${result.classicalValid}, PQC: ${result.postQuantumValid}`);
 * ```
 */
export function verifyIso20022Payment(
  envelope: Iso20022DualSignatureEnvelope,
  payload: string | Record<string, unknown>,
): Iso20022VerifyResult {
  const computedDigest = computeIso20022Digest(
    payload,
    envelope.digestAlgorithm,
  );
  const digestMatches = computedDigest === envelope.payloadDigest;

  const signingStatement = `ISO20022:${envelope.messageType}:${envelope.messageId}:${envelope.payloadDigest}`;
  const statementBytes = Buffer.from(signingStatement, "utf8");

  // 1. Verify classical signature
  let classicalValid = false;
  try {
    const res = ed25519Verify(
      envelope.classical.publicKey,
      bytesToHex(statementBytes),
      envelope.classical.signature,
    );
    classicalValid = res.valid;
  } catch {
    classicalValid = false;
  }

  // 2. Verify post-quantum signature
  let postQuantumValid = false;
  try {
    const levelStr = envelope.postQuantum.algorithm.replace("ml-dsa-", "");
    const level = parseInt(levelStr, 10) as MlDsaLevel;
    const res = mlDsaVerify(
      level,
      envelope.postQuantum.publicKey,
      statementBytes,
      envelope.postQuantum.signature,
    );
    postQuantumValid = res.valid;
  } catch {
    postQuantumValid = false;
  }

  const valid = digestMatches && classicalValid && postQuantumValid;

  return {
    valid,
    digestMatches,
    classicalValid,
    postQuantumValid,
    messageId: envelope.messageId,
  };
}
