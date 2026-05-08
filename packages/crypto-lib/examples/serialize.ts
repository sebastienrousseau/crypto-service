// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key serialization: PEM encode/decode, JWK conversion, and format helpers.
 *
 * Run: `npx ts-node examples/serialize.ts`
 */

import { header, task, summary } from "./support";
import {
  generateEd25519KeyPair, encodePem, decodePem,
  ed25519ToJwk, jwkToHex, jwkThumbprint,
  hexToBytes, bytesToHex, bytesToBase64, bytesToBase64url,
} from "../src";

async function main() {
  header("crypto-lib -- serialize");

  const kp = await task("Generate Ed25519 key pair", () => generateEd25519KeyPair());

  await task("PEM encode and decode round-trip", () => {
    const pubBytes = hexToBytes(kp.publicKey);
    const pem = encodePem("ED25519 PUBLIC KEY", pubBytes);
    const decoded = decodePem(pem);
    if (bytesToHex(decoded.data) !== kp.publicKey) throw new Error("PEM round-trip failed");
  });

  await task("Convert to JWK and back", () => {
    const jwk = ed25519ToJwk(kp.publicKey, kp.privateKey);
    const imported = jwkToHex(jwk);
    if (imported.publicKey !== kp.publicKey) throw new Error("JWK round-trip failed");
  });

  await task("Compute JWK Thumbprint (RFC 7638)", () => {
    const jwk = ed25519ToJwk(kp.publicKey, kp.privateKey);
    jwkThumbprint(jwk);
  });

  await task("Format helpers: hex, base64, base64url", () => {
    const raw = hexToBytes("deadbeef");
    bytesToBase64(raw);
    bytesToBase64url(raw);
  });

  summary(5);
}

main();
