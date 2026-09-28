// SPDX-License-Identifier: Apache-2.0 OR MIT

import { DiagnosticSeverity } from "./types";

export interface CryptoRule {
  id: string;
  name: string;
  severity: DiagnosticSeverity;
  description: string;
  recommendation: string;
}

export const CRYPTO_RULES: Record<string, CryptoRule> = {
  "CRYPTO-001": {
    id: "CRYPTO-001",
    name: "Broken Hash Function",
    severity: DiagnosticSeverity.Error,
    description:
      "Use of broken cryptographic hash function (MD5, SHA-1, MD4, RIPEMD160) vulnerable to collision attacks.",
    recommendation: "Migrate to SHA-256, SHA-384, SHA-512, or SHA3-256.",
  },
  "CRYPTO-002": {
    id: "CRYPTO-002",
    name: "Insecure Symmetric Cipher or Mode",
    severity: DiagnosticSeverity.Error,
    description:
      "Use of deprecated cipher (DES, 3DES, RC4) or ECB mode which leaks plaintext patterns.",
    recommendation:
      "Migrate to AES-256-GCM or ChaCha20-Poly1305 with unique 96-bit nonce.",
  },
  "CRYPTO-003": {
    id: "CRYPTO-003",
    name: "Inadequate Key Size",
    severity: DiagnosticSeverity.Error,
    description:
      "RSA key length below 2048 bits provides insufficient security margin.",
    recommendation:
      "Use RSA with >= 2048 bits (3072+ recommended) or migrate to Ed25519 / ML-DSA.",
  },
  "CRYPTO-004": {
    id: "CRYPTO-004",
    name: "Quantum Vulnerable Public-Key Cryptography",
    severity: DiagnosticSeverity.Warning,
    description:
      "Classical public key algorithm is vulnerable to Shor's algorithm on a Cryptanalytically Relevant Quantum Computer (CRQC).",
    recommendation:
      "Transition to NIST FIPS 203 (ML-KEM) for KEM and FIPS 204 (ML-DSA) for digital signatures.",
  },
  "CRYPTO-005": {
    id: "CRYPTO-005",
    name: "Hardcoded Secret Material",
    severity: DiagnosticSeverity.Error,
    description:
      "Hardcoded secret or private cryptographic key detected in source code.",
    recommendation:
      "Store keys in environment variables, hardware security modules (HSM), or KMS.",
  },
  "CRYPTO-006": {
    id: "CRYPTO-006",
    name: "Malformed PEM Block",
    severity: DiagnosticSeverity.Warning,
    description: "Malformed or unterminated PEM header structure.",
    recommendation:
      "Ensure valid RFC 7468 PEM encapsulation with matching BEGIN and END boundaries.",
  },
};
