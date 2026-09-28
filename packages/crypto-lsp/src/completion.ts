// SPDX-License-Identifier: Apache-2.0 OR MIT

import { CompletionItem } from "./types";

const COMPLETION_ITEMS: CompletionItem[] = [
  // Post-Quantum KEM
  {
    label: "ML-KEM-512",
    kind: 12, // Value
    detail: "NIST FIPS 203 Category 1 Key Encapsulation",
    documentation: "Post-quantum lattice KEM for 128-bit quantum security.",
    insertText: "ml-kem-512",
  },
  {
    label: "ML-KEM-768",
    kind: 12,
    detail: "NIST FIPS 203 Category 3 Key Encapsulation (Recommended)",
    documentation: "Standard post-quantum lattice KEM for general security.",
    insertText: "ml-kem-768",
  },
  {
    label: "ML-KEM-1024",
    kind: 12,
    detail: "NIST FIPS 203 Category 5 Key Encapsulation (CNSA 2.0)",
    documentation: "High-security post-quantum lattice KEM.",
    insertText: "ml-kem-1024",
  },
  // Post-Quantum Signatures
  {
    label: "ML-DSA-44",
    kind: 12,
    detail: "NIST FIPS 204 Category 2 Digital Signature",
    documentation: "Lattice-based deterministic digital signature.",
    insertText: "ml-dsa-44",
  },
  {
    label: "ML-DSA-65",
    kind: 12,
    detail: "NIST FIPS 204 Category 3 Digital Signature (Recommended)",
    documentation: "Standard lattice-based digital signature.",
    insertText: "ml-dsa-65",
  },
  {
    label: "ML-DSA-87",
    kind: 12,
    detail: "NIST FIPS 204 Category 5 Digital Signature (CNSA 2.0)",
    documentation: "High-security lattice-based digital signature.",
    insertText: "ml-dsa-87",
  },
  // Authenticated Symmetric Ciphers
  {
    label: "aes-256-gcm",
    kind: 12,
    detail: "NIST SP 800-38D AEAD",
    documentation:
      "256-bit AES in Galois/Counter Mode with 128-bit authentication tag.",
    insertText: "aes-256-gcm",
  },
  {
    label: "chacha20-poly1305",
    kind: 12,
    detail: "RFC 8439 AEAD",
    documentation:
      "High-performance authenticated cipher immune to cache-timing attacks.",
    insertText: "chacha20-poly1305",
  },
  // Secure Hash Functions
  {
    label: "sha256",
    kind: 12,
    detail: "NIST FIPS 180-4 Secure Hash",
    documentation: "256-bit cryptographic hash function.",
    insertText: "sha256",
  },
  {
    label: "sha384",
    kind: 12,
    detail: "NIST FIPS 180-4 Secure Hash (CNSA 2.0)",
    documentation: "384-bit cryptographic hash function.",
    insertText: "sha384",
  },
  {
    label: "sha512",
    kind: 12,
    detail: "NIST FIPS 180-4 Secure Hash",
    documentation: "512-bit cryptographic hash function.",
    insertText: "sha512",
  },
];

/**
 * Returns cryptographic completion suggestions.
 */
export function getCompletions(): CompletionItem[] {
  return COMPLETION_ITEMS;
}
