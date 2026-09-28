// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  scanCode,
  scanDirectory,
  generateCycloneDxCbom,
  generateSpdxCbom,
  auditCbom,
  validateCbom,
  run,
  CryptoAsset,
} from "../src";

describe("Crypto CBOM Suite", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbom-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Cryptographic Scanner", () => {
    it("scans and identifies post-quantum primitives", () => {
      const source = [
        'const k1 = "ml-kem-512";',
        'const k2 = "ml-kem-768";',
        'const k3 = "ml-kem-1024";',
        'const s1 = "ml-dsa-44";',
        'const s2 = "ml-dsa-65";',
        'const s3 = "ml-dsa-87";',
        'const s4 = "slh-dsa";',
      ].join("\n");

      const assets = scanCode(source, "pqc.ts");
      expect(assets).to.have.lengthOf(7);
      for (const a of assets) {
        expect(a.quantumResistant).to.be.true;
        expect(a.resistanceLevel).to.equal("QUANTUM_SAFE");
      }
    });

    it("scans and classifies symmetric ciphers and legacy ciphers", () => {
      const source = [
        'const c1 = "aes-256-gcm";',
        'const c2 = "aes-128-gcm";',
        'const c3 = "aes-256-cbc";',
        'const c4 = "aes-128-ecb";',
        'const c5 = "chacha20-poly1305";',
        'const c6 = "3des";',
        'const c7 = "rc4";',
      ].join("\n");

      const assets = scanCode(source, "symmetric.ts");
      expect(assets).to.have.lengthOf(7);
      const ecb = assets.find((a) => a.name === "AES-ECB");
      expect(ecb?.resistanceLevel).to.equal("DEPRECATED_BROKEN");
      const chacha = assets.find((a) => a.name === "ChaCha20-Poly1305");
      expect(chacha?.resistanceLevel).to.equal("QUANTUM_SAFE");
    });

    it("scans classical public-key cryptography, hashes, and PEM blocks", () => {
      const source = [
        'const sig1 = "ed25519";',
        'const sig2 = "ecdsa";',
        'const kex = "rsa";',
        'const h1 = "sha-256";',
        'const h2 = "sha-512";',
        'const h3 = "sha3-256";',
        'const h4 = "md5";',
        'const h5 = "sha-1";',
        "-----BEGIN CERTIFICATE-----",
        "-----BEGIN RSA PRIVATE KEY-----",
      ].join("\n");

      const assets = scanCode(source, "crypto.ts");
      expect(assets.length).to.be.greaterThanOrEqual(9);

      const md5 = assets.find((a) => a.name === "Broken Hash");
      expect(md5?.resistanceLevel).to.equal("DEPRECATED_BROKEN");

      const rsa = assets.find((a) => a.name === "RSA");
      expect(rsa?.resistanceLevel).to.equal("VULNERABLE_CRQC");

      const cert = assets.find((a) => a.name === "X.509 Certificate");
      expect(cert).to.exist;
    });

    it("deduplicates identical asset detections on the same line", () => {
      const source = 'const kem = "ml-kem-768" && "ml-kem-768";';
      const assets = scanCode(source, "dedupe.ts");
      expect(assets).to.have.lengthOf(1);
    });

    it("scans directory recursively and ignores node_modules and .git", () => {
      const subDir = path.join(tmpDir, "sub");
      const ignoredDir = path.join(tmpDir, "node_modules");
      fs.mkdirSync(subDir);
      fs.mkdirSync(ignoredDir);

      fs.writeFileSync(
        path.join(subDir, "crypto.ts"),
        'const k = "ml-kem-768";',
      );
      fs.writeFileSync(
        path.join(ignoredDir, "vendor.ts"),
        'const bad = "md5";',
      );

      const assets = scanDirectory(tmpDir);
      expect(assets).to.have.lengthOf(1);
      expect(assets[0].name).to.equal("ML-KEM-768");

      // Nonexistent directory
      expect(scanDirectory(path.join(tmpDir, "nonexistent"))).to.deep.equal([]);

      // Single file path
      const singleFileAssets = scanDirectory(path.join(subDir, "crypto.ts"));
      expect(singleFileAssets).to.have.lengthOf(1);
    });
  });

  describe("CycloneDX 1.6 CBOM Generation", () => {
    it("generates valid CycloneDX 1.6 CBOM with defaults and custom options", () => {
      const mockAssets: CryptoAsset[] = [
        {
          name: "ML-KEM-1024",
          algorithm: "ML-KEM",
          type: "kem",
          keySize: 1024,
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
          standard: "NIST FIPS 203",
        },
        {
          name: "AES-256-GCM",
          algorithm: "AES",
          type: "cipher",
          keySize: 256,
          mode: "GCM",
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
          standard: "NIST SP 800-38D",
        },
      ];

      const defaultCbom = generateCycloneDxCbom(mockAssets);
      expect(defaultCbom.bomFormat).to.equal("CycloneDX");
      expect(defaultCbom.specVersion).to.equal("1.6");
      expect(defaultCbom.serialNumber).to.include("urn:uuid:");
      expect(defaultCbom.components).to.have.lengthOf(2);
      expect(
        defaultCbom.components[0]["crypto-properties"].algorithmProperties
          ?.nistQuantumSecurityLevel,
      ).to.equal(5);

      const customCbom = generateCycloneDxCbom(mockAssets, {
        componentName: "payment-gateway",
        componentVersion: "2.1.0",
        componentType: "service",
      });
      expect(customCbom.metadata.component?.name).to.equal("payment-gateway");
      expect(customCbom.metadata.component?.version).to.equal("2.1.0");
      expect(customCbom.metadata.component?.type).to.equal("service");
    });
  });

  describe("SPDX 3.0 CBOM Generation", () => {
    it("generates valid SPDX 3.0 document with elements", () => {
      const mockAssets: CryptoAsset[] = [
        {
          name: "ML-DSA-65",
          algorithm: "ML-DSA",
          type: "signature",
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
          standard: "NIST FIPS 204",
        },
      ];

      const spdx = generateSpdxCbom(mockAssets, {
        name: "Custom-SPDX",
        creator: "Tester",
      });
      expect(spdx.spdxVersion).to.equal("SPDX-3.0.0");
      expect(spdx.name).to.equal("Custom-SPDX");
      expect(spdx.elements).to.have.lengthOf(1);
      expect(spdx.elements[0].spdxId).to.equal("SPDXRef-CryptoAsset-1");
      expect(spdx.elements[0].quantumSafe).to.be.true;

      const defSpdx = generateSpdxCbom(mockAssets);
      expect(defSpdx.name).to.equal("Crypto-Service-CBOM");
    });
  });

  describe("DORA & CRA Regulatory Audit", () => {
    it("scores 100% COMPLIANT for quantum-safe architectures", () => {
      const safeAssets: CryptoAsset[] = [
        {
          name: "ML-KEM-768",
          algorithm: "ML-KEM",
          type: "kem",
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
        },
        {
          name: "AES-256-GCM",
          algorithm: "AES",
          type: "cipher",
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
        },
      ];

      const audit = auditCbom(safeAssets);
      expect(audit.score).to.equal(100);
      expect(audit.doraStatus).to.equal("COMPLIANT");
      expect(audit.craStatus).to.equal("COMPLIANT");
      expect(audit.findings).to.have.lengthOf(0);
      expect(audit.migrationRoadmap[0]).to.include("Continuous Monitoring");
    });

    it("evaluates empty asset list with default score 100", () => {
      const audit = auditCbom([]);
      expect(audit.score).to.equal(100);
      expect(audit.quantumSafeRatio).to.equal(1);
    });

    it("detects CRITICAL non-compliance when broken primitives are present", () => {
      const brokenAssets: CryptoAsset[] = [
        {
          name: "MD5",
          algorithm: "MD5",
          type: "hash",
          quantumResistant: false,
          resistanceLevel: "DEPRECATED_BROKEN",
        },
        {
          name: "RSA-1024",
          algorithm: "RSA",
          type: "cipher",
          quantumResistant: false,
          resistanceLevel: "VULNERABLE_CRQC",
        },
        {
          name: "AES-128-CBC",
          algorithm: "AES",
          type: "cipher",
          quantumResistant: false,
          resistanceLevel: "TRANSITIONAL_HYBRID",
        },
      ];

      const audit = auditCbom(brokenAssets);
      expect(audit.doraStatus).to.equal("NON_COMPLIANT");
      expect(audit.craStatus).to.equal("NON_COMPLIANT");
      expect(audit.score).to.be.lessThan(80);
      expect(audit.migrationRoadmap.length).to.be.greaterThan(1);
      expect(audit.findings.some((f) => f.regulation === "DORA_ART_9")).to.be
        .true;
    });

    it("audits from a CycloneDX document object", () => {
      const cbom = generateCycloneDxCbom([
        {
          name: "MD5",
          algorithm: "MD5",
          type: "hash",
          quantumResistant: false,
          resistanceLevel: "DEPRECATED_BROKEN",
        },
        {
          name: "RSA-2048",
          algorithm: "RSA",
          type: "cipher",
          quantumResistant: false,
          resistanceLevel: "VULNERABLE_CRQC",
        },
        {
          name: "AES-128",
          algorithm: "AES-128",
          type: "cipher",
          quantumResistant: false,
          resistanceLevel: "TRANSITIONAL_HYBRID",
        },
        {
          name: "ML-KEM-768",
          algorithm: "ML-KEM",
          type: "kem",
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
        },
      ]);

      cbom.components.push({
        type: "cryptographic-asset",
        name: "ECDSA-Fallback",
        "crypto-properties": { assetType: "signature" },
      });

      const audit = auditCbom(cbom);
      expect(audit.totalAssets).to.equal(5);
      expect(audit.deprecatedCount).to.equal(1);
      expect(audit.vulnerableCount).to.equal(2);
      expect(audit.quantumSafeCount).to.equal(1);
    });
    it("evaluates conditional DORA status when score is between 50 and 84 with no deprecated assets", () => {
      const conditionalAssets: CryptoAsset[] = [
        {
          name: "RSA-2048",
          algorithm: "RSA",
          type: "cipher",
          quantumResistant: false,
          resistanceLevel: "VULNERABLE_CRQC",
        },
        {
          name: "ECDSA-P256",
          algorithm: "ECC",
          type: "signature",
          quantumResistant: false,
          resistanceLevel: "VULNERABLE_CRQC",
        },
      ];
      const audit = auditCbom(conditionalAssets);
      expect(audit.doraStatus).to.equal("CONDITIONAL");
      expect(audit.score).to.equal(80);
    });
  });

  describe("Schema Validator", () => {
    it("validates valid CycloneDX 1.6 and SPDX 3.0 documents", () => {
      const cbom = generateCycloneDxCbom([]);
      expect(validateCbom(cbom).valid).to.be.true;

      const spdx = generateSpdxCbom([]);
      expect(validateCbom(spdx).valid).to.be.true;
    });

    it("rejects non-object or malformed documents", () => {
      expect(validateCbom(null).valid).to.be.false;
      expect(validateCbom("string").valid).to.be.false;
      expect(validateCbom({ random: "format" }).valid).to.be.false;

      // Malformed CycloneDX
      const badCdx = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        serialNumber: 123,
        components: [{ type: "not-crypto" }],
      };
      const res = validateCbom(badCdx);
      expect(res.valid).to.be.false;
      expect(res.errors.length).to.be.greaterThan(1);

      const nonArrayCdx = {
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        serialNumber: "urn:uuid:123",
        components: "not-an-array",
      };
      expect(validateCbom(nonArrayCdx).valid).to.be.false;

      // Malformed SPDX
      const badSpdx = { spdxVersion: "SPDX-3.0.0", spdxId: 123 };
      expect(validateCbom(badSpdx).valid).to.be.false;
    });
  });

  describe("CLI Execution", () => {
    it("prints help on empty arguments or --help", () => {
      const origWrite = process.stdout.write;
      let output = "";
      process.stdout.write = ((chunk: string | Uint8Array) => {
        output += String(chunk);
        return true;
      }) as unknown as typeof process.stdout.write;
      try {
        const code1 = run([]);
        expect(code1).to.equal(0);
        expect(output).to.include("Usage: crypto-cbom");

        const code2 = run(["--help"]);
        expect(code2).to.equal(0);
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it("scans and outputs CycloneDX or SPDX to stdout and files", () => {
      const sampleFile = path.join(tmpDir, "app.ts");
      fs.writeFileSync(sampleFile, 'const k = "ml-kem-768";');

      const outFile = path.join(tmpDir, "out-cbom.json");
      const scanCodeResult = run([
        "scan",
        tmpDir,
        "--format",
        "cyclonedx",
        "--output",
        outFile,
      ]);
      expect(scanCodeResult).to.equal(0);
      expect(fs.existsSync(outFile)).to.be.true;
      const fileContent = JSON.parse(fs.readFileSync(outFile, "utf8"));
      expect(fileContent.bomFormat).to.equal("CycloneDX");

      // Scan to stdout
      const origWrite = process.stdout.write;
      let stdoutData = "";
      process.stdout.write = ((chunk: string | Uint8Array) => {
        stdoutData += String(chunk);
        return true;
      }) as unknown as typeof process.stdout.write;
      try {
        const scanSpdx = run(["scan", tmpDir, "--format", "spdx"]);
        expect(scanSpdx).to.equal(0);
        expect(stdoutData).to.include("SPDX-3.0.0");

        const defaultScan = run(["scan"]);
        expect(defaultScan).to.equal(0);
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it("audits compliant and non-compliant CBOM files", () => {
      const safeCbom = generateCycloneDxCbom([
        {
          name: "ML-KEM-768",
          algorithm: "ML-KEM",
          type: "kem",
          quantumResistant: true,
          resistanceLevel: "QUANTUM_SAFE",
        },
      ]);
      const safeFile = path.join(tmpDir, "safe-cbom.json");
      fs.writeFileSync(safeFile, JSON.stringify(safeCbom));

      const origStdout = process.stdout.write;
      const origStderr = process.stderr.write;
      process.stdout.write = (() =>
        true) as unknown as typeof process.stdout.write;
      process.stderr.write = (() =>
        true) as unknown as typeof process.stderr.write;

      try {
        const safeExit = run(["audit", safeFile]);
        expect(safeExit).to.equal(0);

        // Broken CBOM
        const brokenCbom = generateCycloneDxCbom([
          {
            name: "MD5",
            algorithm: "MD5",
            type: "hash",
            quantumResistant: false,
            resistanceLevel: "DEPRECATED_BROKEN",
          },
        ]);
        const brokenFile = path.join(tmpDir, "broken-cbom.json");
        fs.writeFileSync(brokenFile, JSON.stringify(brokenCbom));
        const brokenExit = run(["audit", brokenFile]);
        expect(brokenExit).to.equal(1);

        // Nonexistent file
        const nonExistent = run(["audit", path.join(tmpDir, "not-here.json")]);
        expect(nonExistent).to.equal(1);

        // Invalid JSON file
        const invalidJsonFile = path.join(tmpDir, "invalid.json");
        fs.writeFileSync(invalidJsonFile, JSON.stringify({ bad: "doc" }));
        const invalidExit = run(["audit", invalidJsonFile]);
        expect(invalidExit).to.equal(1);

        // Unknown command
        const unknownCmd = run(["invalid-cmd"]);
        expect(unknownCmd).to.equal(1);
      } finally {
        process.stdout.write = origStdout;
        process.stderr.write = origStderr;
      }
    });
  });
});
