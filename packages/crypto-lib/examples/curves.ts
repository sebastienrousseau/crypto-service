// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Additional elliptic curves: P-256, P-384, Ed448, and Schnorr (BIP-340).
 *
 * Run: `npx ts-node examples/curves.ts`
 */

import { header, task, summary } from "./support";
import {
  p256Keygen, p256Sign, p256Verify,
  p384Keygen, p384Sign, p384Verify,
  ed448Keygen, ed448Sign, ed448Verify,
  schnorrKeygen, schnorrSign, schnorrVerify,
} from "../src";

async function main() {
  header("crypto-lib -- curves");

  const message = "Multi-curve signing demo.";

  await task("P-256 (ECDSA, FIPS 186-5) sign and verify", () => {
    const kp = p256Keygen();
    const sig = p256Sign(kp.privateKey, message);
    const { valid } = p256Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("P-256 verification failed");
  });

  await task("P-384 (ECDSA, FIPS 186-5) sign and verify", () => {
    const kp = p384Keygen();
    const sig = p384Sign(kp.privateKey, message);
    const { valid } = p384Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("P-384 verification failed");
  });

  await task("Ed448 (EdDSA, RFC 8032) sign and verify", () => {
    const kp = ed448Keygen();
    const sig = ed448Sign(kp.privateKey, message);
    const { valid } = ed448Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("Ed448 verification failed");
  });

  await task("Schnorr (BIP-340, secp256k1) sign and verify", () => {
    const kp = schnorrKeygen();
    const sig = schnorrSign(kp.privateKey, message);
    const { valid } = schnorrVerify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("Schnorr verification failed");
  });

  summary(4);
}

main();
