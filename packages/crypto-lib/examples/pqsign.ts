// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * ML-DSA-65 (FIPS 204) post-quantum digital signatures.
 *
 * Run: `npx ts-node examples/pqsign.ts`
 */

import { header, task, summary } from "./support";
import { mlDsaKeygen, mlDsaSign, mlDsaVerify } from "../src";

async function main() {
  header("crypto-lib -- pqsign");

  const kp = await task("Generate ML-DSA-65 key pair", () => mlDsaKeygen(65));

  const message = "Post-quantum secure message.";

  const sig = await task("Sign message", () => mlDsaSign(65, kp.secretKey, message));

  await task("Verify valid signature", () => {
    const { valid } = mlDsaVerify(65, kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("Verification failed");
  });

  await task("Reject tampered message", () => {
    const { valid } = mlDsaVerify(65, kp.publicKey, "tampered", sig.signature);
    if (valid) throw new Error("Should have rejected");
  });

  summary(4);
}

main();
