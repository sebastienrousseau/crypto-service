/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Request counters for the Prometheus /metrics endpoint.
 *
 * Every response is counted by method, route pattern and status code, with
 * the total time spent answering. The route is the registered pattern
 * (`/v2/kms/keys/:keyId`), never the raw URL, and requests that matched no
 * route share one `unmatched` label, so the number of series stays bounded
 * whatever clients send.
 */

import type { FastifyInstance } from "fastify";

/** Counts and total duration for one method, route and status. */
interface Series {
  count: number;
  totalMs: number;
}

/** Label used for requests that matched no registered route. */
const UNMATCHED = "unmatched";

/** Escapes a Prometheus label value. */
function label(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** In-process request metrics, rendered in the Prometheus text format. */
export class HttpMetrics {
  private readonly series = new Map<string, Series>();

  /** Records one response. */
  record(
    method: string,
    route: string | undefined,
    status: number,
    durationMs: number,
  ): void {
    const labels = `method="${label(method)}",route="${label(route ?? UNMATCHED)}",status="${status}"`;
    const entry = this.series.get(labels) ?? { count: 0, totalMs: 0 };
    entry.count += 1;
    entry.totalMs += durationMs;
    this.series.set(labels, entry);
  }

  /** Renders the counters as Prometheus exposition text. */
  render(): string {
    const counts: string[] = [];
    const sums: string[] = [];
    for (const [labels, { count, totalMs }] of this.series) {
      counts.push(`http_requests_total{${labels}} ${count}`);
      sums.push(
        `http_request_duration_seconds_sum{${labels}} ${totalMs / 1000}`,
      );
      sums.push(`http_request_duration_seconds_count{${labels}} ${count}`);
    }
    return [
      "# HELP http_requests_total Responses sent, by method, route and status",
      "# TYPE http_requests_total counter",
      ...counts,
      "",
      "# HELP http_request_duration_seconds Time spent answering requests",
      "# TYPE http_request_duration_seconds summary",
      ...sums,
      "",
    ].join("\n");
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** Per-route request counters served on /metrics. */
    httpMetrics: HttpMetrics;
  }
}

/** Decorates the app with request metrics and counts every response. */
export function registerHttpMetrics(app: FastifyInstance): void {
  app.decorate("httpMetrics", new HttpMetrics());
  app.addHook("onResponse", async (request, reply) => {
    app.httpMetrics.record(
      request.method,
      request.routeOptions.url,
      reply.statusCode,
      reply.elapsedTime,
    );
  });
}
