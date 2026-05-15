#!/usr/bin/env node
/**
 * Crypto Service Suite — Comprehensive Benchmark Suite
 *
 * Usage: node --require ts-node/register/transpile-only benchmarks/crypto-bench.ts
 *        [--iterations N] [--filter pattern]
 *
 * Run from packages/crypto-lib:
 *   node --require ts-node/register/transpile-only ../../benchmarks/crypto-bench.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
import { performance } from "node:perf_hooks";
import * as nodeCrypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cryptoLib = require("../packages/crypto-lib/dist/modern");
const accel = require("../packages/crypto-lib/dist/accel");

// --- Config ---
const DEFAULT_ITERATIONS = 500;
const args = process.argv.slice(2);
let iterations = DEFAULT_ITERATIONS;
let filter = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--iterations" && args[i + 1]) {
    iterations = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--filter" && args[i + 1]) {
    filter = args[i + 1];
    i++;
  }
}

// --- Types ---
interface BenchResult {
  name: string;
  opsPerSec: number;
  avgMs: number;
  throughputMBps?: number;
  iterations: number;
}

// --- Bench runner ---
function bench(
  name: string,
  fn: () => void,
  opts?: { dataSize?: number; iters?: number },
): BenchResult | null {
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) {
    return null;
  }
  const n = opts?.iters ?? iterations;

  // Warmup
  for (let i = 0; i < Math.min(10, n); i++) fn();

  const start = performance.now();
  for (let i = 0; i < n; i++) fn();
  const elapsed = performance.now() - start;

  const avgMs = elapsed / n;
  const opsPerSec = (n / elapsed) * 1000;
  const throughputMBps = opts?.dataSize
    ? (opts.dataSize * n) / elapsed / 1000
    : undefined;

  return { name, opsPerSec, avgMs, throughputMBps, iterations: n };
}

// --- Benchmark definitions ---
function runBenchmarks(): BenchResult[] {
  const results: BenchResult[] = [];
  const add = (r: BenchResult | null) => {
    if (r) results.push(r);
  };

  const data1KB = nodeCrypto.randomBytes(1024);

  // --- Hashing via WASM bridge ---
  console.log("\n=== HASHING (via wasmHash) ===");

  add(
    bench(
      "SHA-256 (1 KB) [noble]",
      () => accel.wasmHash({ algorithm: "sha256", data: data1KB }),
      { dataSize: 1024 },
    ),
  );
  add(
    bench(
      "SHA-512 (1 KB) [noble]",
      () => accel.wasmHash({ algorithm: "sha512", data: data1KB }),
      { dataSize: 1024 },
    ),
  );
  add(
    bench(
      "SHA3-256 (1 KB) [noble]",
      () => accel.wasmHash({ algorithm: "sha3-256", data: data1KB }),
      { dataSize: 1024 },
    ),
  );
  add(
    bench(
      "BLAKE3 (1 KB) [noble]",
      () => accel.wasmHash({ algorithm: "blake3", data: data1KB }),
      { dataSize: 1024 },
    ),
  );

  // Node native comparison
  add(
    bench(
      "SHA-256 (1 KB) [node:crypto]",
      () => nodeCrypto.createHash("sha256").update(data1KB).digest(),
      { dataSize: 1024 },
    ),
  );

  // --- Crypto-lib modern API ---
  console.log("\n=== AEAD ENCRYPTION ===");

  const hexKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const pt = "Hello, Crypto Service Suite!";

  add(
    bench("XChaCha20-Poly1305 encrypt", () =>
      cryptoLib.aeadEncrypt({ key: hexKey, plaintext: pt }),
    ),
  );

  const enc = cryptoLib.aeadEncrypt({ key: hexKey, plaintext: pt });
  add(
    bench("XChaCha20-Poly1305 decrypt", () =>
      cryptoLib.aeadDecrypt({ key: hexKey, ciphertext: enc.ciphertext }),
    ),
  );

  add(
    bench("AES-256-GCM encrypt", () =>
      cryptoLib.aesGcmEncrypt({
        key: hexKey,
        plaintext: pt,
        algorithm: "aes-256-gcm",
      }),
    ),
  );

  // --- Signing ---
  console.log("\n=== DIGITAL SIGNATURES ===");

  const edKP = cryptoLib.generateEd25519KeyPair();
  add(bench("Ed25519 keygen", () => cryptoLib.generateEd25519KeyPair()));

  const msgHex = Buffer.from("benchmark message").toString("hex");
  const sig = cryptoLib.ed25519Sign(edKP.privateKey, msgHex);
  add(
    bench("Ed25519 sign", () =>
      cryptoLib.ed25519Sign(edKP.privateKey, msgHex),
    ),
  );
  add(
    bench("Ed25519 verify", () =>
      cryptoLib.ed25519Verify(edKP.publicKey, msgHex, sig.signature),
    ),
  );

  // --- Key Exchange ---
  console.log("\n=== KEY EXCHANGE ===");

  add(bench("X25519 keygen", () => cryptoLib.generateX25519KeyPair()));

  const kp1 = cryptoLib.generateX25519KeyPair();
  const kp2 = cryptoLib.generateX25519KeyPair();
  add(
    bench("X25519 ECDH", () =>
      cryptoLib.x25519Exchange(kp1.privateKey, kp2.publicKey),
    ),
  );

  // --- Post-Quantum ---
  console.log("\n=== POST-QUANTUM ===");

  add(
    bench("ML-KEM-768 keygen", () => cryptoLib.mlKemKeygen(768), {
      iters: 50,
    }),
  );

  const kemKP = cryptoLib.mlKemKeygen(768);
  add(
    bench(
      "ML-KEM-768 encapsulate",
      () => cryptoLib.mlKemEncap(768, kemKP.publicKey),
      { iters: 50 },
    ),
  );

  add(
    bench("ML-DSA-65 keygen", () => cryptoLib.mlDsaKeygen(65), { iters: 20 }),
  );

  // --- HPKE ---
  console.log("\n=== HPKE (RFC 9180) ===");

  const hpkeKP = cryptoLib.hpkeGenerateKeyPair("x25519");
  add(bench("HPKE keygen (X25519)", () => cryptoLib.hpkeGenerateKeyPair("x25519")));

  const ptHex = Buffer.from(pt, "utf8").toString("hex");

  add(
    bench("HPKE seal (X25519+ChaCha20)", () =>
      cryptoLib.hpkeSeal({
        recipientPublicKey: hpkeKP.publicKey,
        plaintext: ptHex,
      }),
    ),
  );

  const sealed = cryptoLib.hpkeSeal({
    recipientPublicKey: hpkeKP.publicKey,
    plaintext: ptHex,
  });
  add(
    bench("HPKE open (X25519+ChaCha20)", () =>
      cryptoLib.hpkeOpen({
        recipientPrivateKey: hpkeKP.privateKey,
        encapsulatedKey: sealed.encapsulatedKey,
        ciphertext: sealed.ciphertext,
      }),
    ),
  );

  // --- Password Hashing ---
  console.log("\n=== PASSWORD HASHING ===");

  add(
    bench(
      "Argon2id (t=1, m=1024)",
      () =>
        cryptoLib.hashPassword({
          password: "benchmark",
          memoryCost: 1024,
          timeCost: 1,
          parallelism: 1,
        }),
      { iters: 10 },
    ),
  );

  return results;
}

// --- Output ---
function formatResults(results: BenchResult[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("  CRYPTO SERVICE SUITE — BENCHMARK RESULTS");
  console.log("=".repeat(80));
  console.log(
    `${"Operation".padEnd(40)} ${"ops/s".padStart(12)} ${"avg (ms)".padStart(12)} ${"MB/s".padStart(12)}`,
  );
  console.log("-".repeat(80));

  for (const r of results) {
    const ops =
      r.opsPerSec >= 1000
        ? `${(r.opsPerSec / 1000).toFixed(1)}K`
        : r.opsPerSec.toFixed(1);
    const avg =
      r.avgMs < 0.01
        ? `${(r.avgMs * 1000).toFixed(1)}us`
        : r.avgMs.toFixed(3);
    const tp = r.throughputMBps
      ? r.throughputMBps >= 1000
        ? `${(r.throughputMBps / 1000).toFixed(1)} GB/s`
        : `${r.throughputMBps.toFixed(1)} MB/s`
      : "-";

    console.log(
      `${r.name.padEnd(40)} ${ops.padStart(12)} ${avg.padStart(12)} ${tp.padStart(12)}`,
    );
  }
  console.log("=".repeat(80));
  console.log(
    `\nNode.js ${process.version} | ${process.platform} ${process.arch}`,
  );
  console.log(`WASM backend: ${accel.detectWasmBackend()}`);
  console.log(`PQC backend: ${accel.pqcBackend()}`);
  console.log(`Default iterations: ${iterations}\n`);
}

// --- Main ---
const results = runBenchmarks();
formatResults(results);
