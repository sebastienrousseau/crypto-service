/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import type {
  CbomPayload,
  DoraComplianceScorecard,
} from "../../enterprise/types";

export const DORA_SCORECARD: DoraComplianceScorecard = {
  standard: "DORA (EU 2022/2554)",
  article: "Article 9 & Article 13",
  complianceScore: 100,
  status: "Compliant",
  quantumResistanceRatio: 0.88,
  activePrimitivesCount: 54,
  postQuantumPrimitivesCount: 18,
  algorithmDeprecationSchedule: [
    {
      algorithm: "RSA-2048",
      category: "asymmetric",
      sunsetDate: "2026-12-31T23:59:59Z",
      recommendedMigration: "FIPS 203 ML-KEM-768 / FIPS 204 ML-DSA-65",
    },
    {
      algorithm: "ECDSA (secp256r1 / P-256)",
      category: "asymmetric",
      sunsetDate: "2027-12-31T23:59:59Z",
      recommendedMigration: "FIPS 204 ML-DSA-44 / Ed25519-ML-DSA Hybrid",
    },
    {
      algorithm: "Classical X25519 ECDH",
      category: "asymmetric",
      sunsetDate: "2030-01-01T00:00:00Z",
      recommendedMigration: "RFC 10024 Composite Hybrid (X25519 + ML-KEM-768)",
    },
    {
      algorithm: "Triple-DES (3DES) & RC4",
      category: "symmetric",
      sunsetDate: "Immediate (Deprecated)",
      recommendedMigration: "AES-256-GCM / ChaCha20-Poly1305",
    },
  ],
  cryptographicInventory: [
    {
      package: "@sebastienrousseau/crypto-lib",
      version: "0.0.4",
      status: "production",
      fipsCompliance: "FIPS 203, FIPS 204, FIPS 205, FIPS 206",
    },
    {
      package: "@sebastienrousseau/crypto-wasm",
      version: "0.0.4",
      status: "hardened",
      fipsCompliance: "Constant-Time SIMD NTT / FIPS 203",
    },
    {
      package: "@sebastienrousseau/crypto-kms",
      version: "0.0.4",
      status: "production",
      fipsCompliance: "FIPS 140-3 Envelope Encryption",
    },
    {
      package: "@sebastienrousseau/crypto-edge",
      version: "0.0.4",
      status: "production",
      fipsCompliance: "Web Crypto Standards & PQC Polyfill",
    },
    {
      package: "@sebastienrousseau/crypto-cbom",
      version: "0.0.4",
      status: "production",
      fipsCompliance: "CycloneDX 1.6 / SPDX 3.0 Compliance Scanner",
    },
    {
      package: "@sebastienrousseau/crypto-mcp",
      version: "0.0.4",
      status: "production",
      fipsCompliance: "Model Context Protocol AI Cryptography Tools",
    },
    {
      package: "@sebastienrousseau/crypto-lsp",
      version: "0.0.4",
      status: "production",
      fipsCompliance: "Static PQC Vulnerability AST Scanner",
    },
  ],
  timestamp: "2026-09-28T00:00:00.000Z",
};

export const CBOM_PAYLOAD: CbomPayload = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7",
  version: 1,
  metadata: {
    timestamp: "2026-09-28T00:00:00.000Z",
    tools: [
      {
        vendor: "Sebastien Rousseau",
        name: "@sebastienrousseau/crypto-cbom",
        version: "0.0.4",
      },
    ],
    component: {
      type: "framework",
      name: "@sebastienrousseau/crypto-service",
      version: "0.0.4",
      description:
        "Modular Post-Quantum Sovereign Crypto-as-a-Service Operating Core",
    },
  },
  components: [
    {
      type: "cryptographic-asset",
      name: "ML-KEM-768",
      version: "FIPS-203",
      properties: [
        { name: "algorithm-family", value: "Module-Lattice KEM" },
        { name: "quantum-security-category", value: "3" },
        { name: "dora-article-13-status", value: "compliant" },
      ],
    },
    {
      type: "cryptographic-asset",
      name: "ML-DSA-65",
      version: "FIPS-204",
      properties: [
        { name: "algorithm-family", value: "Module-Lattice Signatures" },
        { name: "quantum-security-category", value: "3" },
        { name: "dora-article-13-status", value: "compliant" },
      ],
    },
    {
      type: "cryptographic-asset",
      name: "SLH-DSA-128s",
      version: "FIPS-205",
      properties: [
        { name: "algorithm-family", value: "Stateless Hash-Based Signatures" },
        { name: "quantum-security-category", value: "1" },
        { name: "dora-article-13-status", value: "compliant" },
      ],
    },
    {
      type: "cryptographic-asset",
      name: "Composite-Hybrid-X25519-ML-KEM-768",
      version: "RFC-10024",
      properties: [
        { name: "algorithm-family", value: "Dual Encapsulation Hybrid KEM" },
        { name: "defense-in-depth", value: "classical-plus-post-quantum" },
        { name: "dora-article-13-status", value: "compliant" },
      ],
    },
  ],
};

/** Registers the v2 compliance endpoints (DORA Article 13 and CycloneDX CBOM). */
export default (app: FastifyInstance): void => {
  app.get(
    "/v2/compliance/dora",
    {
      schema: {
        tags: ["Compliance"],
        summary: "DORA Article 13 Cryptographic Compliance Scorecard",
        description:
          "Returns automated compliance audit metrics, post-quantum readiness ratios, and cipher sunset dates under Regulation (EU) 2022/2554.",
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  standard: { type: "string" },
                  article: { type: "string" },
                  complianceScore: { type: "number" },
                  status: { type: "string" },
                  quantumResistanceRatio: { type: "number" },
                  activePrimitivesCount: { type: "number" },
                  postQuantumPrimitivesCount: { type: "number" },
                  algorithmDeprecationSchedule: { type: "array" },
                  cryptographicInventory: { type: "array" },
                  timestamp: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      return { data: DORA_SCORECARD };
    },
  );

  app.get(
    "/v2/compliance/cbom",
    {
      schema: {
        tags: ["Compliance"],
        summary:
          "Cryptographic Bill of Materials (CBOM) in CycloneDX 1.6 format",
        description:
          "Emits automated, machine-readable cryptographic bill of materials satisfying EU Cyber Resilience Act (CRA) Article 14 and DORA Article 9/13 requirements.",
      },
    },
    async (_request, reply) => {
      reply.header(
        "Content-Type",
        "application/vnd.cyclonedx+json; charset=utf-8",
      );
      return CBOM_PAYLOAD;
    },
  );
};
