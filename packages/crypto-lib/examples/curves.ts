// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Additional elliptic curves: P-256, P-384, Ed448, and Schnorr (BIP-340).
 *
 * Run: `npx ts-node examples/curves.ts`
 */

import {
  generateP256KeyPair,
  p256Sign,
  p256Verify,
  generateP384KeyPair,
  p384Sign,
  p384Verify,
  generateEd448KeyPair,
  ed448Sign,
  ed448Verify,
  generateSchnorrKeyPair,
  schnorrSign,
  schnorrVerify,
} from "../src";

function main() {
  console.log("\n=== crypto-lib — curves ===\n");

  const message = "Multi-curve signing demo.";

  // ECDSA P-256 (FIPS 186-5)
  const p256kp = generateP256KeyPair();
  const p256sig = p256Sign(p256kp.privateKey, message);
  const p256ok = p256Verify(p256kp.publicKey, message, p256sig.signature);
  console.log(`P-256 (ECDSA):  ${p256ok.valid ? "PASS" : "FAIL"}`);

  // ECDSA P-384 (FIPS 186-5)
  const p384kp = generateP384KeyPair();
  const p384sig = p384Sign(p384kp.privateKey, message);
  const p384ok = p384Verify(p384kp.publicKey, message, p384sig.signature);
  console.log(`P-384 (ECDSA):  ${p384ok.valid ? "PASS" : "FAIL"}`);

  // Ed448 (RFC 8032)
  const ed448kp = generateEd448KeyPair();
  const ed448sig = ed448Sign(ed448kp.privateKey, message);
  const ed448ok = ed448Verify(ed448kp.publicKey, message, ed448sig.signature);
  console.log(`Ed448 (EdDSA):  ${ed448ok.valid ? "PASS" : "FAIL"}`);

  // Schnorr (BIP-340, secp256k1)
  const schnorrkp = generateSchnorrKeyPair();
  const schnorrsig = schnorrSign(schnorrkp.privateKey, message);
  const schnorrok = schnorrVerify(schnorrkp.publicKey, message, schnorrsig.signature);
  console.log(`Schnorr (BIP-340): ${schnorrok.valid ? "PASS" : "FAIL"}`);

  // Print key sizes
  console.log(`\nKey sizes (public):`);
  console.log(`  P-256:   ${p256kp.publicKey.length / 2} bytes`);
  console.log(`  P-384:   ${p384kp.publicKey.length / 2} bytes`);
  console.log(`  Ed448:   ${ed448kp.publicKey.length / 2} bytes`);
  console.log(`  Schnorr: ${schnorrkp.publicKey.length / 2} bytes`);

  console.log("\nDone.");
}

main();
