// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Hybrid post-quantum key exchange: X25519 + ML-KEM-768.
 * Combines classical ECDH with post-quantum KEM so security holds
 * even if one algorithm family is broken.
 *
 * Run: `npx ts-node examples/hybrid.ts`
 */

import { header, task, summary } from "./support";
import { hybridKemKeygen, hybridKemEncapsulate, hybridKemDecapsulate } from "../src";

async function main() {
  header("crypto-lib -- hybrid");

  const kp = await task("Generate hybrid key pair (X25519 + ML-KEM-768)", () => hybridKemKeygen(768));

  const encap = await task("Encapsulate shared secret", () => {
    return hybridKemEncapsulate(768, kp.x25519PublicKey, kp.mlKemPublicKey);
  });

  await task("Decapsulate and verify shared secret match", () => {
    const decap = hybridKemDecapsulate(
      768, kp.x25519PrivateKey, kp.mlKemSecretKey,
      encap.x25519EphemeralPublic, encap.mlKemCiphertext,
    );
    if (encap.sharedSecret !== decap.sharedSecret) throw new Error("Shared secrets do not match");
  });

  summary(3);
}

main();
