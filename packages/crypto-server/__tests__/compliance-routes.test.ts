/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Tests for routes/v2/compliance.ts — DORA Article 13 & CycloneDX CBOM endpoints.
 */
import { expect } from "chai";
import { init } from "../src/server";
import type { FastifyInstance } from "fastify";

describe("Compliance endpoints (v2)", function () {
  this.timeout(15000);

  let app: FastifyInstance;

  before(async () => {
    app = await init();
  });

  after(async () => {
    await app.close();
  });

  describe("GET /v2/compliance/dora", () => {
    it("should return 200 with complete DORA compliance scorecard", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v2/compliance/dora",
      });
      expect(res.statusCode).to.equal(200);

      const json = JSON.parse(res.payload);
      expect(json).to.have.property("data");
      const data = json.data;

      expect(data.standard).to.equal("DORA (EU 2022/2554)");
      expect(data.article).to.equal("Article 9 & Article 13");
      expect(data.complianceScore).to.equal(100);
      expect(data.status).to.equal("Compliant");
      expect(data.quantumResistanceRatio).to.be.a("number");
      expect(data.activePrimitivesCount).to.be.at.least(50);
      expect(data.postQuantumPrimitivesCount).to.be.at.least(16);

      expect(data.algorithmDeprecationSchedule).to.be.an("array").that.is.not
        .empty;
      const rsaRecord = data.algorithmDeprecationSchedule.find(
        (rec: { algorithm: string }) => rec.algorithm === "RSA-2048",
      );
      expect(rsaRecord).to.exist;
      expect(rsaRecord.recommendedMigration).to.include("ML-KEM");

      expect(data.cryptographicInventory).to.be.an("array").that.is.not.empty;
      const coreLib = data.cryptographicInventory.find(
        (inv: { package: string }) =>
          inv.package === "@sebastienrousseau/crypto-lib",
      );
      expect(coreLib).to.exist;
      expect(coreLib.status).to.equal("production");
    });
  });

  describe("GET /v2/compliance/cbom", () => {
    it("should return 200 with CycloneDX 1.6 CBOM payload and custom media type", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v2/compliance/cbom",
      });
      expect(res.statusCode).to.equal(200);

      const contentType = res.headers["content-type"];
      expect(contentType).to.include("application/vnd.cyclonedx+json");

      const cbom = JSON.parse(res.payload);
      expect(cbom.bomFormat).to.equal("CycloneDX");
      expect(cbom.specVersion).to.equal("1.6");
      expect(cbom.serialNumber).to.be.a("string");
      expect(cbom.metadata).to.be.an("object");
      expect(cbom.metadata.component.name).to.equal(
        "@sebastienrousseau/crypto-service",
      );

      expect(cbom.components).to.be.an("array").that.is.not.empty;
      const kem = cbom.components.find(
        (c: { name: string }) => c.name === "ML-KEM-768",
      );
      expect(kem).to.exist;
      expect(kem.type).to.equal("cryptographic-asset");
      expect(kem.version).to.equal("FIPS-203");
    });
  });
});
