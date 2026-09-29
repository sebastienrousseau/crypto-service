// SPDX-License-Identifier: Apache-2.0 OR MIT

export type CryptographicAssetType =
  | "algorithm"
  | "cipher"
  | "signature"
  | "kem"
  | "hash"
  | "key"
  | "certificate"
  | "protocol";

export type QuantumResistanceLevel =
  | "QUANTUM_SAFE"
  | "TRANSITIONAL_HYBRID"
  | "VULNERABLE_CRQC"
  | "DEPRECATED_BROKEN";

export interface CryptoAsset {
  name: string;
  algorithm: string;
  type: CryptographicAssetType;
  keySize?: number | undefined;
  mode?: string | undefined;
  padding?: string | undefined;
  quantumResistant: boolean;
  resistanceLevel: QuantumResistanceLevel;
  standard?: string | undefined;
  file?: string | undefined;
  line?: number | undefined;
}

export interface CycloneDxCryptoProperties {
  assetType: CryptographicAssetType;
  algorithmProperties?:
    | {
        primitive: string;
        parameterSetIdentifier?: string | undefined;
        curve?: string | undefined;
        executionEnvironment?: string | undefined;
        implementationPlatform?: string | undefined;
        certificationLevel?: string | undefined;
        mode?: string | undefined;
        padding?: string | undefined;
        cryptoFunctions?: string[] | undefined;
        classicalSecurityLevel?: number | undefined;
        nistQuantumSecurityLevel?: number | undefined;
      }
    | undefined;
  oid?: string | undefined;
}

export interface CycloneDxComponent {
  type: "cryptographic-asset";
  name: string;
  version?: string | undefined;
  purl?: string | undefined;
  "crypto-properties": CycloneDxCryptoProperties;
}

export interface CycloneDxCbom {
  bomFormat: "CycloneDX";
  specVersion: "1.6";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component?:
      | {
          name: string;
          version: string;
          type: string;
        }
      | undefined;
  };
  components: CycloneDxComponent[];
}

export interface SpdxElement {
  spdxId: string;
  name: string;
  type: string;
  algorithm: string;
  quantumSafe: boolean;
  standard?: string | undefined;
}

export interface SpdxCbom {
  spdxVersion: "SPDX-3.0.0";
  spdxId: string;
  creationInfo: {
    created: string;
    creators: string[];
  };
  name: string;
  elements: SpdxElement[];
}

export interface AuditFinding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  asset: string;
  rule: string;
  regulation: "DORA_ART_9" | "DORA_ART_13" | "CRA_ART_14" | "NIST_SP_800_131A";
  description: string;
  remediation: string;
}

export interface DoraAuditResult {
  score: number; // 0 - 100
  doraStatus: "COMPLIANT" | "CONDITIONAL" | "NON_COMPLIANT";
  craStatus: "COMPLIANT" | "NON_COMPLIANT";
  totalAssets: number;
  quantumSafeCount: number;
  vulnerableCount: number;
  deprecatedCount: number;
  quantumSafeRatio: number;
  findings: AuditFinding[];
  migrationRoadmap: string[];
}
