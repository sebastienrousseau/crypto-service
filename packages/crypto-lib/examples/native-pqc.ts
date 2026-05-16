// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Native PQC Bridge: auto-detects Node.js 24.7+ ML-KEM support, falls
 * back to @noble/post-quantum on older runtimes.
 *
 * Demonstrates:
 * - hasNativePqc: feature detection for native PQC support
 * - pqcBackend: check which backend is active
 * - bridgedMlKemKeygen: generate ML-KEM key pairs (all levels)
 * - bridgedMlKemEncapsulate: encapsulate a shared secret
 * - bridgedMlKemDecapsulate: decapsulate and recover the shared secret
 * - Full round-trip for ML-KEM-512, ML-KEM-768, ML-KEM-1024
 *
 * Run: `npx ts-node examples/native-pqc.ts`
 */

import { header, task, summary } from "./support";
import {
  hasNativePqc,
  pqcBackend,
  bridgedMlKemKeygen,
  bridgedMlKemEncapsulate,
  bridgedMlKemDecapsulate,
} from "../src";

async function main() {
  header("crypto-lib -- native-pqc");

  // 1. Feature detection
  await task("Detect native PQC support", () => {
    const native = hasNativePqc();
    const backend = pqcBackend();
    if (native && backend !== "native") throw new Error("Backend mismatch");
    if (!native && backend !== "noble") throw new Error("Backend mismatch");
    console.log(`    Native PQC: ${native}, Backend: ${backend}`);
  });

  // 2. ML-KEM-512 round-trip
  await task("ML-KEM-512: keygen → encapsulate → decapsulate", () => {
    const { publicKey, secretKey } = bridgedMlKemKeygen(512);
    if (!publicKey || publicKey.length === 0) throw new Error("Missing public key");
    if (!secretKey || secretKey.length === 0) throw new Error("Missing secret key");

    const { cipherText, sharedSecret: ssEncap } = bridgedMlKemEncapsulate(512, publicKey);
    if (!cipherText || cipherText.length === 0) throw new Error("Missing ciphertext");
    if (ssEncap.length !== 32) throw new Error("Shared secret must be 32 bytes");

    const ssDecap = bridgedMlKemDecapsulate(512, cipherText, secretKey);
    if (ssDecap.length !== 32) throw new Error("Decapsulated secret must be 32 bytes");

    // Verify shared secrets match
    for (let i = 0; i < 32; i++) {
      if (ssEncap[i] !== ssDecap[i]) throw new Error("Shared secrets do not match");
    }
  });

  // 3. ML-KEM-768 round-trip
  await task("ML-KEM-768: keygen → encapsulate → decapsulate", () => {
    const { publicKey, secretKey } = bridgedMlKemKeygen(768);
    if (!publicKey || publicKey.length === 0) throw new Error("Missing public key");

    const { cipherText, sharedSecret: ssEncap } = bridgedMlKemEncapsulate(768, publicKey);
    if (ssEncap.length !== 32) throw new Error("Shared secret must be 32 bytes");

    const ssDecap = bridgedMlKemDecapsulate(768, cipherText, secretKey);
    for (let i = 0; i < 32; i++) {
      if (ssEncap[i] !== ssDecap[i]) throw new Error("Shared secrets do not match");
    }
  });

  // 4. ML-KEM-1024 round-trip
  await task("ML-KEM-1024: keygen → encapsulate → decapsulate", () => {
    const { publicKey, secretKey } = bridgedMlKemKeygen(1024);
    if (!publicKey || publicKey.length === 0) throw new Error("Missing public key");

    const { cipherText, sharedSecret: ssEncap } = bridgedMlKemEncapsulate(1024, publicKey);
    if (ssEncap.length !== 32) throw new Error("Shared secret must be 32 bytes");

    const ssDecap = bridgedMlKemDecapsulate(1024, cipherText, secretKey);
    for (let i = 0; i < 32; i++) {
      if (ssEncap[i] !== ssDecap[i]) throw new Error("Shared secrets do not match");
    }
  });

  // 5. Verify key sizes for different levels
  await task("Verify key sizes across all levels", () => {
    const kp512 = bridgedMlKemKeygen(512);
    const kp768 = bridgedMlKemKeygen(768);
    const kp1024 = bridgedMlKemKeygen(1024);

    // ML-KEM public key sizes: 800, 1184, 1568 bytes
    if (kp512.publicKey.length !== 800) throw new Error(`ML-KEM-512 pk: ${kp512.publicKey.length}`);
    if (kp768.publicKey.length !== 1184) throw new Error(`ML-KEM-768 pk: ${kp768.publicKey.length}`);
    if (kp1024.publicKey.length !== 1568) throw new Error(`ML-KEM-1024 pk: ${kp1024.publicKey.length}`);

    // ML-KEM secret key sizes: 1632, 2400, 3168 bytes
    if (kp512.secretKey.length !== 1632) throw new Error(`ML-KEM-512 sk: ${kp512.secretKey.length}`);
    if (kp768.secretKey.length !== 2400) throw new Error(`ML-KEM-768 sk: ${kp768.secretKey.length}`);
    if (kp1024.secretKey.length !== 3168) throw new Error(`ML-KEM-1024 sk: ${kp1024.secretKey.length}`);
  });

  // 6. Error case: wrong secret key for decapsulation
  await task("Error: decapsulate with wrong key (implicit fail)", () => {
    const kp1 = bridgedMlKemKeygen(768);
    const kp2 = bridgedMlKemKeygen(768);
    const { cipherText, sharedSecret: ssEncap } = bridgedMlKemEncapsulate(768, kp1.publicKey);

    // Decapsulate with wrong key — ML-KEM returns a pseudorandom secret (FO transform)
    const ssWrong = bridgedMlKemDecapsulate(768, cipherText, kp2.secretKey);
    let match = true;
    for (let i = 0; i < 32; i++) {
      if (ssEncap[i] !== ssWrong[i]) {
        match = false;
        break;
      }
    }
    if (match) throw new Error("Wrong key should produce different shared secret");
  });

  summary(6);
}

main();
