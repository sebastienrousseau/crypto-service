// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Ed25519 sign and verify with tamper detection via useSignature.
 *
 * Demonstrates signing a message, verifying the signature, and
 * confirming that tampered messages are rejected.
 *
 * Run: `npx ts-node examples/sign.ts`
 */

import { header, task, summary } from "./support";
import { useKeypair, useSignature } from "../src";

async function main() {
  header("crypto-react -- sign");

  const { publicKey, privateKey, generate } = useKeypair("ed25519");
  const { sign, verify, signature, isValid, isProcessing } = useSignature();

  await task("Generate Ed25519 key pair", () => {
    generate();
    if (!publicKey || !privateKey) {
      throw new Error("Key pair generation failed");
    }
  });

  const message = "Sign me!";

  await task("Sign message with Ed25519", () => {
    sign(privateKey!, message);
    if (!signature) throw new Error("Signature not produced");
  });

  await task("Verify signature against original message", () => {
    verify(publicKey!, message, signature!);
    if (isValid !== true) throw new Error("Signature should be valid");
  });

  await task("Reject signature against tampered message", () => {
    verify(publicKey!, "tampered message", signature!);
    if (isValid !== false) {
      throw new Error("Tampered message should fail verification");
    }
  });

  await task("Confirm isProcessing flag is false after completion", () => {
    if (isProcessing) throw new Error("Expected isProcessing to be false");
  });

  summary(5);
}

main();
