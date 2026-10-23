// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @remarks Mapping from requested key algorithms to each backend's names.
 *
 * Providers used to substitute a default when they did not recognise an
 * algorithm (an RSA key for "ed25519" on GCP, an Ed25519 key for anything
 * on Vault and the local provider). A table per provider now lists what
 * it can create; anything else is refused.
 */

import { KmsError } from "../errors";

/** Usages accepted by `createKey`. */
export type KeyUsage = "encrypt" | "sign" | "wrap";

/**
 * Backend algorithm names by lower-case requested name, for encryption
 * (also used for wrap) and for signing. Backend names map to themselves
 * so callers may use them directly.
 */
export interface AlgorithmTable {
  encrypt: Readonly<Record<string, string>>;
  sign: Readonly<Record<string, string>>;
}

/**
 * The backend algorithm for `algorithm` and `usage`, or an
 * `INVALID_ARGUMENT` error listing what the provider supports.
 */
export function resolveAlgorithm(
  provider: string,
  table: AlgorithmTable,
  algorithm: string,
  usage: KeyUsage,
): string {
  const names = usage === "sign" ? table.sign : table.encrypt;
  const resolved = Object.hasOwn(names, algorithm.toLowerCase())
    ? names[algorithm.toLowerCase()]
    : undefined;
  if (resolved === undefined) {
    const supported = [...new Set(Object.values(names))].join(", ");
    throw new KmsError(
      "INVALID_ARGUMENT",
      `${provider} cannot create a ${algorithm} key for ${usage}; supported: ${supported}`,
    );
  }
  return resolved;
}

/** Map each name to itself, keyed in lower case. */
const native = (...names: string[]): Record<string, string> =>
  Object.fromEntries(names.map((n) => [n.toLowerCase(), n]));

/** In-memory local provider: AES-256-GCM and Ed25519 only. */
export const LOCAL_ALGORITHMS: AlgorithmTable = {
  encrypt: { "aes-256-gcm": "aes-256-gcm" },
  sign: { ed25519: "ed25519" },
};

/**
 * Google Cloud KMS: symmetric encryption, and the EC and RSA signing
 * algorithms GcpKmsProvider can verify locally.
 */
export const GCP_ALGORITHMS: AlgorithmTable = {
  encrypt: {
    "aes-256-gcm": "GOOGLE_SYMMETRIC_ENCRYPTION",
    ...native("GOOGLE_SYMMETRIC_ENCRYPTION"),
  },
  sign: {
    ed25519: "EC_SIGN_ED25519",
    p256: "EC_SIGN_P256_SHA256",
    "ecdsa-p256": "EC_SIGN_P256_SHA256",
    p384: "EC_SIGN_P384_SHA384",
    "ecdsa-p384": "EC_SIGN_P384_SHA384",
    "rsa-2048": "RSA_SIGN_PSS_2048_SHA256",
    "rsa-3072": "RSA_SIGN_PSS_3072_SHA256",
    "rsa-4096": "RSA_SIGN_PSS_4096_SHA256",
    ...native(
      "EC_SIGN_ED25519",
      "EC_SIGN_P256_SHA256",
      "EC_SIGN_P384_SHA384",
      "RSA_SIGN_PSS_2048_SHA256",
      "RSA_SIGN_PSS_3072_SHA256",
      "RSA_SIGN_PSS_4096_SHA256",
      "RSA_SIGN_PSS_4096_SHA512",
      "RSA_SIGN_PKCS1_2048_SHA256",
      "RSA_SIGN_PKCS1_3072_SHA256",
      "RSA_SIGN_PKCS1_4096_SHA256",
      "RSA_SIGN_PKCS1_4096_SHA512",
    ),
  },
};

/** HashiCorp Vault Transit key types. */
export const VAULT_ALGORITHMS: AlgorithmTable = {
  encrypt: {
    "aes-256-gcm": "aes256-gcm96",
    "aes-128-gcm": "aes128-gcm96",
    ...native(
      "aes256-gcm96",
      "aes128-gcm96",
      "chacha20-poly1305",
      "rsa-2048",
      "rsa-3072",
      "rsa-4096",
    ),
  },
  sign: {
    p256: "ecdsa-p256",
    p384: "ecdsa-p384",
    p521: "ecdsa-p521",
    ...native(
      "ed25519",
      "ecdsa-p256",
      "ecdsa-p384",
      "ecdsa-p521",
      "rsa-2048",
      "rsa-3072",
      "rsa-4096",
    ),
  },
};

/** AWS KMS key specs, including ML-DSA for post-quantum signing. */
export const AWS_ALGORITHMS: AlgorithmTable = {
  encrypt: {
    "aes-256-gcm": "SYMMETRIC_DEFAULT",
    "rsa-2048": "RSA_2048",
    "rsa-3072": "RSA_3072",
    "rsa-4096": "RSA_4096",
    ...native("SYMMETRIC_DEFAULT", "RSA_2048", "RSA_3072", "RSA_4096"),
  },
  sign: {
    ed25519: "ECC_NIST_EDWARDS25519",
    p256: "ECC_NIST_P256",
    "ecdsa-p256": "ECC_NIST_P256",
    p384: "ECC_NIST_P384",
    "ecdsa-p384": "ECC_NIST_P384",
    p521: "ECC_NIST_P521",
    "ecdsa-p521": "ECC_NIST_P521",
    secp256k1: "ECC_SECG_P256K1",
    "rsa-2048": "RSA_2048",
    "rsa-3072": "RSA_3072",
    "rsa-4096": "RSA_4096",
    "ml-dsa-44": "ML_DSA_44",
    "ml-dsa-65": "ML_DSA_65",
    "ml-dsa-87": "ML_DSA_87",
    ...native(
      "ECC_NIST_EDWARDS25519",
      "ECC_NIST_P256",
      "ECC_NIST_P384",
      "ECC_NIST_P521",
      "ECC_SECG_P256K1",
      "RSA_2048",
      "RSA_3072",
      "RSA_4096",
      "ML_DSA_44",
      "ML_DSA_65",
      "ML_DSA_87",
    ),
  },
};
