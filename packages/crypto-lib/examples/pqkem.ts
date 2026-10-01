// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * ML-KEM-768 (FIPS 203) post-quantum key encapsulation mechanism.
 *
 * Run: `npx ts-node examples/pqkem.ts`
 */

import { header, task, summary } from "./support";
import { mlKemKeygen, mlKemEncap, mlKemDecap } from "../src";

async function main() {
  header("crypto-lib -- pqkem");

  const kp = await task("Generate ML-KEM-768 key pair", () => mlKemKeygen(768));

  const encap = await task("Encapsulate shared secret", () => mlKemEncap(768, kp.publicKey));

  await task("Decapsulate and verify shared secret", () => {
    const decap = mlKemDecap(768, kp.secretKey, encap.ciphertext);
    if (encap.sharedSecret !== decap.sharedSecret) throw new Error("Shared secrets do not match");
  });

  summary(3);
}

main();
