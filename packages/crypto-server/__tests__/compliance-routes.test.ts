/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Tests for routes/v2/compliance.ts — DORA self-assessment & CycloneDX CBOM endpoints.
 */
import { expect } from "chai";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SUPPORTED_ALGORITHMS } from "@sebastienrousseau/crypto-lib/dist/modern";
import { init } from "../src/server";
import { readPackageVersion } from "../src/routes/v2/compliance";
import type { FastifyInstance } from "fastify";

/** Reads a workspace package's version straight from its package.json. */
function workspaceVersion(dir: string): string {
  const file = path.join(__dirname, "..", "..", dir, "package.json");
  return (JSON.parse(readFileSync(file, "utf8")) as { version: string })
    .version;
}

describe("Compliance endpoints (v2)", function () {
  this.timeout(15000);

  let app: FastifyInstance;

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("readPackageVersion", () => {
    it("returns the version from a workspace package.json", () => {
      expect(readPackageVersion("crypto-lib")).to.equal(
        workspaceVersion("crypto-lib"),
      );
    });

    it("returns 'unknown' when the package cannot be found", () => {
      expect(readPackageVersion("crypto-does-not-exist")).to.equal("unknown");
    });
  });

  describe("GET /v2/compliance/dora", () => {
    const getDora = async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v2/compliance/dora",
      });
      expect(res.statusCode).to.equal(200);
      return JSON.parse(res.payload).data;
    };

    it("returns a labelled self-assessment, not a compliance verdict", async () => {
      const data = await getDora();

      expect(data.standard).to.equal("DORA (EU 2022/2554)");
      expect(data.article).to.equal("Article 9 & Article 13");
      expect(data).to.not.have.property("complianceScore");
      expect(data.status).to.not.equal("Compliant");
      expect(data.status).to.match(/not a compliance verdict/i);
      expect(data.disclaimer).to.match(/not a DORA compliance assessment/i);

      expect(data.algorithmDeprecationSchedule).to.be.an("array").that.is.not
        .empty;
      const rsaRecord = data.algorithmDeprecationSchedule.find(
        (rec: { algorithm: string }) => rec.algorithm === "RSA-2048",
      );
      expect(rsaRecord).to.exist;
      expect(rsaRecord.recommendedMigration).to.include("ML-KEM");
    });

    it("derives primitive counts from crypto-lib's SUPPORTED_ALGORITHMS", async () => {
      const data = await getDora();
      const ids = new Set<string>(Object.values(SUPPORTED_ALGORITHMS).flat());
      const pq = [...ids].filter((id) =>
        /ml-kem|ml-dsa|slh-dsa|fn-dsa/.test(id),
      );
      expect(data.activePrimitivesCount).to.equal(ids.size);
      expect(data.postQuantumPrimitivesCount).to.equal(pq.length);
      expect(data.quantumResistanceRatio).to.equal(
        Math.round((pq.length / ids.size) * 100) / 100,
      );
    });

    it("reports each package version from its package.json", async () => {
      const data = await getDora();
      expect(data.cryptographicInventory).to.be.an("array").that.is.not.empty;
      for (const inv of data.cryptographicInventory as Array<{
        package: string;
        version: string;
      }>) {
        const dir = inv.package.replace("@sebastienrousseau/", "");
        expect(inv.version, inv.package).to.equal(workspaceVersion(dir));
      }
      const coreLib = data.cryptographicInventory.find(
        (inv: { package: string }) =>
          inv.package === "@sebastienrousseau/crypto-lib",
      );
      expect(coreLib.status).to.equal("implemented");
      expect(coreLib.fipsCompliance).to.include("not a validated");
    });

    it("makes no FIPS validation or constant-time claims", async () => {
      const data = await getDora();
      for (const inv of data.cryptographicInventory as Array<{
        fipsCompliance: string;
      }>) {
        expect(inv.fipsCompliance).to.not.match(/FIPS 140-3 Envelope/);
        expect(inv.fipsCompliance).to.not.match(/Constant-Time/i);
      }
      const wasm = data.cryptographicInventory.find(
        (inv: { package: string }) =>
          inv.package === "@sebastienrousseau/crypto-wasm",
      );
      expect(wasm.status).to.equal("placeholder");
    });

    it("stamps the timestamp at request time", async () => {
      const before = Date.now();
      const data = await getDora();
      const stamped = Date.parse(data.timestamp);
      expect(stamped).to.be.at.least(before - 1000);
      expect(stamped).to.be.at.most(Date.now() + 1000);
    });
  });

  describe("GET /v2/compliance/cbom", () => {
    const getCbom = async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v2/compliance/cbom",
      });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["content-type"]).to.include(
        "application/vnd.cyclonedx+json",
      );
      return JSON.parse(res.payload);
    };

    it("returns a CycloneDX 1.6 CBOM for the running crypto-server", async () => {
      const cbom = await getCbom();
      expect(cbom.bomFormat).to.equal("CycloneDX");
      expect(cbom.specVersion).to.equal("1.6");
      expect(cbom.metadata.component.name).to.equal(
        "@sebastienrousseau/crypto-server",
      );
      expect(cbom.metadata.component.version).to.equal(
        workspaceVersion("crypto-server"),
      );
      expect(cbom.metadata.tools[0].version).to.equal(
        workspaceVersion("crypto-server"),
      );

      expect(cbom.components).to.be.an("array").that.is.not.empty;
      const kem = cbom.components.find(
        (c: { name: string }) => c.name === "ML-KEM-768",
      );
      expect(kem).to.exist;
      expect(kem.type).to.equal("cryptographic-asset");
      expect(kem.version).to.equal("FIPS-203");
      for (const c of cbom.components as Array<{
        properties: Array<{ name: string }>;
      }>) {
        expect(c.properties.map((p) => p.name)).to.not.include(
          "dora-article-13-status",
        );
      }
    });

    it("issues a fresh urn:uuid serialNumber and timestamp per request", async () => {
      const before = Date.now();
      const first = await getCbom();
      const second = await getCbom();
      const uuid =
        /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(first.serialNumber).to.match(uuid);
      expect(second.serialNumber).to.match(uuid);
      expect(first.serialNumber).to.not.equal(second.serialNumber);
      expect(Date.parse(first.metadata.timestamp)).to.be.at.least(
        before - 1000,
      );
    });
  });
});
