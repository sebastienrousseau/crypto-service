// SPDX-License-Identifier: Apache-2.0 OR MIT

import { ToolHandler, jsonResult } from "./result";

const PQC_MARKERS = ["ML-KEM", "ML-DSA", "SLH-DSA", "KYBER"];
const BROKEN = ["MD5", "SHA-1", "DES", "3DES", "RC4"];
const CLASSICAL_PUBLIC_MARKERS = ["RSA", "ECDSA", "ECDH", "ED25519"];

interface CbomComponent {
  algorithm: string;
  quantumResistant: boolean;
  securityRisk: string;
  standard: string;
}

function auditAlgorithm(alg: string): CbomComponent {
  const isPqc = PQC_MARKERS.some((m) => alg.includes(m));
  const isBroken = BROKEN.includes(alg);
  const isClassicalPublic = CLASSICAL_PUBLIC_MARKERS.some((m) =>
    alg.includes(m),
  );
  let risk = "LOW";
  if (isBroken) risk = "CRITICAL (Deprecated)";
  else if (isClassicalPublic) risk = "HIGH (HNDL Vulnerable to CRQC)";
  else if (isPqc) risk = "QUANTUM-SAFE";

  let standard = "Classical Standard";
  if (isPqc) standard = "NIST FIPS 203/204";
  else if (isBroken) standard = "DEPRECATED (NIST SP 800-131A)";

  return {
    algorithm: alg,
    quantumResistant: isPqc,
    securityRisk: risk,
    standard,
  };
}

/** `crypto_audit_cbom`: classify algorithm names into a CycloneDX CBOM. */
export const auditCbom: ToolHandler = async (args) => {
  const algorithmsInput = args.algorithms ? String(args.algorithms) : "";
  const audited = algorithmsInput
    .split(",")
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean)
    .map(auditAlgorithm);
  const quantumSafeCount = audited.filter((a) => a.quantumResistant).length;
  return jsonResult({
    bomFormat: "CycloneDX-CBOM-1.6",
    totalAudited: audited.length,
    quantumSafeCount,
    vulnerableCount: audited.length - quantumSafeCount,
    components: audited,
  });
};
