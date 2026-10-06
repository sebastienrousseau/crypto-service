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
  const warmup = Math.max(100, Math.floor(n * 0.1));

  // Warmup (ensure V8 TurboFan optimization)
  for (let i = 0; i < warmup; i++) fn();

  // Optional GC between benchmarks
  if (typeof globalThis.gc === "function") globalThis.gc();

  // Collect individual timings for statistics
  const timings: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    fn();
    timings.push(performance.now() - t0);
  }

  const total = timings.reduce((a, b) => a + b, 0);
  const avgMs = total / n;
  const opsPerSec = (n / total) * 1000;
  const throughputMBps = opts?.dataSize
    ? (opts.dataSize * n) / total / 1000
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
    bench("Ed25519 sign", () => cryptoLib.ed25519Sign(edKP.privateKey, msgHex)),
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
    bench("ML-KEM-512 keygen", () => cryptoLib.mlKemKeygen(512), {
      iters: 50,
    }),
  );

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
  const kemEnc = cryptoLib.mlKemEncap(768, kemKP.publicKey);
  add(
    bench(
      "ML-KEM-768 decapsulate",
      () => cryptoLib.mlKemDecap(768, kemKP.secretKey, kemEnc.ciphertext),
      { iters: 50 },
    ),
  );

  add(
    bench("ML-KEM-1024 keygen", () => cryptoLib.mlKemKeygen(1024), {
      iters: 50,
    }),
  );

  add(
    bench("ML-DSA-44 keygen", () => cryptoLib.mlDsaKeygen(44), { iters: 20 }),
  );
  add(
    bench("ML-DSA-65 keygen", () => cryptoLib.mlDsaKeygen(65), { iters: 20 }),
  );
  const dsaKP = cryptoLib.mlDsaKeygen(65);
  add(
    bench(
      "ML-DSA-65 sign",
      () => cryptoLib.mlDsaSign(65, dsaKP.secretKey, msgHex),
      { iters: 20 },
    ),
  );
  const dsaSig = cryptoLib.mlDsaSign(65, dsaKP.secretKey, msgHex);
  add(
    bench(
      "ML-DSA-65 verify",
      () =>
        cryptoLib.mlDsaVerify(65, dsaKP.publicKey, msgHex, dsaSig.signature),
      { iters: 20 },
    ),
  );
  add(
    bench("ML-DSA-87 keygen", () => cryptoLib.mlDsaKeygen(87), { iters: 20 }),
  );

  // Hybrid KEM (X25519 + ML-KEM-768)
  add(
    bench(
      "Hybrid KEM (X25519+ML-KEM-768) keygen",
      () => cryptoLib.hybridKemKeygen(768),
      { iters: 30 },
    ),
  );
  const hybKP = cryptoLib.hybridKemKeygen(768);
  add(
    bench(
      "Hybrid KEM (X25519+ML-KEM-768) encap",
      () =>
        cryptoLib.hybridKemEncapsulate(
          768,
          hybKP.x25519PublicKey,
          hybKP.mlKemPublicKey,
        ),
      { iters: 30 },
    ),
  );

  // --- HPKE ---
  console.log("\n=== HPKE (RFC 9180) ===");

  const hpkeKP = cryptoLib.hpkeGenerateKeyPair("x25519");
  add(
    bench("HPKE keygen (X25519)", () =>
      cryptoLib.hpkeGenerateKeyPair("x25519"),
    ),
  );

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

  // --- FN-DSA (FALCON / FIPS 206) ---
  try {
    console.log("\n=== FN-DSA (FALCON / FIPS 206) ===");
    const fnDsa = require("../packages/crypto-lib/dist/modern/fn-dsa");
    add(
      bench("FN-DSA-512 keygen", () => fnDsa.fnDsaKeygen(512), { iters: 20 }),
    );
    const fnKP = fnDsa.fnDsaKeygen(512);
    add(
      bench(
        "FN-DSA-512 sign",
        () => fnDsa.fnDsaSign(512, fnKP.secretKey, msgHex),
        { iters: 20 },
      ),
    );
    const fnSig = fnDsa.fnDsaSign(512, fnKP.secretKey, msgHex);
    add(
      bench(
        "FN-DSA-512 verify",
        () => fnDsa.fnDsaVerify(512, fnKP.publicKey, msgHex, fnSig.signature),
        { iters: 50 },
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: FN-DSA — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- Protocols ---
  try {
    console.log("\n=== PROTOCOLS ===");
    const protocols = require("../packages/crypto-lib/dist/protocols");

    // PAKE (RFC 9807 OPAQUE-3DH, P256-SHA256). The default scrypt KSF
    // dominates client-side cost; the server steps exclude it.
    const pake = protocols.pake;
    const pakeSetup = pake.createServerSetup();
    const pakeReg = pake.createRegistrationRequest("bench-password");
    const pakeRecord = pake.finalizeRegistrationRequest(
      "bench-password",
      pakeReg.blind,
      pake.createRegistrationResponse(
        pakeReg.request,
        pakeSetup.serverPublicKey,
        "bench-user",
        pakeSetup.oprfSeed,
      ),
    ).record;
    const pakeKe1 = pake.generateKE1("bench-password");
    add(
      bench("PAKE generateKE1 (client)", () => pake.generateKE1("password"), {
        iters: 20,
      }),
    );
    add(
      bench(
        "PAKE generateKE2 (server)",
        () =>
          pake.generateKE2({
            ...pakeSetup,
            record: pakeRecord,
            credentialIdentifier: "bench-user",
            ke1: pakeKe1.ke1,
          }),
        { iters: 20 },
      ),
    );

    // Threshold (Shamir). The secret must be below the Ed25519 group
    // order (about 2^252), so the top nibble is 0.
    const shamirSecret = "0e" + "ad".repeat(31);
    add(
      bench(
        "Shamir split (3-of-5)",
        () => protocols.threshold.splitSecret(shamirSecret, 5, 3),
        { iters: 100 },
      ),
    );
    const shares = protocols.threshold.splitSecret(shamirSecret, 5, 3);
    add(
      bench(
        "Shamir reconstruct (3-of-5)",
        () => protocols.threshold.combineShares(shares.shares.slice(0, 3)),
        { iters: 100 },
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: Protocols — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- Tokens (PASETO + Key Rotation) ---
  try {
    console.log("\n=== TOKENS (PASETO v4) ===");
    const tokens = require("../packages/crypto-lib/dist/tokens");
    const pasetoKey = "aa".repeat(32);
    const payload = {
      sub: "user-1",
      iss: "bench",
      exp: "2099-01-01T00:00:00Z",
    };
    add(
      bench("PASETO v4.local encrypt", () =>
        tokens.v4local.encrypt({ key: pasetoKey, payload }),
      ),
    );
    const pToken = tokens.v4local.encrypt({ key: pasetoKey, payload });
    add(
      bench("PASETO v4.local decrypt", () =>
        tokens.v4local.decrypt({ key: pasetoKey, token: pToken.token }),
      ),
    );

    // Key rotation
    const ring = tokens.createKeyRing({
      version: "v1",
      key: hexKey,
      activatedAt: new Date(),
    });
    add(
      bench("Key rotation encrypt", () =>
        tokens.encryptWithVersion(ring, "benchmark data"),
      ),
    );
    const rotEnc = tokens.encryptWithVersion(ring, "benchmark data");
    add(
      bench("Key rotation decrypt", () =>
        tokens.decryptWithVersion(ring, rotEnc.ciphertext, rotEnc.version),
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: Tokens — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- Streaming ---
  try {
    console.log("\n=== STREAMING ===");
    const streaming = require("../packages/crypto-lib/dist/streaming");
    const streamData = nodeCrypto.randomBytes(64 * 1024); // 64 KB
    add(
      bench(
        "Stream AEAD encrypt (64 KB)",
        () => streaming.streamEncrypt({ key: hexKey, plaintext: streamData }),
        { dataSize: 65536, iters: 50 },
      ),
    );
    const streamEnc = streaming.streamEncrypt({
      key: hexKey,
      plaintext: streamData,
    });
    add(
      bench(
        "Stream AEAD decrypt (64 KB)",
        () =>
          streaming.streamDecrypt({
            key: hexKey,
            ciphertext: streamEnc.ciphertext,
          }),
        { dataSize: 65536, iters: 50 },
      ),
    );

    // Streaming hash
    add(
      bench(
        "Stream hash BLAKE3 (64 KB)",
        () => {
          const h = streaming.createHasher("blake3");
          h.update(streamData);
          h.digest();
        },
        { dataSize: 65536, iters: 100 },
      ),
    );

    // 1 MB Stream AEAD throughput
    const streamData1MB = nodeCrypto.randomBytes(1024 * 1024);
    add(
      bench(
        "Stream AEAD encrypt (1 MB)",
        () =>
          streaming.streamEncrypt({ key: hexKey, plaintext: streamData1MB }),
        { dataSize: 1048576, iters: 20 },
      ),
    );
    const streamEnc1MB = streaming.streamEncrypt({
      key: hexKey,
      plaintext: streamData1MB,
    });
    add(
      bench(
        "Stream AEAD decrypt (1 MB)",
        () =>
          streaming.streamDecrypt({
            key: hexKey,
            ciphertext: streamEnc1MB.ciphertext,
          }),
        { dataSize: 1048576, iters: 20 },
      ),
    );

    // 1 MB BLAKE3 streaming hash throughput
    add(
      bench(
        "Stream hash BLAKE3 (1 MB)",
        () => {
          const h = streaming.createHasher("blake3");
          h.update(streamData1MB);
          h.digest();
        },
        { dataSize: 1048576, iters: 20 },
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: Streaming — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- Middleware ---
  try {
    console.log("\n=== MIDDLEWARE ===");
    const middleware = require("../packages/crypto-middleware/dist/common");
    add(
      bench("Middleware encryptPayload", () =>
        middleware.encryptPayload(hexKey, {
          userId: 42,
          role: "admin",
          ts: Date.now(),
        }),
      ),
    );
    const mwSealed = middleware.encryptPayload(hexKey, {
      userId: 42,
      role: "admin",
    });
    add(
      bench("Middleware decryptPayload", () =>
        middleware.decryptPayload(hexKey, mwSealed),
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: Middleware — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- SDK (serialization) ---
  try {
    console.log("\n=== SDK (serialization) ===");
    const sdk = require("../packages/crypto-sdk/dist");
    add(
      bench(
        "SDK client instantiation",
        () => new sdk.CryptoClient({ baseUrl: "http://localhost:3000" }),
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: SDK — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- KMS (local provider) ---
  try {
    console.log("\n=== KMS (local provider) ===");
    const kms = require("../packages/crypto-kms/dist");
    const localKms = new kms.LocalKmsProvider();
    add(
      bench(
        "KMS local createKey",
        () => localKms.createKey("aes-256", "encrypt"),
        { iters: 200 },
      ),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: KMS — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- Edge (detection) ---
  try {
    console.log("\n=== EDGE (runtime detection) ===");
    const edge = require("../packages/crypto-edge/dist");
    add(bench("Edge detectRuntime", () => edge.detectRuntime()));
    add(bench("Edge getCapabilities", () => edge.getCapabilities()));
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: Edge — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // --- Acceleration Detection ---
  try {
    console.log("\n=== ACCELERATION DETECTION ===");
    add(
      bench("WebCrypto modern detect", () => {
        accel._resetModernWebCryptoDetection();
        accel.detectModernWebCrypto();
      }),
    );
    add(
      bench("Native PQC detect", () => {
        accel.resetNativePqcCache();
        accel.hasNativePqc();
      }),
    );
  } catch (e: unknown) {
    console.log(
      `  SKIPPED: Acceleration — ${e instanceof Error ? e.message : String(e)}`,
    );
  }

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
      r.avgMs < 0.01 ? `${(r.avgMs * 1000).toFixed(1)}us` : r.avgMs.toFixed(3);
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
  console.log(
    `WebAssembly runtime support: ${accel.detectWasmBackend()} (no WASM module ships; operations run in JavaScript)`,
  );
  console.log(`PQC backend: ${accel.pqcBackend()}`);
  console.log(`Default iterations: ${iterations}\n`);
}

// --- Main ---
const results = runBenchmarks();
formatResults(results);
