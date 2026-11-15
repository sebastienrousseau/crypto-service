/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Kubernetes-style liveness, readiness probes and Prometheus metrics.
 *
 * - GET /live    — lightweight liveness check (always 200 if process is alive)
 * - GET /ready   — readiness check (not draining; key directory writable)
 * - GET /metrics — Prometheus-compatible text metrics
 */

import type { FastifyInstance } from "fastify";
import { readinessChecks } from "../lib/readiness";
import { flag, integer, problems } from "../utils/response-schemas";

/** Process start time for uptime calculations. */
const startTime = Date.now();

/** What /ready answers, ready (200) or not (503). */
const READINESS = {
  type: "object",
  required: ["status", "checks"],
  properties: {
    status: { type: "string", enum: ["ready", "not_ready"] },
    checks: {
      type: "object",
      description: "Each check, true when it passes.",
      required: ["accepting", "keyStore"],
      properties: {
        accepting: flag("The server is not draining for shutdown."),
        keyStore: flag("The key directory, when configured, is writable."),
      },
      additionalProperties: { type: "boolean" },
    },
  },
} as const;

/**
 * Route schema of `GET /health`, which fastify-healthcheck registers
 * (server.ts passes it as `schemaOptions`).
 */
export const HEALTH_SCHEMA = {
  tags: ["Probes"],
  summary: "Health check",
  description: "Process health from fastify-healthcheck. No credentials.",
  response: {
    200: {
      type: "object",
      description: "Healthy.",
      required: ["statusCode", "status", "uptime"],
      properties: {
        statusCode: { type: "integer", enum: [200] },
        status: { type: "string", enum: ["ok"] },
        uptime: { type: "number", description: "Process uptime in seconds." },
      },
    },
    ...problems(500),
  },
} as const;

/** Route schemas of the probes: public, never rate limited. */
const LIVE_SCHEMA = {
  tags: ["Probes"],
  summary: "Liveness probe",
  description: "Answers while the process is alive. No credentials.",
  response: {
    200: {
      type: "object",
      description: "The process is alive.",
      required: ["status", "uptime"],
      properties: {
        status: { type: "string", enum: ["alive"] },
        uptime: integer("Process uptime in whole seconds."),
      },
    },
    ...problems(500),
  },
} as const;

const READY_SCHEMA = {
  tags: ["Probes"],
  summary: "Readiness probe",
  description:
    "503 while the server drains for shutdown or cannot write keys. No credentials.",
  response: {
    200: { ...READINESS, description: "Ready to take traffic." },
    503: { ...READINESS, description: "Not ready; same body." },
    ...problems(500),
  },
} as const;

const METRICS_SCHEMA = {
  tags: ["Probes"],
  summary: "Prometheus metrics",
  description:
    "Process gauges and per-route request counters in the Prometheus text format 0.0.4. No credentials.",
  response: {
    200: {
      description: "Prometheus text exposition format.",
      content: { "text/plain": { schema: { type: "string" } } },
    },
    ...problems(500),
  },
} as const;

/** Registers liveness, readiness, and metrics probe endpoints. */
export default (app: FastifyInstance): void => {
  /**
   * Liveness probe — if this responds, the process is alive.
   * Kubernetes uses this to know when to restart a container.
   */
  app.get("/live", { schema: LIVE_SCHEMA }, async () => {
    return {
      status: "alive",
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  });

  /**
   * Readiness probe: 503 while the server drains for shutdown or cannot
   * write keys, so a load balancer stops sending it traffic.
   */
  app.get("/ready", { schema: READY_SCHEMA }, async (_request, reply) => {
    const checks = await readinessChecks(app);
    const allReady = Object.values(checks).every(Boolean);
    return reply.status(allReady ? 200 : 503).send({
      status: allReady ? "ready" : "not_ready",
      checks,
    });
  });

  /**
   * Prometheus metrics endpoint.
   * Exposes process metrics and per-route request counters. The Node.js
   * version is not exposed: it only helps fingerprint the server.
   */
  app.get("/metrics", { schema: METRICS_SCHEMA }, async (_request, reply) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const memUsage = process.memoryUsage();

    const lines = [
      "# HELP process_uptime_seconds Process uptime in seconds",
      "# TYPE process_uptime_seconds gauge",
      `process_uptime_seconds ${uptime}`,
      "",
      "# HELP process_resident_memory_bytes Resident memory size in bytes",
      "# TYPE process_resident_memory_bytes gauge",
      `process_resident_memory_bytes ${memUsage.rss}`,
      "",
      "# HELP process_heap_used_bytes Heap used in bytes",
      "# TYPE process_heap_used_bytes gauge",
      `process_heap_used_bytes ${memUsage.heapUsed}`,
      "",
      "# HELP process_heap_total_bytes Heap total in bytes",
      "# TYPE process_heap_total_bytes gauge",
      `process_heap_total_bytes ${memUsage.heapTotal}`,
      "",
      app.httpMetrics.render(),
    ];

    reply.header("content-type", "text/plain; version=0.0.4; charset=utf-8");
    return reply.send(lines.join("\n"));
  });
};
