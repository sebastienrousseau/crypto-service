// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Key Rotation: versioned key management for gradual rollover of
 * symmetric encryption keys with grace periods.
 *
 * Demonstrates:
 * - createKeyRing: initialize a key ring with a single key
 * - rotateKey: promote a new key, moving the old one to "previous"
 * - encryptWithVersion: encrypt using the current key
 * - decryptWithVersion: decrypt using any key version in the ring
 * - findKeyByVersion: look up a specific key by version
 * - pruneExpiredKeys: remove expired keys from the ring
 *
 * Run: `npx ts-node examples/key-rotation.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { tokens } from "../src";
import { randomBytes } from "@noble/ciphers/utils.js";

const {
  createKeyRing,
  rotateKey,
  encryptWithVersion,
  decryptWithVersion,
  findKeyByVersion,
  pruneExpiredKeys,
} = tokens;

async function main() {
  header("crypto-lib -- key-rotation");

  const key1 = Buffer.from(randomBytes(32)).toString("hex");
  const key2 = Buffer.from(randomBytes(32)).toString("hex");
  const key3 = Buffer.from(randomBytes(32)).toString("hex");

  // 1. Create a key ring with the initial key
  let ring = await task("Create key ring with v1", () => {
    const r = createKeyRing({
      version: "v1",
      key: key1,
      activatedAt: new Date("2026-01-01"),
    });
    if (r.current.version !== "v1") throw new Error("Expected current=v1");
    if (r.previous.length !== 0) throw new Error("Expected no previous keys");
    return r;
  });

  // 2. Encrypt with the current key (v1)
  const enc1 = await task("Encrypt with current key (v1)", () => {
    const result = encryptWithVersion(ring, "Secret message for v1");
    if (result.version !== "v1") throw new Error("Expected version=v1");
    return result;
  });

  // 3. Rotate to v2
  ring = await task("Rotate key to v2", () => {
    const r = rotateKey(ring, {
      version: "v2",
      key: key2,
      activatedAt: new Date("2026-03-01"),
    });
    if (r.current.version !== "v2") throw new Error("Expected current=v2");
    if (r.previous.length !== 1) throw new Error("Expected 1 previous key");
    if (r.previous[0].version !== "v1") throw new Error("Expected v1 in previous");
    return r;
  });

  // 4. Encrypt with new current key (v2)
  const enc2 = await task("Encrypt with current key (v2)", () => {
    const result = encryptWithVersion(ring, "Secret message for v2");
    if (result.version !== "v2") throw new Error("Expected version=v2");
    return result;
  });

  // 5. Decrypt old ciphertext (v1 key still in ring)
  await task("Decrypt v1 ciphertext with rotated ring", () => {
    const plaintext = decryptWithVersion(ring, enc1.ciphertext, enc1.version);
    if (plaintext !== "Secret message for v1") throw new Error("Decryption mismatch");
  });

  // 6. Decrypt v2 ciphertext
  await task("Decrypt v2 ciphertext", () => {
    const plaintext = decryptWithVersion(ring, enc2.ciphertext, enc2.version);
    if (plaintext !== "Secret message for v2") throw new Error("Decryption mismatch");
  });

  // 7. Find key by version
  await task("Find key by version", () => {
    const found = findKeyByVersion(ring, "v1");
    if (!found) throw new Error("v1 not found");
    if (found.key !== key1) throw new Error("Wrong key material");
    const notFound = findKeyByVersion(ring, "v99");
    if (notFound !== undefined) throw new Error("Should not find v99");
  });

  // 8. Rotate to v3 with expiry on v1, then prune
  ring = await task("Rotate to v3, set v1 expiry, and prune", () => {
    // Set expiry on v1 (already in previous)
    ring.previous[0] = {
      ...ring.previous[0],
      expiresAt: new Date("2026-02-28"),
    };
    // Rotate to v3
    let r = rotateKey(ring, {
      version: "v3",
      key: key3,
      activatedAt: new Date("2026-05-01"),
    });
    if (r.previous.length !== 2) throw new Error("Expected 2 previous keys before prune");
    // Prune expired keys (v1 expired 2026-02-28, reference time is 2026-05-16)
    r = pruneExpiredKeys(r, new Date("2026-05-16"));
    if (r.previous.length !== 1) throw new Error("Expected 1 previous key after prune");
    if (r.previous[0].version !== "v2") throw new Error("Expected v2 to survive prune");
    return r;
  });

  // 9. Error: decrypt with pruned key version
  await taskResult("Error: decrypt with pruned key version", () => {
    try {
      decryptWithVersion(ring, enc1.ciphertext, "v1");
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: key version not found
    }
  });

  summary(9);
}

main();
