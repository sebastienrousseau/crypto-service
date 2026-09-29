/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Multi-tenant metering and rate-limiting engine for Sovereign Crypto-as-a-Service (CaaS).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
  LicenseTier,
  MeteringCheckResult,
  TenantQuota,
  TenantUsage,
} from "./types";

/** Predefined quotas for each license tier. */
export const TIER_QUOTAS: Record<LicenseTier, TenantQuota> = {
  community: {
    tier: "community",
    maxRequestsPerMinute: 60,
    maxBytesPerPayload: 1024 * 1024, // 1 MB
    allowQuantumOperations: true,
    allowComplianceAudit: true,
  },
  enterprise: {
    tier: "enterprise",
    maxRequestsPerMinute: 1000,
    maxBytesPerPayload: 10 * 1024 * 1024, // 10 MB
    allowQuantumOperations: true,
    allowComplianceAudit: true,
  },
  sovereign: {
    tier: "sovereign",
    maxRequestsPerMinute: 10000,
    maxBytesPerPayload: 50 * 1024 * 1024, // 50 MB
    allowQuantumOperations: true,
    allowComplianceAudit: true,
  },
};

/** In-memory tenant store using a sliding-window token bucket algorithm. */
export class MeteringEngine {
  private readonly tenants = new Map<string, TenantUsage>();

  /** Resolves the license tier based on API key prefix or environment. */
  public resolveTier(apiKey?: string): LicenseTier {
    if (!apiKey) {
      return "community";
    }
    if (apiKey.startsWith("sk_sovereign_")) {
      return "sovereign";
    }
    if (apiKey.startsWith("sk_enterprise_")) {
      return "enterprise";
    }
    return "community";
  }

  /** Gets tenant usage record, initializing if not present. */
  private getUsage(
    tenantKey: string,
    tier: LicenseTier,
    nowMs: number,
  ): TenantUsage {
    let usage = this.tenants.get(tenantKey);
    if (!usage) {
      const quota = TIER_QUOTAS[tier];
      usage = {
        tokens: quota.maxRequestsPerMinute,
        lastRefillMs: nowMs,
        totalRequests: 0,
        totalBytes: 0,
        tier,
      };
      this.tenants.set(tenantKey, usage);
    }
    return usage;
  }

  /** Refills tokens based on elapsed time (1-minute sliding window). */
  private refillTokens(
    usage: TenantUsage,
    quota: TenantQuota,
    nowMs: number,
  ): void {
    const elapsedMs = nowMs - usage.lastRefillMs;
    if (elapsedMs <= 0) return;

    const refillRatePerMs = quota.maxRequestsPerMinute / 60000;
    const tokensToAdd = elapsedMs * refillRatePerMs;
    usage.tokens = Math.min(
      quota.maxRequestsPerMinute,
      usage.tokens + tokensToAdd,
    );
    usage.lastRefillMs = nowMs;
  }

  /** Evaluates whether an incoming request satisfies quota constraints. */
  public checkRequest(
    apiKey?: string,
    contentLength?: number,
    nowMs: number = Date.now(),
  ): MeteringCheckResult {
    const tier = this.resolveTier(apiKey);
    const quota = TIER_QUOTAS[tier];
    const tenantKey = apiKey ?? "anonymous_community";

    const usage = this.getUsage(tenantKey, tier, nowMs);
    this.refillTokens(usage, quota, nowMs);

    // Payload size validation
    if (
      contentLength !== undefined &&
      contentLength > quota.maxBytesPerPayload
    ) {
      const resetSeconds = Math.ceil(
        (60000 - ((nowMs - usage.lastRefillMs) % 60000)) / 1000,
      );
      return {
        allowed: false,
        limit: quota.maxRequestsPerMinute,
        remaining: Math.floor(Math.max(0, usage.tokens)),
        resetSeconds: Math.max(1, resetSeconds),
        tier,
        error: `Payload size (${contentLength} bytes) exceeds tier limit of ${quota.maxBytesPerPayload} bytes`,
        statusCode: 413,
      };
    }

    // Rate limiting check
    if (usage.tokens < 1) {
      const resetSeconds = Math.ceil(
        (60000 - ((nowMs - usage.lastRefillMs) % 60000)) / 1000,
      );
      return {
        allowed: false,
        limit: quota.maxRequestsPerMinute,
        remaining: 0,
        resetSeconds: Math.max(1, resetSeconds),
        tier,
        error: `Tenant rate limit exceeded for tier '${tier}'. Limit: ${quota.maxRequestsPerMinute} req/min.`,
        statusCode: 429,
      };
    }

    // Deduct token and record usage
    usage.tokens -= 1;
    usage.totalRequests += 1;
    if (contentLength !== undefined && contentLength > 0) {
      usage.totalBytes += contentLength;
    }

    const resetSeconds = Math.ceil(
      (60000 - ((nowMs - usage.lastRefillMs) % 60000)) / 1000,
    );

    return {
      allowed: true,
      limit: quota.maxRequestsPerMinute,
      remaining: Math.floor(Math.max(0, usage.tokens)),
      resetSeconds: Math.max(1, resetSeconds),
      tier,
    };
  }

  /** Clears all tenant tracking state (primarily for test environments). */
  public reset(): void {
    this.tenants.clear();
  }
}

/** Global default metering engine instance. */
export const defaultMeteringEngine = new MeteringEngine();

/**
 * Registers the multi-tenant CaaS metering preHandler hook on Fastify.
 */
export const registerMetering = (
  app: FastifyInstance,
  engine: MeteringEngine = new MeteringEngine(),
): void => {
  app.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip probes (/live, /ready, /metrics) and OpenAPI documentation (/docs)
      const url = request.url;
      if (
        url === "/live" ||
        url === "/ready" ||
        url === "/metrics" ||
        url.startsWith("/docs") ||
        url === "/favicon.ico"
      ) {
        return;
      }

      const apiKeyHeader = request.headers["x-api-key"];
      const apiKey =
        typeof apiKeyHeader === "string" ? apiKeyHeader : undefined;

      const rawLength = request.headers["content-length"];
      const contentLength =
        rawLength !== undefined && !Number.isNaN(Number(rawLength))
          ? Number(rawLength)
          : undefined;

      const result = engine.checkRequest(apiKey, contentLength);

      // Apply standard rate-limit and tier telemetry response headers
      reply.header("X-RateLimit-Limit", result.limit);
      reply.header("X-RateLimit-Remaining", result.remaining);
      reply.header("X-RateLimit-Reset", result.resetSeconds);
      reply.header("X-License-Tier", result.tier);

      if (!result.allowed) {
        const code = result.statusCode as number;
        return reply.code(code).send({
          statusCode: code,
          error: code === 413 ? "Payload Too Large" : "Too Many Requests",
          message: result.error,
          tier: result.tier,
          limit: result.limit,
          resetSeconds: result.resetSeconds,
        });
      }
    },
  );
};
