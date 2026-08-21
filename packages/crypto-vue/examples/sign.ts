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
  header("crypto-vue -- sign");

  const { publicKey, privateKey, generate } = useKeypair();
  const { sign, verify, signature, isValid, isProcessing, error } =
    useSignature();

  await task("Generate Ed25519 key pair", async () => {
    await generate("ed25519");
    if (!publicKey.value || !privateKey.value) {
      throw new Error("Key pair generation failed");
    }
  });

  const message = "Sign me!";

  await task("Sign message with Ed25519", async () => {
    await sign("ed25519", privateKey.value!, message);
    if (!signature.value) throw new Error("Signature not produced");
  });

  await task("Verify signature against original message", async () => {
    const valid = await verify("ed25519", publicKey.value!, message, signature.value!);
    if (valid !== true) throw new Error("Signature should be valid");
  });

  await task("Reject signature against tampered message", async () => {
    await verify("ed25519", publicKey.value!, "tampered message", signature.value!);
    if (isValid.value !== false) {
      throw new Error("Tampered message should fail verification");
    }
  });

  await task("Confirm isProcessing is false after completion", () => {
    if (isProcessing.value) throw new Error("Expected isProcessing to be false");
  });

  await task("Confirm no errors occurred", () => {
    if (error.value) throw new Error(`Unexpected error: ${error.value.message}`);
  });

  summary(6);
}

main();
