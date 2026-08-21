/**
 * Tests for routes/probes.ts — /live, /ready, /metrics endpoints.
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("Probe endpoints", function () {
  this.timeout(15000);

  let app: FastifyInstance;

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("GET /live", () => {
    it("should return 200 with status alive", async () => {
      const res = await app.inject({ method: "GET", url: "/live" });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.status).to.equal("alive");
      expect(body.uptime).to.be.a("number");
      expect(body.uptime).to.be.at.least(0);
    });
  });

  describe("GET /ready", () => {
    it("should return 200 with status ready and checks", async () => {
      const res = await app.inject({ method: "GET", url: "/ready" });
      expect(res.statusCode).to.equal(200);
      const body = JSON.parse(res.payload);
      expect(body.status).to.equal("ready");
      expect(body.checks).to.be.an("object");
      expect(body.checks.configLoaded).to.be.true;
      expect(body.checks.serverListening).to.be.true;
    });
  });

  describe("GET /metrics", () => {
    it("should return Prometheus-compatible text metrics", async () => {
      const res = await app.inject({ method: "GET", url: "/metrics" });
      expect(res.statusCode).to.equal(200);

      // Check content type
      const contentType = res.headers["content-type"];
      expect(contentType).to.include("text/plain");
      expect(contentType).to.include("version=0.0.4");

      const payload = res.payload;

      // Check presence of expected metric families
      expect(payload).to.include("process_uptime_seconds");
      expect(payload).to.include("process_resident_memory_bytes");
      expect(payload).to.include("process_heap_used_bytes");
      expect(payload).to.include("process_heap_total_bytes");
      expect(payload).to.include("nodejs_version_info");

      // Check HELP and TYPE annotations
      expect(payload).to.include(
        "# HELP process_uptime_seconds Process uptime in seconds",
      );
      expect(payload).to.include("# TYPE process_uptime_seconds gauge");
      expect(payload).to.include(
        "# HELP process_resident_memory_bytes Resident memory size in bytes",
      );
      expect(payload).to.include(
        "# TYPE process_resident_memory_bytes gauge",
      );
      expect(payload).to.include(
        "# HELP process_heap_used_bytes Heap used in bytes",
      );
      expect(payload).to.include("# TYPE process_heap_used_bytes gauge");
      expect(payload).to.include(
        "# HELP process_heap_total_bytes Heap total in bytes",
      );
      expect(payload).to.include("# TYPE process_heap_total_bytes gauge");

      // Check that metrics include actual numeric values
      expect(payload).to.match(/process_uptime_seconds \d+/);
      expect(payload).to.match(/process_resident_memory_bytes \d+/);
      expect(payload).to.match(/process_heap_used_bytes \d+/);
      expect(payload).to.match(/process_heap_total_bytes \d+/);

      // Check Node.js version info metric
      expect(payload).to.match(
        /nodejs_version_info\{version="v[\d.]+"\} 1/,
      );
    });
  });
});
