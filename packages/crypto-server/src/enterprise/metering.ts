/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Multi-tenant metering and rate limiting: one request quota per
 * authenticated tenant, and request and byte counts per tenant.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isProbePath } from "../config/constants";
import { sendProblem } from "../lib/problem";
import type { MeteringCheckResult, TenantUsage } from "./types";

/** The field of the authenticated principal that metering reads. */
interface MeteredPrincipal {
  /** Tenant identifier: the authenticated subject. */
  sub?: string;
}

/**
 * Requests a tenant may make per minute. Every tenant has the same quota:
 * license tiers, which gave some tenants more, are removed for now.
 */
export const TENANT_REQUESTS_PER_MINUTE = 60;

/** Default upper bound on the number of tenants tracked in memory. */
export const DEFAULT_MAX_TENANTS = 10_000;

/** Tenant key used when a request carries no authenticated principal. */
const ANONYMOUS_TENANT = "anonymous";

/** Whole tokens left in the bucket. */
const remainingTokens = (usage: TenantUsage): number =>
  Math.floor(Math.max(0, usage.tokens));

/** Seconds until the current one-minute window ends, at least 1. */
function secondsToReset(usage: TenantUsage, nowMs: number): number {
  const msIntoWindow = (nowMs - usage.lastRefillMs) % 60000;
  return Math.max(1, Math.ceil((60000 - msIntoWindow) / 1000));
}

/** Deducts a token and records the request and its payload size. */
function recordRequest(usage: TenantUsage, contentLength?: number): void {
  usage.tokens -= 1;
  usage.totalRequests += 1;
  if (contentLength !== undefined && contentLength > 0) {
    usage.totalBytes += contentLength;
  }
}

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
    private readonly requestsPerMinute: number = TENANT_REQUESTS_PER_MINUTE,
  ) {}

  /** Number of tenants currently tracked. */
  public get size(): number {
    return this.tenants.size;
  }

  /** Gets tenant usage record, initializing if not present. */
  private getUsage(tenantKey: string, nowMs: number): TenantUsage {
    let usage = this.tenants.get(tenantKey);
    if (usage) {
      // Re-insert to mark the tenant as most recently used.
      this.tenants.delete(tenantKey);
    } else {
      this.evictIfFull();
      usage = {
        tokens: this.requestsPerMinute,
        lastRefillMs: nowMs,
        totalRequests: 0,
        totalBytes: 0,
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
  private refillTokens(usage: TenantUsage, nowMs: number): void {
    const elapsedMs = nowMs - usage.lastRefillMs;
    if (elapsedMs <= 0) return;

    const refillRatePerMs = this.requestsPerMinute / 60000;
    const tokensToAdd = elapsedMs * refillRatePerMs;
    usage.tokens = Math.min(this.requestsPerMinute, usage.tokens + tokensToAdd);
    usage.lastRefillMs = nowMs;
  }

  /**
   * Evaluates whether a request from `tenantKey`, which must come from the
   * authenticated principal, is within its quota, and records it if so.
   * The payload size is only counted: the server's body limit bounds it.
   */
  public checkRequest(
    tenantKey: string,
    contentLength?: number,
    nowMs: number = Date.now(),
  ): MeteringCheckResult {
    const usage = this.getUsage(tenantKey, nowMs);
    this.refillTokens(usage, nowMs);
    const limit = this.requestsPerMinute;

    if (usage.tokens < 1) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds: secondsToReset(usage, nowMs),
        error: `Tenant rate limit exceeded. Limit: ${limit} req/min.`,
      };
    }

    recordRequest(usage, contentLength);
    return {
      allowed: true,
      limit,
      remaining: remainingTokens(usage),
      resetSeconds: secondsToReset(usage, nowMs),
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
 * Registers the multi-tenant metering preHandler hook on Fastify.
 *
 * The hook runs at `preHandler`, after every `onRequest` hook, so it sees
 * the principal the authentication hook stored on `request.auth`. The
 * tenant is `auth.sub`; a client-supplied header never selects it.
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
        // Unauthenticated callers (public routes) are metered per address,
        // so one client cannot exhaust the quota of every other.
        auth?.sub ?? `${ANONYMOUS_TENANT}:${request.ip}`,
        parseContentLength(request.headers["content-length"]),
      );

      reply.header("X-Tenant-RateLimit-Limit", result.limit);
      reply.header("X-Tenant-RateLimit-Remaining", result.remaining);
      reply.header("X-Tenant-RateLimit-Reset", result.resetSeconds);

      if (!result.allowed) {
        reply.header("Retry-After", result.resetSeconds);
        return sendProblem(reply, 429, "rate-limited", result.error as string, {
          limit: result.limit,
          resetSeconds: result.resetSeconds,
        });
      }
    },
  );
};
