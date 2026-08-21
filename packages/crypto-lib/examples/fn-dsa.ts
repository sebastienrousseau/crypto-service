// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * FN-DSA (FALCON / FIPS 206): lattice-based digital signatures with the
 * smallest signature sizes among NIST PQC standards.
 *
 * Demonstrates:
 * - Key generation for FN-DSA-512 (NIST Level 1)
 * - Key generation for FN-DSA-1024 (NIST Level 5)
 * - Signing and verification
 * - Verification failure with wrong key
 *
 * Run: `npx ts-node examples/fn-dsa.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { fnDsaKeygen, fnDsaSign, fnDsaVerify } from "../src";

async function main() {
  header("crypto-lib -- fn-dsa");

  // 1. FN-DSA-512 key generation
  const kp512 = await task("Generate FN-DSA-512 key pair (NIST Level 1)", () => {
    const kp = fnDsaKeygen(512);
    if (kp.algorithm !== "fn-dsa-512") throw new Error("Unexpected algorithm");
    if (!kp.publicKey || !kp.secretKey) throw new Error("Missing keys");
    return kp;
  });

  // 2. FN-DSA-1024 key generation
  const kp1024 = await task("Generate FN-DSA-1024 key pair (NIST Level 5)", () => {
    const kp = fnDsaKeygen(1024);
    if (kp.algorithm !== "fn-dsa-1024") throw new Error("Unexpected algorithm");
    if (!kp.publicKey || !kp.secretKey) throw new Error("Missing keys");
    return kp;
  });

  // 3. Sign with FN-DSA-512
  const message = Buffer.from("Hello, post-quantum world!").toString("hex");

  const sig512 = await task("Sign message with FN-DSA-512", () => {
    const result = fnDsaSign(512, kp512.secretKey, message);
    if (result.algorithm !== "fn-dsa-512") throw new Error("Unexpected algorithm in signature");
    if (!result.signature) throw new Error("Missing signature");
    return result;
  });

  // 4. Verify FN-DSA-512 signature
  await task("Verify FN-DSA-512 signature (valid)", () => {
    const result = fnDsaVerify(512, kp512.publicKey, message, sig512.signature);
    if (!result.valid) throw new Error("Valid signature rejected");
    if (result.algorithm !== "fn-dsa-512") throw new Error("Unexpected algorithm");
  });

  // 5. Sign with FN-DSA-1024
  const sig1024 = await task("Sign message with FN-DSA-1024", () => {
    const result = fnDsaSign(1024, kp1024.secretKey, message);
    if (result.algorithm !== "fn-dsa-1024") throw new Error("Unexpected algorithm in signature");
    return result;
  });

  // 6. Verify FN-DSA-1024 signature
  await task("Verify FN-DSA-1024 signature (valid)", () => {
    const result = fnDsaVerify(1024, kp1024.publicKey, message, sig1024.signature);
    if (!result.valid) throw new Error("Valid signature rejected");
  });

  // 7. Verification failure: wrong public key
  await task("Verify with wrong key (should fail)", () => {
    const result = fnDsaVerify(512, kp1024.publicKey, message, sig512.signature);
    if (result.valid) throw new Error("Verification should have failed with wrong key");
  });

  // 8. Verification failure: tampered message
  await task("Verify with tampered message (should fail)", () => {
    const tampered = Buffer.from("Tampered message!").toString("hex");
    const result = fnDsaVerify(512, kp512.publicKey, tampered, sig512.signature);
    if (result.valid) throw new Error("Verification should have failed with tampered message");
  });

  summary(8);
}

main();
