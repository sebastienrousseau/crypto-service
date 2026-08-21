// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Additional elliptic curves: P-256, P-384, Ed448, and Schnorr (BIP-340).
 *
 * Run: `npx ts-node examples/curves.ts`
 */

import { header, task, summary } from "./support";
import {
  generateP256KeyPair, p256Sign, p256Verify,
  generateP384KeyPair, p384Sign, p384Verify,
  generateEd448KeyPair, ed448Sign, ed448Verify,
  generateSchnorrKeyPair, schnorrSign, schnorrVerify,
} from "../src";

async function main() {
  header("crypto-lib -- curves");

  const message = "Multi-curve signing demo.";

  await task("P-256 (ECDSA, FIPS 186-5) sign and verify", () => {
    const kp = generateP256KeyPair();
    const sig = p256Sign(kp.privateKey, message);
    const { valid } = p256Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("P-256 verification failed");
  });

  await task("P-384 (ECDSA, FIPS 186-5) sign and verify", () => {
    const kp = generateP384KeyPair();
    const sig = p384Sign(kp.privateKey, message);
    const { valid } = p384Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("P-384 verification failed");
  });

  await task("Ed448 (EdDSA, RFC 8032) sign and verify", () => {
    const kp = generateEd448KeyPair();
    const sig = ed448Sign(kp.privateKey, message);
    const { valid } = ed448Verify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("Ed448 verification failed");
  });

  await task("Schnorr (BIP-340, secp256k1) sign and verify", () => {
    const kp = generateSchnorrKeyPair();
    const sig = schnorrSign(kp.privateKey, message);
    const { valid } = schnorrVerify(kp.publicKey, message, sig.signature);
    if (!valid) throw new Error("Schnorr verification failed");
  });

  summary(4);
}

main();
