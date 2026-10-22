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

/** Process start time for uptime calculations. */
const startTime = Date.now();

/** Registers liveness, readiness, and metrics probe endpoints. */
export default (app: FastifyInstance): void => {
  /**
   * Liveness probe — if this responds, the process is alive.
   * Kubernetes uses this to know when to restart a container.
   */
  app.get("/live", { schema: { hide: true } }, async () => {
    return {
      status: "alive",
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  });

  /**
   * Readiness probe: 503 while the server drains for shutdown or cannot
   * write keys, so a load balancer stops sending it traffic.
   */
  app.get("/ready", { schema: { hide: true } }, async (_request, reply) => {
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
  app.get("/metrics", { schema: { hide: true } }, async (_request, reply) => {
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
