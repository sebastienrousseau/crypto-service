/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Telemetry and metrics. OpenTelemetry started in production even with
 * no OTLP endpoint (exporting to the default localhost URLs), although the
 * docs say export is disabled without one; its modules were loaded at
 * startup even when unused; traceCryptoOperation had no caller; and
 * /metrics served only process figures (and the Node.js version), no
 * request counts. Telemetry now starts only with an endpoint, and every
 * response is counted per route for /metrics and, when enabled,
 * OpenTelemetry.
 */
import { expect } from "chai";
import * as http from "http";
import type { AddressInfo } from "net";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import {
  initTelemetry,
  shutdownTelemetry,
  telemetryActive,
} from "../src/lib/telemetry";
import { HttpMetrics } from "../src/lib/http-metrics";
import { withEnv } from "./support/auth";

describe("telemetry and metrics", function () {
  this.timeout(60000);

  describe("OpenTelemetry", () => {
    afterEach(async () => {
      await shutdownTelemetry();
    });

    it("stays off without an OTLP endpoint, in production too", async () => {
      await withEnv(
        { OTEL_EXPORTER_OTLP_ENDPOINT: undefined, NODE_ENV: "production" },
        async () => {
          initTelemetry();
          expect(telemetryActive()).to.equal(false);
        },
      );
    });

    it("stays off when OTEL_SDK_DISABLED is true", async () => {
      await withEnv(
        {
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:1",
          OTEL_SDK_DISABLED: "true",
        },
        async () => {
          initTelemetry();
          expect(telemetryActive()).to.equal(false);
        },
      );
    });

    it("starts with an endpoint and shuts down cleanly", async () => {
      await withEnv(
        {
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:1",
          OTEL_SDK_DISABLED: undefined,
        },
        async () => {
          initTelemetry();
          expect(telemetryActive()).to.equal(true);
          await shutdownTelemetry();
          expect(telemetryActive()).to.equal(false);
        },
      );
    });
  });

  describe("Fastify tracing", () => {
    /** Spans exported to a local OTLP receiver, by instrumentation scope. */
    async function exportedScopes(): Promise<string[]> {
      const bodies: string[] = [];
      const receiver = http.createServer((req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          if (req.url === "/v1/traces") bodies.push(body);
          res.writeHead(200, { "content-type": "application/json" });
          res.end("{}");
        });
      });
      await new Promise<void>((resolve) =>
        receiver.listen(0, "127.0.0.1", resolve),
      );
      const { port } = receiver.address() as AddressInfo;
      try {
        await withEnv(
          {
            OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${port}`,
            OTEL_SDK_DISABLED: undefined,
          },
          async () => {
            initTelemetry();
            const app = await init({ logger: false });
            try {
              await app.inject({ method: "GET", url: "/ready" });
            } finally {
              await app.close();
            }
            await shutdownTelemetry();
          },
        );
      } finally {
        receiver.closeAllConnections();
        receiver.close();
      }
      return bodies.flatMap((body) =>
        (
          JSON.parse(body) as {
            resourceSpans: { scopeSpans: { scope: { name: string } }[] }[];
          }
        ).resourceSpans.flatMap((rs) => rs.scopeSpans.map((s) => s.scope.name)),
      );
    }

    // @opentelemetry/instrumentation-fastify is deprecated in favour of
    // @fastify/otel, maintained by the Fastify authors. It hooks Fastify
    // as each instance is created, so the server's requests are traced
    // even when Fastify was loaded before telemetry started.
    it("traces the server's requests with @fastify/otel", async () => {
      expect(await exportedScopes()).to.include("@fastify/otel");
    });

    // shutdownTelemetry() left the API's global providers pointing at the
    // stopped SDK, so a second start exported nothing.
    it("still exports after a shutdown and a new start", async () => {
      await exportedScopes();
      expect(await exportedScopes()).to.include("@fastify/otel");
    });
  });

  describe("HttpMetrics", () => {
    it("counts requests and duration per method, route and status", () => {
      const m = new HttpMetrics();
      m.record("POST", "/v2/hash", 200, 12);
      m.record("POST", "/v2/hash", 200, 8);
      m.record("POST", "/v2/hash", 400, 1);
      m.record("GET", undefined, 404, 1);
      const text = m.render();
      expect(text).to.include(
        'http_requests_total{method="POST",route="/v2/hash",status="200"} 2',
      );
      expect(text).to.include(
        'http_requests_total{method="POST",route="/v2/hash",status="400"} 1',
      );
      expect(text).to.include(
        'http_request_duration_seconds_sum{method="POST",route="/v2/hash",status="200"} 0.02',
      );
      expect(text).to.include('route="unmatched"');
      expect(text).to.include("# TYPE http_requests_total counter");
    });
  });

  describe("/metrics", () => {
    let app: FastifyInstance;
    before(async () => {
      app = await init({ logger: false });
    });
    after(async () => {
      await app.close();
    });

    it("reports the requests the server answered, by route", async () => {
      await app.inject({
        method: "POST",
        url: "/v2/hash",
        payload: { data: "x", algorithm: "sha256" },
      });
      const res = await app.inject({ method: "GET", url: "/metrics" });
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.match(
        /http_requests_total\{method="POST",route="\/v2\/hash",status="200"\} [1-9]/,
      );
      expect(res.body).to.include("process_resident_memory_bytes");
      expect(res.body).to.not.include("nodejs_version_info");
    });
  });
});
