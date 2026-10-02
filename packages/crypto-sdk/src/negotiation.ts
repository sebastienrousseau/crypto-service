/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type {
  AlgorithmNegotiationOptions,
  AlgorithmNegotiationResult,
} from "./types";

/** A key-establishment algorithm the negotiator can select. */
interface AlgoDef {
  name: string;
  category: "lattice-kem" | "hybrid-kem" | "classical-ecdh";
  level: 1 | 3 | 5;
  isHybrid: boolean;
  pk: number;
  ct: number;
  fips: string;
}

const KEM_CATALOG: readonly AlgoDef[] = [
  {
    name: "x448-mlkem1024",
    category: "hybrid-kem",
    level: 5,
    isHybrid: true,
    pk: 1624,
    ct: 1624,
    fips: "FIPS 203 + RFC 7748",
  },
  {
    name: "ml-kem-1024",
    category: "lattice-kem",
    level: 5,
    isHybrid: false,
    pk: 1568,
    ct: 1568,
    fips: "FIPS 203",
  },
  {
    name: "x25519-mlkem768",
    category: "hybrid-kem",
    level: 3,
    isHybrid: true,
    pk: 1216,
    ct: 1120,
    fips: "FIPS 203 + X25519 hybrid",
  },
  {
    name: "ml-kem-768",
    category: "lattice-kem",
    level: 3,
    isHybrid: false,
    pk: 1184,
    ct: 1088,
    fips: "FIPS 203",
  },
  {
    name: "x25519-mlkem512",
    category: "hybrid-kem",
    level: 1,
    isHybrid: true,
    pk: 832,
    ct: 800,
    fips: "FIPS 203 + X25519 hybrid",
  },
  {
    name: "ml-kem-512",
    category: "lattice-kem",
    level: 1,
    isHybrid: false,
    pk: 800,
    ct: 768,
    fips: "FIPS 203",
  },
  {
    name: "x25519",
    category: "classical-ecdh",
    level: 1,
    isHybrid: false,
    pk: 32,
    ct: 32,
    fips: "RFC 7748 (Legacy)",
  },
];

/**
 * Evaluates network constraints, MTU limits, and regulatory security levels
 * to negotiate the optimal post-quantum or composite hybrid cryptographic algorithm.
 */
export function negotiateAlgorithm(
  options: AlgorithmNegotiationOptions = {},
): AlgorithmNegotiationResult {
  const minCategory = options.securityCategoryMin ?? 1;
  const requireHybrid = options.requireHybrid ?? false;
  const maxBytes = options.maxPayloadBytes ?? Infinity;
  const clientAlgos = options.clientSupportedAlgorithms;

  const fallbackChain = KEM_CATALOG.map((c) => c.name);

  // Filter candidates
  const eligible = KEM_CATALOG.filter((candidate) => {
    if (candidate.level < minCategory) return false;
    if (requireHybrid && !candidate.isHybrid) return false;
    if (clientAlgos && !clientAlgos.includes(candidate.name)) return false;
    return true;
  });

  // Select first eligible candidate that fits within maxBytes, or first eligible as fallback
  const selected =
    eligible.find((c) => c.ct <= maxBytes) ??
    eligible[0] ??
    KEM_CATALOG[KEM_CATALOG.length - 1];

  const fitsWithinMtu = selected.ct <= maxBytes;

  return {
    selectedAlgorithm: selected.name,
    cipherCategory: selected.category,
    securityCategory: selected.level,
    isHybrid: selected.isHybrid,
    publicKeyBytes: selected.pk,
    ciphertextBytes: selected.ct,
    totalPayloadOverhead: selected.pk + selected.ct,
    fitsWithinMtu,
    fallbackChain,
    compliancePosture: {
      standard: "NIST Post-Quantum Cryptography Standardization",
      doraArticle13Compliant: selected.level >= 3 || selected.isHybrid,
      fipsStandard: selected.fips,
    },
  };
}
