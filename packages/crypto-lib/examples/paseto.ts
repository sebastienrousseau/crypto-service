// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * PASETO v4: Platform-Agnostic Security Tokens — a type-safe alternative
 * to JWT that eliminates algorithm confusion attacks by design.
 *
 * Demonstrates:
 * - v4.local: symmetric encryption (XChaCha20-Poly1305)
 * - v4.local with footer and implicit assertions
 * - v4.public: Ed25519 digital signatures
 * - v4.public with footer and implicit assertions
 * - Error case: wrong key / tampered token
 *
 * Run: `npx ts-node examples/paseto.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { tokens } from "../src";
import { randomBytes } from "@noble/ciphers/utils.js";
import { ed25519 } from "@noble/curves/ed25519.js";

const { v4local, v4public } = tokens;

async function main() {
  header("crypto-lib -- paseto");

  // --- v4.local (symmetric encryption) ---

  const symmetricKey = Buffer.from(randomBytes(32)).toString("hex");

  // 1. Basic v4.local encrypt/decrypt
  await task("v4.local: encrypt and decrypt payload", () => {
    const payload = { sub: "user-123", role: "admin", iat: "2026-05-16T00:00:00Z" };
    const { token } = v4local.encrypt({ key: symmetricKey, payload });
    if (!token.startsWith("v4.local.")) throw new Error("Invalid token prefix");
    const { payload: decrypted } = v4local.decrypt({ key: symmetricKey, token });
    if (decrypted.sub !== "user-123") throw new Error("Payload mismatch");
    if (decrypted.role !== "admin") throw new Error("Payload mismatch");
  });

  // 2. v4.local with footer
  await task("v4.local: encrypt with footer", () => {
    const payload = { sub: "user-456", data: "sensitive" };
    const footer = JSON.stringify({ kid: "key-rotation-v2" });
    const { token } = v4local.encrypt({ key: symmetricKey, payload, footer });
    if (!token.includes(".")) throw new Error("Token should contain footer");
    const result = v4local.decrypt({ key: symmetricKey, token, footer });
    if (result.payload.sub !== "user-456") throw new Error("Payload mismatch");
    if (result.footer !== footer) throw new Error("Footer mismatch");
  });

  // 3. v4.local with implicit assertions
  await task("v4.local: encrypt with implicit assertions", () => {
    const payload = { sub: "user-789" };
    const implicit = "tenant:acme-corp";
    const { token } = v4local.encrypt({ key: symmetricKey, payload, implicit });
    const { payload: decrypted } = v4local.decrypt({ key: symmetricKey, token, implicit });
    if (decrypted.sub !== "user-789") throw new Error("Payload mismatch");
  });

  // 4. Error: wrong key for v4.local
  await taskResult("v4.local: error with wrong key", () => {
    const payload = { sub: "test" };
    const { token } = v4local.encrypt({ key: symmetricKey, payload });
    const wrongKey = Buffer.from(randomBytes(32)).toString("hex");
    try {
      v4local.decrypt({ key: wrongKey, token });
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: decryption failure
    }
  });

  // --- v4.public (Ed25519 signatures) ---

  // Generate Ed25519 key pair for v4.public
  const seed = randomBytes(32);
  const secretKey = Buffer.from(seed).toString("hex");
  const publicKey = Buffer.from(ed25519.getPublicKey(seed)).toString("hex");

  // 5. Basic v4.public sign/verify
  await task("v4.public: sign and verify payload", () => {
    const payload = { sub: "user-abc", iss: "auth-service", exp: "2026-12-31" };
    const { token } = v4public.sign({ secretKey, payload });
    if (!token.startsWith("v4.public.")) throw new Error("Invalid token prefix");
    const { payload: verified } = v4public.verify({ publicKey, token });
    if (verified.sub !== "user-abc") throw new Error("Payload mismatch");
    if (verified.iss !== "auth-service") throw new Error("Payload mismatch");
  });

  // 6. v4.public with footer
  await task("v4.public: sign with footer", () => {
    const payload = { sub: "user-def", action: "read" };
    const footer = JSON.stringify({ kid: "ed25519-key-1" });
    const { token } = v4public.sign({ secretKey, payload, footer });
    const result = v4public.verify({ publicKey, token, footer });
    if (result.payload.sub !== "user-def") throw new Error("Payload mismatch");
    if (result.footer !== footer) throw new Error("Footer mismatch");
  });

  // 7. v4.public with implicit assertions
  await task("v4.public: sign with implicit assertions", () => {
    const payload = { sub: "user-ghi" };
    const implicit = "service-id:backend-api";
    const { token } = v4public.sign({ secretKey, payload, implicit });
    const { payload: verified } = v4public.verify({ publicKey, token, implicit });
    if (verified.sub !== "user-ghi") throw new Error("Payload mismatch");
  });

  // 8. Error: wrong public key for v4.public
  await taskResult("v4.public: error with wrong public key", () => {
    const payload = { sub: "test" };
    const { token } = v4public.sign({ secretKey, payload });
    const wrongPub = Buffer.from(ed25519.getPublicKey(randomBytes(32))).toString("hex");
    try {
      v4public.verify({ publicKey: wrongPub, token });
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: invalid signature
    }
  });

  summary(8);
}

main();
