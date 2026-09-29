// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
  AuditFinding,
  CryptoAsset,
  CycloneDxCbom,
  DoraAuditResult,
  QuantumResistanceLevel,
} from "./types";

/**
 * Audits a Cryptographic Bill of Materials for EU DORA (Articles 9/13) and CRA (Article 14) compliance.
 */
export function auditCbom(
  input: CycloneDxCbom | CryptoAsset[],
): DoraAuditResult {
  const assets: Array<{
    name: string;
    resistanceLevel: QuantumResistanceLevel;
  }> = Array.isArray(input)
    ? input
    : input.components.map((c) => {
        const primitive =
          c["crypto-properties"]?.algorithmProperties?.primitive || c.name;
        let resistanceLevel: QuantumResistanceLevel = "QUANTUM_SAFE";
        const upper = primitive.toUpperCase();
        if (
          upper.includes("MD5") ||
          upper.includes("SHA-1") ||
          upper.includes("DES") ||
          upper.includes("RC4") ||
          upper.includes("ECB")
        ) {
          resistanceLevel = "DEPRECATED_BROKEN";
        } else if (
          upper.includes("RSA") ||
          upper.includes("ECC") ||
          upper.includes("ECDSA") ||
          upper.includes("ED25519")
        ) {
          resistanceLevel = "VULNERABLE_CRQC";
        } else if (upper.includes("AES-128") || upper.includes("CBC")) {
          resistanceLevel = "TRANSITIONAL_HYBRID";
        }
        return { name: c.name, resistanceLevel };
      });

  const findings: AuditFinding[] = [];
  let deductions = 0;
  let quantumSafeCount = 0;
  let vulnerableCount = 0;
  let deprecatedCount = 0;

  for (const asset of assets) {
    if (asset.resistanceLevel === "DEPRECATED_BROKEN") {
      deprecatedCount++;
      deductions += 25;
      findings.push({
        severity: "CRITICAL",
        asset: asset.name,
        rule: "DEPRECATED_BROKEN_PRIMITIVE",
        regulation: "DORA_ART_9",
        description: `Use of broken primitive ${asset.name} violates DORA Article 9 resilience requirements.`,
        remediation:
          "Immediately deprecate and replace with approved FIPS 140-3 primitives (SHA-256 / AES-256-GCM).",
      });
    } else if (asset.resistanceLevel === "VULNERABLE_CRQC") {
      vulnerableCount++;
      deductions += 10;
      findings.push({
        severity: "HIGH",
        asset: asset.name,
        rule: "CRQC_HNDL_EXPOSURE",
        regulation: "CRA_ART_14",
        description: `Asset ${asset.name} is subject to Harvest-Now-Decrypt-Later (HNDL) attacks by quantum adversaries.`,
        remediation:
          "Deploy hybrid classical/post-quantum KEM (ML-KEM-768) and signatures (ML-DSA-65).",
      });
    } else if (asset.resistanceLevel === "TRANSITIONAL_HYBRID") {
      deductions += 5;
      findings.push({
        severity: "MEDIUM",
        asset: asset.name,
        rule: "TRANSITIONAL_CRYPTOGRAPHY",
        regulation: "DORA_ART_13",
        description: `Asset ${asset.name} provides legacy symmetric margin.`,
        remediation: "Upgrade to AES-256-GCM or ChaCha20-Poly1305.",
      });
    } else {
      quantumSafeCount++;
    }
  }

  const totalAssets = assets.length;
  const score =
    totalAssets === 0 ? 100 : Math.max(0, Math.min(100, 100 - deductions));
  const quantumSafeRatio =
    totalAssets === 0 ? 1 : Number((quantumSafeCount / totalAssets).toFixed(2));

  let doraStatus: "COMPLIANT" | "CONDITIONAL" | "NON_COMPLIANT" =
    "NON_COMPLIANT";
  if (deprecatedCount === 0 && score >= 85) {
    doraStatus = "COMPLIANT";
  } else if (deprecatedCount === 0 && score >= 50) {
    doraStatus = "CONDITIONAL";
  }

  const craStatus: "COMPLIANT" | "NON_COMPLIANT" =
    deprecatedCount === 0 && vulnerableCount === 0
      ? "COMPLIANT"
      : "NON_COMPLIANT";

  const migrationRoadmap: string[] = [];
  if (deprecatedCount > 0) {
    migrationRoadmap.push(
      "Phase 1 (Immediate / 30 Days): Eliminate all deprecated ciphers and broken hash functions (DORA Art. 9).",
    );
  }
  if (vulnerableCount > 0) {
    migrationRoadmap.push(
      "Phase 2 (Near-Term / 90 Days): Implement hybrid post-quantum key encapsulation ML-KEM-768 (CRA Art. 14).",
    );
    migrationRoadmap.push(
      "Phase 3 (Mid-Term / 180 Days): Transition authentication and code signing to ML-DSA-65 / SLH-DSA.",
    );
  }
  if (migrationRoadmap.length === 0) {
    migrationRoadmap.push(
      "Continuous Monitoring: Maintain automated CBOM tracking across CI/CD supply chain pipelines.",
    );
  }

  return {
    score,
    doraStatus,
    craStatus,
    totalAssets,
    quantumSafeCount,
    vulnerableCount,
    deprecatedCount,
    quantumSafeRatio,
    findings,
    migrationRoadmap,
  };
}
