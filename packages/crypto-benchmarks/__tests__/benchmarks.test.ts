// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import {
  benchmarkOperation,
  runSymmetricBenchmarks,
  runAsymmetricBenchmarks,
  runPqcBenchmarks,
  runHashBenchmarks,
  runSuite,
  run,
  createPqcOperations,
} from "../src";
import { mlKemDecap } from "@sebastienrousseau/crypto-lib";

describe("Crypto Benchmarks Suite", () => {
  describe("High-Precision Timing Harness (benchmarkOperation)", () => {
    it("measures synchronous operations and returns valid statistics", async () => {
      let sum = 0;
      const stats = await benchmarkOperation(
        () => {
          for (let i = 0; i < 1000; i++) sum += i;
        },
        { iterations: 10, warmup: 2 },
      );

      expect(sum).to.be.greaterThan(0);
      expect(stats.iterations).to.equal(10);
      expect(stats.meanMs).to.be.a("number");
      expect(stats.medianMs).to.be.a("number");
      expect(stats.minMs).to.be.at.most(stats.maxMs);
      expect(stats.opsPerSec).to.be.greaterThan(0);
      expect(stats.p95Ms).to.be.a("number");
      expect(stats.p99Ms).to.be.a("number");
    });

    it("measures asynchronous operations with promises", async () => {
      const stats = await benchmarkOperation(
        async () => {
          await Promise.resolve();
        },
        { iterations: 5, warmup: 1 },
      );

      expect(stats.iterations).to.equal(5);
      expect(stats.opsPerSec).to.be.greaterThan(0);
    });

    it("applies default options when not specified", async () => {
      const stats = await benchmarkOperation(() => {});
      expect(stats.iterations).to.equal(10);
    });
  });

  describe("Symmetric Ciphers Benchmarking", () => {
    it("profiles AES-256-GCM, ChaCha20-Poly1305, and AES-128-CBC", async () => {
      const results = await runSymmetricBenchmarks(5);
      expect(results).to.have.lengthOf(3);

      const aesGcm = results.find((r) => r.algorithm === "AES-256-GCM");
      expect(aesGcm?.quantumSafe).to.be.true;
      expect(aesGcm?.stats.opsPerSec).to.be.greaterThan(0);

      const chacha = results.find((r) => r.algorithm === "ChaCha20-Poly1305");
      expect(chacha?.quantumSafe).to.be.true;

      const cbc = results.find((r) => r.algorithm === "AES-128-CBC");
      expect(cbc?.quantumSafe).to.be.false;
    });
  });

  describe("Asymmetric Algorithms Benchmarking", () => {
    it("profiles Ed25519, ECDSA-P256, and RSA-2048", async () => {
      const results = await runAsymmetricBenchmarks(5);
      expect(results).to.have.lengthOf(4);

      const edSign = results.find(
        (r) => r.algorithm === "Ed25519" && r.operation === "sign",
      );
      expect(edSign).to.exist;

      const edVerify = results.find(
        (r) => r.algorithm === "Ed25519" && r.operation === "verify",
      );
      expect(edVerify).to.exist;

      const ecSign = results.find((r) => r.algorithm === "ECDSA-P256");
      expect(ecSign).to.exist;

      const rsaSign = results.find((r) => r.algorithm === "RSA-2048");
      expect(rsaSign).to.exist;
    });
  });

  describe("Post-Quantum Cryptography Benchmarking", () => {
    it("times real crypto-lib ML-KEM-768 and ML-DSA-65 operations", () => {
      const ops = createPqcOperations();

      const encap = ops.mlKem768Encapsulate();
      expect(encap.algorithm).to.equal("ml-kem-768");
      const decap = mlKemDecap(768, ops.mlKem768SecretKey, encap.ciphertext);
      expect(decap.sharedSecret).to.equal(encap.sharedSecret);

      const verified = ops.mlDsa65Verify();
      expect(verified.algorithm).to.equal("ml-dsa-65");
      expect(verified.valid).to.be.true;
    });

    it("profiles classical ECDH baseline vs ML-KEM-768 and ML-DSA-65", async () => {
      const results = await runPqcBenchmarks(5);
      expect(results).to.have.lengthOf(3);

      const ecdh = results.find((r) => r.algorithm === "ECDH-P256");
      expect(ecdh?.quantumSafe).to.be.false;

      const kem = results.find((r) => r.algorithm === "ML-KEM-768");
      expect(kem?.quantumSafe).to.be.true;

      const dsa = results.find((r) => r.algorithm === "ML-DSA-65");
      expect(dsa?.quantumSafe).to.be.true;
    });
  });

  describe("Cryptographic Hash Benchmarking", () => {
    it("profiles SHA-256, SHA-512, and SHA3-256", async () => {
      const results = await runHashBenchmarks(5);
      expect(results).to.have.lengthOf(3);

      const sha256 = results.find((r) => r.algorithm === "SHA-256");
      expect(sha256?.quantumSafe).to.be.true;

      const sha512 = results.find((r) => r.algorithm === "SHA-512");
      expect(sha512?.quantumSafe).to.be.true;

      const sha3 = results.find((r) => r.algorithm === "SHA3-256");
      expect(sha3?.quantumSafe).to.be.true;
    });
  });

  describe("Suite Runner & Reporting (runSuite)", () => {
    it("executes individual benchmark suites and all", async () => {
      const symSuite = await runSuite({ suite: "symmetric", iterations: 2 });
      expect(symSuite.results).to.have.lengthOf(3);

      const asymSuite = await runSuite({ suite: "asymmetric", iterations: 2 });
      expect(asymSuite.results).to.have.lengthOf(4);

      const pqcSuite = await runSuite({ suite: "pqc", iterations: 2 });
      expect(pqcSuite.results).to.have.lengthOf(3);

      const hashSuite = await runSuite({ suite: "hash", iterations: 2 });
      expect(hashSuite.results).to.have.lengthOf(3);

      const allSuite = await runSuite({ suite: "all", iterations: 2 });
      expect(allSuite.results.length).to.equal(13);
      expect(allSuite.summaryMarkdown).to.include(
        "Cryptographic Performance Benchmark Report",
      );
      expect(allSuite.summaryTable).to.include("Name");
      expect(allSuite.platform).to.be.a("string");
    });

    it("runs with default configuration if none provided", async () => {
      const defSuite = await runSuite({});
      expect(defSuite.totalBenchmarks).to.equal(13);
    });
  });

  describe("CLI Execution", () => {
    it("prints help on --help or -h", async () => {
      const origWrite = process.stdout.write;
      let output = "";
      process.stdout.write = ((chunk: string | Uint8Array) => {
        output += String(chunk);
        return true;
      }) as unknown as typeof process.stdout.write;

      try {
        const code = await run(["--help"]);
        expect(code).to.equal(0);
        expect(output).to.include("Usage: crypto-benchmarks");
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it("runs CLI with various options (json, markdown, table)", async () => {
      const origWrite = process.stdout.write;
      let output = "";
      process.stdout.write = ((chunk: string | Uint8Array) => {
        output += String(chunk);
        return true;
      }) as unknown as typeof process.stdout.write;

      try {
        // 1. JSON output
        output = "";
        const jsonCode = await run([
          "--suite",
          "symmetric",
          "--iterations",
          "2",
          "--format",
          "json",
        ]);
        expect(jsonCode).to.equal(0);
        const parsed = JSON.parse(output);
        expect(parsed.totalBenchmarks).to.equal(3);

        // 2. Markdown output
        output = "";
        const mdCode = await run([
          "--suite",
          "pqc",
          "--iterations",
          "2",
          "--format",
          "markdown",
        ]);
        expect(mdCode).to.equal(0);
        expect(output).to.include(
          "# Cryptographic Performance Benchmark Report",
        );

        // 3. Table output
        output = "";
        const tableCode = await run([
          "--suite",
          "hash",
          "--iterations",
          "2",
          "--format",
          "table",
        ]);
        expect(tableCode).to.equal(0);
        expect(output).to.include("SHA-256");

        // 4. Default run
        output = "";
        const defCode = await run(["--iterations", "2"]);
        expect(defCode).to.equal(0);

        // 5. A missing or non-positive --iterations falls back to 30
        for (const extra of [[], ["--iterations", "0"]]) {
          output = "";
          await run(["--suite", "hash", "--format", "json", ...extra]);
          const report = JSON.parse(output);
          expect(report.results[0].stats.iterations).to.equal(30);
        }
      } finally {
        process.stdout.write = origWrite;
      }
    });
  });
});
