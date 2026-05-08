// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Ed25519 digital signatures: generate key pair, sign, and verify.
 *
 * Run: `npx ts-node examples/sign.ts`
 */

import { header, task, summary } from "./support";
import { generateEd25519KeyPair, ed25519Sign, ed25519Verify } from "../src";

async function main() {
  header("crypto-lib -- sign");

  const kp = await task("Generate Ed25519 key pair", () => generateEd25519KeyPair());

  const message = "Authenticate this payload.";

  const sig = await task("Sign message", () => {
    return ed25519Sign(kp.privateKey, message);
  });

  await task("Verify valid signature", () => {
    const { valid } = ed25519Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("Signature verification failed");
  });

  await task("Reject tampered message", () => {
    const { valid } = ed25519Verify(kp.publicKey, "tampered", sig.signature);
    if (valid) throw new Error("Should have rejected tampered message");
  });

  summary(4);
}

main();
