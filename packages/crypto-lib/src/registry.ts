/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Central algorithm registry with metadata, deprecation, and recommendations.
 *
 * Every algorithm in the library has an entry with its security level,
 * category, standard reference, and deprecation status.
 */

/** Cryptographic operation category for algorithm classification. */
export type AlgorithmCategory =
  | "encryption"
  | "hash"
  | "kdf"
  | "mac"
  | "signing"
  | "key-exchange"
  | "kem";

/** NIST security level (1, 2, 3, or 5). */
export type SecurityLevel = 1 | 2 | 3 | 5;

/** Lifecycle status of a registered algorithm. */
export type AlgorithmStatus =
  | "recommended"
  | "acceptable"
  | "deprecated"
  | "experimental";

/** Metadata for a registered cryptographic algorithm. */
export interface AlgorithmInfo {
  /** Algorithm identifier (canonical name). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Category. */
  category: AlgorithmCategory;
  /** NIST security level (1-5) or equivalent. */
  securityLevel: SecurityLevel;
  /** Status. */
  status: AlgorithmStatus;
  /** Standard reference (e.g. "FIPS 203", "RFC 8439"). */
  standard?: string | undefined;
  /** Known aliases. */
  aliases?: string[] | undefined;
}

/** Complete list of all registered cryptographic algorithms with metadata. */
const REGISTRY: AlgorithmInfo[] = [
  // --- Encryption ---
  {
    id: "xchacha20-poly1305",
    name: "XChaCha20-Poly1305",
    category: "encryption",
    securityLevel: 1,
    status: "recommended",
    standard: "draft-irtf-cfrg-xchacha",
  },
  {
    id: "aes-256-gcm",
    name: "AES-256-GCM",
    category: "encryption",
    securityLevel: 1,
    status: "recommended",
    standard: "NIST SP 800-38D",
    aliases: ["aes256gcm"],
  },
  {
    id: "aes-128-gcm",
    name: "AES-128-GCM",
    category: "encryption",
    securityLevel: 1,
    status: "acceptable",
    standard: "NIST SP 800-38D",
    aliases: ["aes128gcm"],
  },
  {
    id: "aes-256-gcm-siv",
    name: "AES-256-GCM-SIV",
    category: "encryption",
    securityLevel: 1,
    status: "recommended",
    standard: "RFC 8452",
    aliases: ["aes256gcmsiv"],
  },
  {
    id: "aes-128-gcm-siv",
    name: "AES-128-GCM-SIV",
    category: "encryption",
    securityLevel: 1,
    status: "acceptable",
    standard: "RFC 8452",
  },

  // --- Hash ---
  {
    id: "sha256",
    name: "SHA-256",
    category: "hash",
    securityLevel: 1,
    status: "recommended",
    standard: "FIPS 180-4",
  },
  {
    id: "sha384",
    name: "SHA-384",
    category: "hash",
    securityLevel: 1,
    status: "recommended",
    standard: "FIPS 180-4",
  },
  {
    id: "sha512",
    name: "SHA-512",
    category: "hash",
    securityLevel: 1,
    status: "recommended",
    standard: "FIPS 180-4",
  },
  {
    id: "sha3-256",
    name: "SHA3-256",
    category: "hash",
    securityLevel: 1,
    status: "recommended",
    standard: "FIPS 202",
  },
  {
    id: "sha3-512",
    name: "SHA3-512",
    category: "hash",
    securityLevel: 1,
    status: "recommended",
    standard: "FIPS 202",
  },
  {
    id: "blake2b",
    name: "BLAKE2b",
    category: "hash",
    securityLevel: 1,
    status: "acceptable",
    standard: "RFC 7693",
  },
  {
    id: "blake3",
    name: "BLAKE3",
    category: "hash",
    securityLevel: 1,
    status: "acceptable",
  },

  // --- KDF ---
  {
    id: "argon2id",
    name: "Argon2id",
    category: "kdf",
    securityLevel: 1,
    status: "recommended",
    standard: "RFC 9106",
  },
  {
    id: "hkdf-sha256",
    name: "HKDF-SHA256",
    category: "kdf",
    securityLevel: 1,
    status: "recommended",
    standard: "RFC 5869",
  },
  {
    id: "scrypt",
    name: "scrypt",
    category: "kdf",
    securityLevel: 1,
    status: "acceptable",
    standard: "RFC 7914",
  },
  {
    id: "pbkdf2-sha256",
    name: "PBKDF2-SHA256",
    category: "kdf",
    securityLevel: 1,
    status: "deprecated",
    standard: "RFC 8018",
  },

  // --- MAC ---
  {
    id: "hmac-sha256",
    name: "HMAC-SHA256",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
    standard: "RFC 2104",
  },
  {
    id: "hmac-sha384",
    name: "HMAC-SHA384",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
  },
  {
    id: "hmac-sha512",
    name: "HMAC-SHA512",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
  },
  {
    id: "hmac-sha3-256",
    name: "HMAC-SHA3-256",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
  },
  {
    id: "hmac-sha3-512",
    name: "HMAC-SHA3-512",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
  },
  {
    id: "kmac-128",
    name: "KMAC-128",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
    standard: "NIST SP 800-185",
  },
  {
    id: "kmac-256",
    name: "KMAC-256",
    category: "mac",
    securityLevel: 1,
    status: "recommended",
    standard: "NIST SP 800-185",
  },

  // --- Signing ---
  {
    id: "ed25519",
    name: "Ed25519",
    category: "signing",
    securityLevel: 1,
    status: "recommended",
    standard: "RFC 8032",
  },
  {
    id: "ed448",
    name: "Ed448",
    category: "signing",
    securityLevel: 2,
    status: "recommended",
    standard: "RFC 8032",
  },
  {
    id: "ecdsa-p256",
    name: "ECDSA P-256",
    category: "signing",
    securityLevel: 1,
    status: "acceptable",
    standard: "FIPS 186-5",
  },
  {
    id: "ecdsa-p384",
    name: "ECDSA P-384",
    category: "signing",
    securityLevel: 2,
    status: "acceptable",
    standard: "FIPS 186-5",
  },
  {
    id: "ml-dsa-44",
    name: "ML-DSA-44",
    category: "signing",
    securityLevel: 2,
    status: "recommended",
    standard: "FIPS 204",
  },
  {
    id: "ml-dsa-65",
    name: "ML-DSA-65",
    category: "signing",
    securityLevel: 3,
    status: "recommended",
    standard: "FIPS 204",
  },
  {
    id: "ml-dsa-87",
    name: "ML-DSA-87",
    category: "signing",
    securityLevel: 5,
    status: "recommended",
    standard: "FIPS 204",
  },
  {
    id: "slh-dsa-shake-256s",
    name: "SLH-DSA-SHAKE-256s",
    category: "signing",
    securityLevel: 5,
    status: "recommended",
    standard: "FIPS 205",
  },
  {
    id: "slh-dsa-shake-128f",
    name: "SLH-DSA-SHAKE-128f",
    category: "signing",
    securityLevel: 1,
    status: "acceptable",
    standard: "FIPS 205",
  },
  {
    id: "schnorr",
    name: "Schnorr (BIP-340)",
    category: "signing",
    securityLevel: 1,
    status: "acceptable",
    standard: "BIP-340",
    aliases: ["bip340", "schnorr-secp256k1"],
  },

  // --- Key Exchange ---
  {
    id: "x25519",
    name: "X25519",
    category: "key-exchange",
    securityLevel: 1,
    status: "recommended",
    standard: "RFC 7748",
  },
  {
    id: "x448",
    name: "X448",
    category: "key-exchange",
    securityLevel: 2,
    status: "recommended",
    standard: "RFC 7748",
  },
  {
    id: "ecdh-p256",
    name: "ECDH P-256",
    category: "key-exchange",
    securityLevel: 1,
    status: "acceptable",
  },
  {
    id: "ecdh-p384",
    name: "ECDH P-384",
    category: "key-exchange",
    securityLevel: 2,
    status: "acceptable",
  },

  // --- KEM ---
  {
    id: "ml-kem-512",
    name: "ML-KEM-512",
    category: "kem",
    securityLevel: 1,
    status: "acceptable",
    standard: "FIPS 203",
  },
  {
    id: "ml-kem-768",
    name: "ML-KEM-768",
    category: "kem",
    securityLevel: 3,
    status: "recommended",
    standard: "FIPS 203",
  },
  {
    id: "ml-kem-1024",
    name: "ML-KEM-1024",
    category: "kem",
    securityLevel: 5,
    status: "recommended",
    standard: "FIPS 203",
  },
  {
    id: "x25519-ml-kem-768",
    name: "X25519+ML-KEM-768 Hybrid",
    category: "kem",
    securityLevel: 3,
    status: "recommended",
  },
  {
    id: "x25519-ml-kem-512",
    name: "X25519+ML-KEM-512 Hybrid",
    category: "kem",
    securityLevel: 1,
    status: "acceptable",
  },
  {
    id: "x25519-ml-kem-1024",
    name: "X25519+ML-KEM-1024 Hybrid",
    category: "kem",
    securityLevel: 5,
    status: "recommended",
  },
  {
    id: "p256-ml-kem-768",
    name: "P-256+ML-KEM-768 Hybrid",
    category: "kem",
    securityLevel: 3,
    status: "recommended",
    standard: "IETF draft-ietf-tls-ecdhe-mlkem",
  },
  {
    id: "x448-ml-kem-1024",
    name: "X448+ML-KEM-1024 Hybrid",
    category: "kem",
    securityLevel: 5,
    status: "recommended",
  },
];

