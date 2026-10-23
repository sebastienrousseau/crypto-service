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
  /** NIST post-quantum security category; 0 for a classical algorithm. */
  level: 0 | 1 | 3 | 5;
  isHybrid: boolean;
  pk: number;
  ct: number;
  fips: string;
}

/** Raised when no algorithm satisfies the negotiation constraints. */
export class AlgorithmNegotiationError extends Error {
  override readonly name = "AlgorithmNegotiationError";
}

/**
 * Candidates, strongest first. Names follow crypto-lib's hybrid KEM
 * identifiers; sizes are bytes of the combined public key and ciphertext.
 */
const KEM_CATALOG: readonly AlgoDef[] = [
  {
    name: "x448-ml-kem-1024",
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
    name: "x25519-ml-kem-768",
    category: "hybrid-kem",
    level: 3,
    isHybrid: true,
    pk: 1216,
    ct: 1120,
    fips: "FIPS 203 + RFC 7748",
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
    name: "x25519-ml-kem-512",
    category: "hybrid-kem",
    level: 1,
    isHybrid: true,
    pk: 832,
    ct: 800,
    fips: "FIPS 203 + RFC 7748",
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
    level: 0,
    isHybrid: false,
    pk: 32,
    ct: 32,
    fips: "RFC 7748 (not quantum-resistant)",
  },
];

/** Names used before 0.0.36, accepted in `clientSupportedAlgorithms`. */
const LEGACY_NAMES: Readonly<Record<string, string>> = {
  "x448-mlkem1024": "x448-ml-kem-1024",
  "x25519-mlkem768": "x25519-ml-kem-768",
  "x25519-mlkem512": "x25519-ml-kem-512",
};

/** Whether a candidate meets the caller's constraints. */
function isEligible(
  candidate: AlgoDef,
  options: AlgorithmNegotiationOptions,
  clientAlgos: ReadonlySet<string> | undefined,
): boolean {
  if (candidate.level === 0) {
    if (!options.allowClassical) return false;
  } else if (candidate.level < (options.securityCategoryMin ?? 1)) {
    return false;
  }
  if (options.requireHybrid && !candidate.isHybrid) return false;
  return !clientAlgos || clientAlgos.has(candidate.name);
}

/**
 * Choose a key-establishment algorithm: the strongest candidate that meets
 * the security category, hybrid and client constraints and fits
 * `maxPayloadBytes`, or, when none fits, the strongest that meets the
 * constraints (with `fitsWithinMtu: false`). Classical X25519 has no
 * post-quantum security and is only chosen with `allowClassical: true`.
 *
 * @throws AlgorithmNegotiationError when no candidate meets the
 *   constraints: the negotiator never downgrades silently.
 */
export function negotiateAlgorithm(
  options: AlgorithmNegotiationOptions = {},
): AlgorithmNegotiationResult {
  const maxBytes = options.maxPayloadBytes ?? Infinity;
  const clientAlgos = options.clientSupportedAlgorithms
    ? new Set(
        options.clientSupportedAlgorithms.map((n) => LEGACY_NAMES[n] ?? n),
      )
    : undefined;

  const eligible = KEM_CATALOG.filter((c) =>
    isEligible(c, options, clientAlgos),
  );
  const selected = eligible.find((c) => c.ct <= maxBytes) ?? eligible[0];
  if (!selected) {
    throw new AlgorithmNegotiationError(
      "No algorithm meets the requested security category, hybrid and client constraints",
    );
  }

  return {
    selectedAlgorithm: selected.name,
    cipherCategory: selected.category,
    securityCategory: selected.level,
    isHybrid: selected.isHybrid,
    publicKeyBytes: selected.pk,
    ciphertextBytes: selected.ct,
    totalPayloadOverhead: selected.pk + selected.ct,
    fitsWithinMtu: selected.ct <= maxBytes,
    fallbackChain: eligible.map((c) => c.name),
    compliancePosture: {
      standard: "NIST Post-Quantum Cryptography Standardization",
      fipsStandard: selected.fips,
    },
  };
}
