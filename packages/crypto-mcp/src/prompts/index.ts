// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPPrompt, MCPGetPromptResult } from "../types";

export const PROMPTS: MCPPrompt[] = [
  {
    name: "pqc-migration-plan",
    description:
      "Generate a phased Post-Quantum Cryptography (PQC) migration roadmap tailored to an enterprise repository or architecture.",
    arguments: [
      {
        name: "targetSystem",
        description:
          "Name or architecture description of the system being migrated (e.g. 'Wholesale Payment Gateway' or 'API Microservices').",
        required: true,
      },
    ],
  },
  {
    name: "dora-compliance-check",
    description:
      "Generate a fiduciary audit checklist for DORA Articles 9 and 13 cryptographic resilience and CBOM tracking.",
    arguments: [
      {
        name: "organizationType",
        description:
          "Type of financial entity (e.g. 'Credit Institution', 'Payment Service Provider', 'Investment Firm').",
        required: false,
      },
    ],
  },
];

export async function getPrompt(
  name: string,
  args: Record<string, string> = {},
): Promise<MCPGetPromptResult> {
  if (name === "pqc-migration-plan") {
    const target = args.targetSystem || "Enterprise Application";
    return {
      description: `Post-Quantum Cryptography Migration Plan for ${target}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please design a 4-phase Post-Quantum Cryptography (PQC) migration plan for ${target} in accordance with NIST FIPS 203/204/205 standards and NSA CNSA 2.0 timelines:\n\n1. Cryptographic Asset Discovery & CBOM Generation\n2. Hybrid Dual Encapsulation (RFC 10024 / X25519 + ML-KEM-768)\n3. Hardware & Memory Zeroization Audit (Wasm linear memory vs V8 GC heap)\n4. Complete Deprecation of Classical Public Key Infrastructure.`,
          },
        },
      ],
    };
  }

  if (name === "dora-compliance-check") {
    const org = args.organizationType || "Financial Entity";
    return {
      description: `DORA Articles 9 & 13 Cryptographic Resilience Audit for ${org}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform a DORA Regulation (EU) 2022/2554 compliance evaluation for ${org}:\n\n- Article 9: Technical cryptographic measures, encryption-in-transit, encryption-at-rest, and key management lifecycle.\n- Article 13: Continuous cryptographic agility and supply chain dependency auditing.\n- Cryptographic Bill of Materials (CBOM) inventory completeness in CycloneDX 1.6 format.`,
          },
        },
      ],
    };
  }

  throw new Error(`Prompt not found: ${name}`);
}
