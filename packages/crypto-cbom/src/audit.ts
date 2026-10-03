// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
  AuditFinding,
  CbomAuditResult,
  CryptoAsset,
  CycloneDxCbom,
  SpdxCbom,
  QuantumResistanceLevel,
} from "./types";

/** Stated on every result: the score is a heuristic, not a legal verdict. */
export const AUDIT_DISCLAIMER =
  "Heuristic cryptographic posture score derived from algorithm names; it is not a DORA or CRA compliance assessment.";

/** An asset reduced to what the audit needs. */
interface AuditedAsset {
  name: string;
  resistanceLevel: QuantumResistanceLevel;
}

/** Name fragments that mark a broken or disallowed primitive. */
const BROKEN_MARKERS = ["MD5", "SHA-1", "DES", "RC4", "ECB"];
/** Name fragments that mark a composite hybrid or post-quantum stream primitive. */
const HYBRID_MARKERS = ["HYBRID", "+ML-KEM", "+ML-DSA", "PQ-STREAM"];
/** Name fragments that mark a primitive breakable by a quantum computer. */
const QUANTUM_VULNERABLE_MARKERS = [
  "RSA",
  "ECC",
  "ECDSA",
  "ED25519",
  "X25519",
  "X448",
  "DIFFIE-HELLMAN",
];
/** Name fragments that mark a reduced quantum security margin. */
const TRANSITIONAL_MARKERS = ["AES-128", "CBC"];

/** Classify a primitive by name. */
export function classifyPrimitive(primitive: string): QuantumResistanceLevel {
  const upper = primitive.toUpperCase();
  const has = (markers: string[]) => markers.some((m) => upper.includes(m));
  if (has(BROKEN_MARKERS)) return "DEPRECATED_BROKEN";
  if (has(HYBRID_MARKERS)) return "TRANSITIONAL_HYBRID";
  if (has(QUANTUM_VULNERABLE_MARKERS)) return "VULNERABLE_CRQC";
  if (has(TRANSITIONAL_MARKERS)) return "TRANSITIONAL_HYBRID";
  return "QUANTUM_SAFE";
}

/** Normalise either input shape into audited assets. */
function toAssets(
  input: CycloneDxCbom | SpdxCbom | CryptoAsset[],
): AuditedAsset[] {
  if (Array.isArray(input)) return input;
  if ("elements" in input) {
    return input.elements.map((e) => ({
      name: e.name,
      resistanceLevel: classifyPrimitive(e.algorithm || e.name),
    }));
  }
  return input.components.map((c) => ({
    name: c.name,
    resistanceLevel: classifyPrimitive(
      c["crypto-properties"]?.algorithmProperties?.primitive || c.name,
    ),
  }));
}

/** Score deduction per resistance level. */
const DEDUCTIONS: Record<QuantumResistanceLevel, number> = {
  DEPRECATED_BROKEN: 25,
  VULNERABLE_CRQC: 10,
  TRANSITIONAL_HYBRID: 5,
  QUANTUM_SAFE: 0,
};

/** The finding for an asset, or undefined when it is quantum-safe. */
function findingFor(asset: AuditedAsset): AuditFinding | undefined {
  switch (asset.resistanceLevel) {
    case "DEPRECATED_BROKEN":
      return {
        severity: "CRITICAL",
        asset: asset.name,
        rule: "DEPRECATED_BROKEN_PRIMITIVE",
        reference: "NIST_SP_800_131A",
        description: `${asset.name} is broken or disallowed for new use (NIST SP 800-131A).`,
        remediation: "Replace with SHA-256 or AES-256-GCM.",
      };
    case "VULNERABLE_CRQC":
      return {
        severity: "HIGH",
        asset: asset.name,
        rule: "CRQC_HNDL_EXPOSURE",
        reference: "NIST_IR_8547",
        description: `${asset.name} can be broken by a cryptographically relevant quantum computer, so data protected today is exposed to harvest-now-decrypt-later (NIST IR 8547 draft: deprecated after 2030, disallowed after 2035).`,
        remediation:
          "Deploy hybrid classical/post-quantum KEM (ML-KEM-768) and signatures (ML-DSA-65).",
      };
    case "TRANSITIONAL_HYBRID":
      return {
        severity: "MEDIUM",
        asset: asset.name,
        rule: "TRANSITIONAL_CRYPTOGRAPHY",
        reference: "CNSA_2_0",
        description: `${asset.name} has a reduced security margin against quantum search; CNSA 2.0 requires AES-256.`,
        remediation: "Upgrade to AES-256-GCM or ChaCha20-Poly1305.",
      };
    default:
      return undefined;
  }
}

/** Overall posture from the score and the worst classes present. */
function postureStatus(
  score: number,
  deprecatedCount: number,
  vulnerableCount: number,
): CbomAuditResult["status"] {
  if (deprecatedCount > 0 || score < 50) return "FAIL";
  if (vulnerableCount > 0 || score < 85) return "REVIEW";
  return "PASS";
}

/** Ordered migration steps for the classes present. */
function migrationRoadmap(
  deprecatedCount: number,
  vulnerableCount: number,
): string[] {
  const steps: string[] = [];
  if (deprecatedCount > 0) {
    steps.push(
      "Phase 1 (Immediate / 30 Days): Eliminate all deprecated ciphers and broken hash functions.",
    );
  }
  if (vulnerableCount > 0) {
    steps.push(
      "Phase 2 (Near-Term / 90 Days): Implement hybrid post-quantum key encapsulation ML-KEM-768.",
      "Phase 3 (Mid-Term / 180 Days): Transition authentication and code signing to ML-DSA-65 / SLH-DSA.",
    );
  }
  if (steps.length === 0) {
    steps.push(
      "Continuous Monitoring: Maintain automated CBOM tracking across CI/CD supply chain pipelines.",
    );
  }
  return steps;
}

/**
 * Audit a Cryptographic Bill of Materials and score its cryptographic
 * posture. The result is a heuristic over algorithm names, not a DORA or
 * CRA compliance assessment; see {@link AUDIT_DISCLAIMER}.
 */
export function auditCbom(
  input: CycloneDxCbom | SpdxCbom | CryptoAsset[],
): CbomAuditResult {
  const assets = toAssets(input);
  const count = (level: QuantumResistanceLevel) =>
    assets.filter((a) => a.resistanceLevel === level).length;
  const deprecatedCount = count("DEPRECATED_BROKEN");
  const vulnerableCount = count("VULNERABLE_CRQC");
  const quantumSafeCount = count("QUANTUM_SAFE");
  const deductions = assets.reduce(
    (sum, a) => sum + DEDUCTIONS[a.resistanceLevel],
    0,
  );
  const score = Math.max(0, 100 - deductions);
  const totalAssets = assets.length;

  return {
    score,
    status: postureStatus(score, deprecatedCount, vulnerableCount),
    disclaimer: AUDIT_DISCLAIMER,
    totalAssets,
    quantumSafeCount,
    vulnerableCount,
    deprecatedCount,
    quantumSafeRatio:
      totalAssets === 0
        ? 1
        : Number((quantumSafeCount / totalAssets).toFixed(2)),
    findings: assets
      .map(findingFor)
      .filter((f): f is AuditFinding => f !== undefined),
    migrationRoadmap: migrationRoadmap(deprecatedCount, vulnerableCount),
  };
}
