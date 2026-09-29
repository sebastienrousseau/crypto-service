/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Type definitions for Enterprise CaaS (Crypto-as-a-Service) multi-tenant metering and compliance.
 */

/** The subscription tier governing feature gating and rate limits. */
export type LicenseTier = "community" | "enterprise" | "sovereign";

/** Quota parameters associated with a given license tier. */
export interface TenantQuota {
  readonly tier: LicenseTier;
  readonly maxRequestsPerMinute: number;
  readonly maxBytesPerPayload: number;
  readonly allowQuantumOperations: boolean;
  readonly allowComplianceAudit: boolean;
}

/** In-memory state tracking request consumption and bandwidth. */
export interface TenantUsage {
  tokens: number;
  lastRefillMs: number;
  totalRequests: number;
  totalBytes: number;
  tier: LicenseTier;
}

/** Result returned after evaluating tenant quota for an incoming request. */
export interface MeteringCheckResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetSeconds: number;
  readonly tier: LicenseTier;
  readonly error?: string;
  readonly statusCode?: number;
}

/** Deprecation schedule record for legacy ciphers under DORA Article 13. */
export interface AlgorithmDeprecationRecord {
  readonly algorithm: string;
  readonly category: "asymmetric" | "symmetric" | "hash" | "pqc";
  readonly sunsetDate: string;
  readonly recommendedMigration: string;
}

/** Monorepo cryptographic asset record in the inventory. */
export interface CryptographicAssetRecord {
  readonly package: string;
  readonly version: string;
  readonly status: "production" | "hardened";
  readonly fipsCompliance: string;
}

/** DORA compliance scorecard schema returned by /v2/compliance/dora. */
export interface DoraComplianceScorecard {
  readonly standard: "DORA (EU 2022/2554)";
  readonly article: "Article 9 & Article 13";
  readonly complianceScore: number;
  readonly status: "Compliant" | "Substantially Compliant" | "Action Required";
  readonly quantumResistanceRatio: number;
  readonly activePrimitivesCount: number;
  readonly postQuantumPrimitivesCount: number;
  readonly algorithmDeprecationSchedule: ReadonlyArray<AlgorithmDeprecationRecord>;
  readonly cryptographicInventory: ReadonlyArray<CryptographicAssetRecord>;
  readonly timestamp: string;
}

/** CycloneDX 1.6 CBOM payload schema returned by /v2/compliance/cbom. */
export interface CbomPayload {
  readonly bomFormat: "CycloneDX";
  readonly specVersion: "1.6";
  readonly serialNumber: string;
  readonly version: number;
  readonly metadata: {
    readonly timestamp: string;
    readonly tools: ReadonlyArray<{
      readonly vendor: string;
      readonly name: string;
      readonly version: string;
    }>;
    readonly component: {
      readonly type: "framework";
      readonly name: string;
      readonly version: string;
      readonly description: string;
    };
  };
  readonly components: ReadonlyArray<{
    readonly type: "cryptographic-asset";
    readonly name: string;
    readonly version: string;
    readonly properties: ReadonlyArray<{
      readonly name: string;
      readonly value: string;
    }>;
  }>;
}
