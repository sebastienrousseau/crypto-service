/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Multi-tenant metering and rate-limiting engine for Sovereign Crypto-as-a-Service (CaaS).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isProbePath } from "../config/constants";
import type {
  LicenseTier,
  MeteringCheckResult,
  TenantQuota,
  TenantUsage,
} from "./types";

/** The fields of the authenticated principal that metering reads. */
interface MeteredPrincipal {
  /** Tenant identifier: the authenticated subject. */
  sub?: string;
  /** License tier claim from a verified credential (e.g. a signed JWT). */
  tier?: unknown;
}

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

/** Default upper bound on the number of tenants tracked in memory. */
export const DEFAULT_MAX_TENANTS = 10_000;

/** Tenant key used when a request carries no authenticated principal. */
const ANONYMOUS_TENANT = "anonymous";

/**
 * In-memory tenant store using a sliding-window token bucket algorithm.
 *
 * The store is bounded: once it holds `maxTenants` entries, the least
 * recently used tenant is evicted. An evicted tenant starts again with a
 * full bucket, so the bound trades a little precision for fixed memory.
 */
export class MeteringEngine {
  private readonly tenants = new Map<string, TenantUsage>();

  /** Creates an engine that tracks at most `maxTenants` tenants. */
  public constructor(
    private readonly maxTenants: number = DEFAULT_MAX_TENANTS,
  ) {}

  /** Number of tenants currently tracked. */
  public get size(): number {
    return this.tenants.size;
  }

  /**
   * Resolves the license tier from a claim of the authenticated principal.
   *
   * Only a value that came from a verified credential may be passed here,
   * such as the `tier` claim of a signed JWT. Anything that is not a known
   * tier, including a missing claim, resolves to the community tier.
   */
  public resolveTier(claim?: unknown): LicenseTier {
    return typeof claim === "string" && Object.hasOwn(TIER_QUOTAS, claim)
      ? (claim as LicenseTier)
      : "community";
  }

  /** Gets tenant usage record, initializing if not present. */
  private getUsage(
    tenantKey: string,
    tier: LicenseTier,
    nowMs: number,
  ): TenantUsage {
    let usage = this.tenants.get(tenantKey);
    if (usage) {
      // Re-insert to mark the tenant as most recently used.
      this.tenants.delete(tenantKey);
    } else {
      this.evictIfFull();
      usage = {
        tokens: TIER_QUOTAS[tier].maxRequestsPerMinute,
        lastRefillMs: nowMs,
        totalRequests: 0,
        totalBytes: 0,
        tier,
      };
    }
    this.tenants.set(tenantKey, usage);
    return usage;
  }

  /** Drops the least recently used tenant when the store is full. */
  private evictIfFull(): void {
    if (this.tenants.size < this.maxTenants) return;
    const oldest = this.tenants.keys().next().value as string;
    this.tenants.delete(oldest);
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

  /**
   * Evaluates whether a request from `tenantKey` satisfies the quota of
   * `tier`. Both must come from the authenticated principal.
   */
  public checkRequest(
    tenantKey: string,
    tier: LicenseTier,
    contentLength?: number,
    nowMs: number = Date.now(),
  ): MeteringCheckResult {
    const quota = TIER_QUOTAS[tier];
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

/** Paths never metered: probes, API documentation and the favicon. */
const isUnmeteredPath = (url: string): boolean => {
  const pathname = url.split("?")[0];
  return (
    isProbePath(pathname) ||
    pathname.startsWith("/docs") ||
    pathname === "/favicon.ico"
  );
};

/** Parses the Content-Length header, ignoring malformed values. */
const parseContentLength = (raw?: string): number | undefined =>
  raw !== undefined && !Number.isNaN(Number(raw)) ? Number(raw) : undefined;

/**
 * Registers the multi-tenant CaaS metering preHandler hook on Fastify.
 *
 * The hook runs at `preHandler`, after every `onRequest` hook, so it sees
 * the principal the authentication hook stored on `request.auth`. The
 * tenant is `auth.sub`; the tier comes only from `auth.tier`, which is
 * present when the principal is a verified JWT carrying a `tier` claim.
 * API keys and anonymous access carry no tier and are metered at the
 * community tier. A client-supplied header never selects the tier.
 *
 * Tenant quotas are reported in `X-Tenant-RateLimit-*` headers so they do
 * not overwrite the global limiter's `X-RateLimit-*` headers.
 */
export const registerMetering = (
  app: FastifyInstance,
  engine: MeteringEngine = new MeteringEngine(),
): void => {
  app.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isUnmeteredPath(request.url)) return;

      const auth = (request as { auth?: MeteredPrincipal }).auth;
      const result = engine.checkRequest(
        auth?.sub ?? ANONYMOUS_TENANT,
        engine.resolveTier(auth?.tier),
        parseContentLength(request.headers["content-length"]),
      );

      reply.header("X-Tenant-RateLimit-Limit", result.limit);
      reply.header("X-Tenant-RateLimit-Remaining", result.remaining);
      reply.header("X-Tenant-RateLimit-Reset", result.resetSeconds);
      reply.header("X-License-Tier", result.tier);

      if (!result.allowed) {
        const code = result.statusCode as number;
        if (code === 429) reply.header("Retry-After", result.resetSeconds);
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
