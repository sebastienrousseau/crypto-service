// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPResource, MCPReadResourceResult } from "../types";

export const RESOURCES: MCPResource[] = [
  {
    uri: "crypto://standards/pqc",
    name: "NIST Post-Quantum Cryptography Standards & Parameters",
    description:
      "Specification parameters for FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), and FIPS 206 (FN-DSA).",
    mimeType: "application/json",
  },
  {
    uri: "crypto://algorithms/matrix",
    name: "Cryptographic Algorithm Security & Deprecation Matrix",
    description:
      "Comprehensive security strength, key size, and deprecation schedule for enterprise cryptography.",
    mimeType: "application/json",
  },
];

export async function readResource(
  uri: string,
): Promise<MCPReadResourceResult> {
  if (uri === "crypto://standards/pqc") {
    const data = {
      standards: [
        {
          name: "ML-KEM",
          fips: 203,
          type: "Key Encapsulation Mechanism",
          basis: "Module Learning with Errors (M-LWE)",
          variants: [
            {
              level: 1,
              name: "ML-KEM-512",
              publicKeyBytes: 800,
              ciphertextBytes: 768,
              sharedSecretBytes: 32,
            },
            {
              level: 3,
              name: "ML-KEM-768",
              publicKeyBytes: 1184,
              ciphertextBytes: 1088,
              sharedSecretBytes: 32,
            },
            {
              level: 5,
              name: "ML-KEM-1024",
              publicKeyBytes: 1568,
              ciphertextBytes: 1568,
              sharedSecretBytes: 32,
            },
          ],
        },
        {
          name: "ML-DSA",
          fips: 204,
          type: "Digital Signature",
          basis: "Module Learning with Errors (M-LWE)",
          variants: [
            {
              level: 2,
              name: "ML-DSA-44",
              publicKeyBytes: 1312,
              signatureBytes: 2420,
            },
            {
              level: 3,
              name: "ML-DSA-65",
              publicKeyBytes: 1952,
              signatureBytes: 3309,
            },
            {
              level: 5,
              name: "ML-DSA-87",
              publicKeyBytes: 2592,
              signatureBytes: 4627,
            },
          ],
        },
        {
          name: "SLH-DSA",
          fips: 205,
          type: "Stateless Hash-Based Digital Signature",
          basis: "Hash Trees (SPHINCS+)",
          variants: [
            {
              level: 1,
              name: "SLH-DSA-128s",
              publicKeyBytes: 32,
              signatureBytes: 7856,
            },
            {
              level: 5,
              name: "SLH-DSA-256s",
              publicKeyBytes: 64,
              signatureBytes: 29792,
            },
          ],
        },
      ],
      timelines: {
        nsaCnsa2: {
          softwareTransition: 2027,
          webAndProtocols: 2030,
          legacyDeprecation: 2033,
        },
        doraEnforcement: 2025,
        cyberResilienceAct: 2027,
      },
    };
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (uri === "crypto://algorithms/matrix") {
    const matrix = {
      symmetric: [
        {
          name: "AES-256-GCM",
          securityBits: 256,
          quantumSafe: true,
          recommended: true,
        },
        {
          name: "ChaCha20-Poly1305",
          securityBits: 256,
          quantumSafe: true,
          recommended: true,
        },
        {
          name: "3DES",
          securityBits: 112,
          quantumSafe: false,
          recommended: false,
          status: "DEPRECATED",
        },
      ],
      asymmetric: [
        {
          name: "ML-KEM-768",
          securityBits: 192,
          quantumSafe: true,
          recommended: true,
          standard: "FIPS 203",
        },
        {
          name: "RSA-2048",
          securityBits: 112,
          quantumSafe: false,
          recommended: false,
          status: "PHASING_OUT",
        },
        {
          name: "RSA-4096",
          securityBits: 128,
          quantumSafe: false,
          recommended: false,
          status: "PHASING_OUT",
        },
        {
          name: "ECDSA (P-256)",
          securityBits: 128,
          quantumSafe: false,
          recommended: false,
          status: "PHASING_OUT",
        },
        {
          name: "Ed25519",
          securityBits: 128,
          quantumSafe: false,
          recommended: false,
          status: "PHASING_OUT",
        },
      ],
      hashes: [
        {
          name: "SHA-256",
          securityBits: 256,
          quantumSafe: true,
          status: "SECURE",
        },
        {
          name: "SHA-512",
          securityBits: 512,
          quantumSafe: true,
          status: "SECURE",
        },
        {
          name: "SHA-1",
          securityBits: 0,
          quantumSafe: false,
          status: "BROKEN",
        },
        { name: "MD5", securityBits: 0, quantumSafe: false, status: "BROKEN" },
      ],
    };
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(matrix, null, 2),
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
}