/** Map from algorithm alias to canonical algorithm ID. */
const aliasMap = new Map<string, string>();
/** Map from canonical algorithm ID to its metadata entry. */
const idMap = new Map<string, AlgorithmInfo>();

for (const algo of REGISTRY) {
  idMap.set(algo.id, algo);
  if (algo.aliases) {
    for (const alias of algo.aliases) {
      aliasMap.set(alias, algo.id);
    }
  }
}

/**
 * Look up an algorithm by ID or alias.
 */
export function getAlgorithm(idOrAlias: string): AlgorithmInfo | undefined {
  const resolved = aliasMap.get(idOrAlias) ?? idOrAlias;
  return idMap.get(resolved);
}

/**
 * List all algorithms, optionally filtered by category and/or status.
 */
export function listAlgorithms(filters?: {
  category?: AlgorithmCategory | undefined;
  status?: AlgorithmStatus | undefined;
}): AlgorithmInfo[] {
  let result = REGISTRY;
  if (filters?.category) {
    result = result.filter((a) => a.category === filters.category);
  }
  if (filters?.status) {
    result = result.filter((a) => a.status === filters.status);
  }
  return result;
}

/**
 * Get all recommended algorithms, optionally filtered by category.
 */
export function recommended(category?: AlgorithmCategory): AlgorithmInfo[] {
  const filters: { category?: AlgorithmCategory; status?: AlgorithmStatus } = {
    status: "recommended",
  };
  if (category) {
    filters.category = category;
  }
  return listAlgorithms(filters);
}

/**
 * Check if an algorithm is deprecated.
 */
export function isDeprecated(idOrAlias: string): boolean {
  const algo = getAlgorithm(idOrAlias);
  return algo?.status === "deprecated";
}
