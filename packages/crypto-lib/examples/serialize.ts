// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key serialization: PEM encode/decode, JWK conversion, and format helpers.
 *
 * Run: `npx ts-node examples/serialize.ts`
 */

import {
  generateEd25519KeyPair,
  encodePem,
  decodePem,
  ed25519ToJwk,
  jwkToHex,
  jwkThumbprint,
  hexToBytes,
  bytesToHex,
  bytesToBase64,
  bytesToBase64url,
} from "../src";

function main() {
  console.log("\n=== crypto-lib — serialize ===\n");

  // Generate an Ed25519 key pair
  const kp = generateEd25519KeyPair();

  // --- PEM encoding ---
  const pubBytes = hexToBytes(kp.publicKey);
  const pem = encodePem("ED25519 PUBLIC KEY", pubBytes);
  console.log("PEM:");
  console.log(pem);

  // Decode PEM back to bytes
  const decoded = decodePem(pem);
  console.log(`Decoded label: ${decoded.label}`);
  console.log(`Decoded hex:   ${bytesToHex(decoded.data)}`);
  console.log(`Round-trip:    ${bytesToHex(decoded.data) === kp.publicKey}`);

  // --- JWK conversion ---
  const jwk = ed25519ToJwk(kp.publicKey, kp.privateKey);
  console.log("\nJWK:");
  console.log(JSON.stringify(jwk, null, 2));

  // Compute JWK Thumbprint (RFC 7638)
  const thumbprint = jwkThumbprint(jwk);
  console.log(`\nJWK Thumbprint: ${thumbprint}`);

  // Import JWK back to hex
  const imported = jwkToHex(jwk);
  console.log(`Imported public key: ${imported.publicKey.slice(0, 32)}...`);
  console.log(`Match: ${imported.publicKey === kp.publicKey}`);

  // --- Format helpers ---
  const raw = hexToBytes("deadbeef");
  console.log(`\nhex -> base64:    ${bytesToBase64(raw)}`);
  console.log(`hex -> base64url: ${bytesToBase64url(raw)}`);

  console.log("\nDone.");
}

main();
