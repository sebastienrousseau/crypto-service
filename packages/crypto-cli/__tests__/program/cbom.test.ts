/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Tests for `crypto-cli cbom scan` and `crypto-cli cbom audit`.
 */
import { expect } from "chai";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { EXIT } from "../../src/program/index";
import { runCli } from "./helpers";

/** A valid CycloneDX 1.6 CBOM with one quantum-safe asset (PASS). */
const PASSING_CBOM = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: "urn:uuid:crypto-cli-program-test",
  version: 1,
  components: [
    {
      type: "cryptographic-asset",
      name: "ML-KEM-768",
      cryptoProperties: {
        assetType: "algorithm",
        algorithmProperties: {
          primitive: "kem",
          parameterSetIdentifier: "768",
          cryptoFunctions: ["keygen", "encapsulate", "decapsulate"],
          nistQuantumSecurityLevel: 3,
        },
        oid: "2.16.840.1.101.3.4.4.2",
      },
    },
  ],
};

describe("crypto-cli cbom", function () {
  this.timeout(60000);

  const tempDir = path.join(os.tmpdir(), `crypto-cli-cbom-${process.pid}`);
  const weakDir = path.join(tempDir, "weak");
  const passingFile = path.join(tempDir, "passing.json");

  before(() => {
    fs.mkdirSync(weakDir, { recursive: true });
    fs.writeFileSync(
      path.join(weakDir, "weak.ts"),
      'const h = crypto.createHash("md5");\n',
    );
    fs.writeFileSync(passingFile, JSON.stringify(PASSING_CBOM));
  });

  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  describe("scan", () => {
    it("prints a CycloneDX CBOM as one line of JSON", async () => {
      const r = await runCli(["cbom", "scan", weakDir, "--json"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout.trim().split("\n")).to.have.length(1);
      const cbom = JSON.parse(r.stdout);
      expect(cbom.bomFormat).to.equal("CycloneDX");
      expect(cbom.components).to.have.length.greaterThan(0);
    });

    it("prints a pretty SPDX CBOM without --json", async () => {
      const r = await runCli(["cbom", "scan", weakDir, "-f", "spdx"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.include("SPDX-3.0");
      expect(r.stdout.split("\n").length).to.be.greaterThan(2);
    });

    it("writes --output to a file and keeps stdout empty", async () => {
      const out = path.join(tempDir, "scan.json");
      const r = await runCli(["cbom", "scan", weakDir, "-o", out, "--json"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.include(`CBOM written to ${out}`);
      expect(JSON.parse(fs.readFileSync(out, "utf8")).bomFormat).to.equal(
        "CycloneDX",
      );
    });

    it("exits 1 when the output cannot be written", async () => {
      const out = path.join(tempDir, "no-such-dir", "scan.json");
      const r = await runCli(["cbom", "scan", weakDir, "--output", out]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.match(/^crypto-cli: /);
    });

    it("exits 2 on an unknown format", async () => {
      const r = await runCli(["cbom", "scan", weakDir, "--format", "xml"]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stdout).to.equal("");
    });
  });

  describe("audit", () => {
    it("audits a CBOM read from stdin (PASS, exit 0)", async () => {
      const r = await runCli(
        ["cbom", "audit", "--json"],
        [JSON.stringify(PASSING_CBOM)],
      );
      expect(r.code).to.equal(EXIT.OK);
      const report = JSON.parse(r.stdout);
      expect(report.status).to.equal("PASS");
      expect(report.totalAssets).to.equal(1);
      expect(report.findings).to.be.an("array");
    });

    it("audits a CBOM file", async () => {
      const r = await runCli(["cbom", "audit", passingFile]);
      expect(r.code).to.equal(EXIT.OK);
      expect(JSON.parse(r.stdout).status).to.equal("PASS");
    });

    it("prints the report and exits 1 when the status is FAIL", async () => {
      const scan = await runCli(["cbom", "scan", weakDir, "--json"]);
      const r = await runCli(["cbom", "audit", "--json"], [scan.stdout]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(JSON.parse(r.stdout).status).to.equal("FAIL");
    });

    it("writes --output to a file", async () => {
      const out = path.join(tempDir, "audit.json");
      const r = await runCli(["cbom", "audit", passingFile, "-o", out]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.include("Audit report written to");
      expect(JSON.parse(fs.readFileSync(out, "utf8")).status).to.equal("PASS");
    });

    it("exits 1 on a document that is not a CBOM", async () => {
      const r = await runCli(["cbom", "audit"], ['{"invalid":true}']);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.include("Validation failed");
    });

    it("exits 1 on malformed JSON", async () => {
      const r = await runCli(["cbom", "audit", "-"], ["not-json{{"]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stdout).to.equal("");
    });
  });
});
