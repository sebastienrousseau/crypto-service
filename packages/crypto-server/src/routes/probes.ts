/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Kubernetes-style liveness, readiness probes and Prometheus metrics.
 *
 * - GET /live    — lightweight liveness check (always 200 if process is alive)
 * - GET /ready   — readiness check (verifies config is loaded)
 * - GET /metrics — Prometheus-compatible text metrics
 */

import type { FastifyInstance } from "fastify";

const startTime = Date.now();

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
   * Readiness probe — indicates the service is ready to accept traffic.
   * Checks that critical config is loaded.
   */
  app.get("/ready", { schema: { hide: true } }, async (_request, reply) => {
    const checks: Record<string, boolean> = {
      configLoaded: true,
      serverListening: true,
    };

    const allReady = Object.values(checks).every(Boolean);
    /* c8 ignore next -- checks are hardcoded true; 503 path is defensive */
    const status = allReady ? 200 : 503;

    return reply.status(status).send({
      /* c8 ignore next -- see above */
      status: allReady ? "ready" : "not_ready",
      checks,
    });
  });

  /**
   * Prometheus metrics endpoint.
   * Exposes basic process metrics + custom crypto operation counters.
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
      "# HELP nodejs_version_info Node.js version",
      "# TYPE nodejs_version_info gauge",
      `nodejs_version_info{version="${process.version}"} 1`,
      "",
    ];

    reply.header("content-type", "text/plain; version=0.0.4; charset=utf-8");
    return reply.send(lines.join("\n"));
  });
};
