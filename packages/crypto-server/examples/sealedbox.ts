// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Sealed box operations via POST /v2/sealedbox/*.
 *
 * Anonymous public-key encryption using X25519, plus the post-quantum
 * hybrid variant (X25519 + ML-KEM-768).
 *
 * Run: `npx ts-node examples/sealedbox.ts`
 * Requires: crypto-server running on http://localhost:3000
 */

import { header, task, summary } from "./support";

const BASE = process.env.CRYPTO_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.CRYPTO_API_KEY ?? "test-key";

function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify(body),
  });
}

async function main() {
  header("crypto-server -- sealedbox");

  // --- Classical sealed box ---

  // The server keeps the private key and returns its keyId.
  const x25519Keys = await task("Generate X25519 key pair", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "x25519" });
    const body = (await res.json()) as {
      data: { keyId: string; publicKey: string };
    };
    return body.data;
  });

  const sealed = await task("Seal (classical X25519)", async () => {
    const res = await post("/v2/sealedbox/seal", {
      recipientPublicKey: x25519Keys.publicKey,
      plaintext: "Anonymous message",
    });
    const body = (await res.json()) as { data: string };
    return body.data;
  });

  await task("Open (classical X25519)", async () => {
    const res = await post("/v2/sealedbox/open", {
      keyId: x25519Keys.keyId,
      sealed,
    });
    const body = (await res.json()) as { data: string };
    if (body.data !== "Anonymous message") throw new Error("Mismatch");
  });

  // --- Post-quantum sealed box ---

  const pqKeys = await task("Generate hybrid X25519+ML-KEM-768 key pair", async () => {
    const res = await post("/v2/pq/hybrid/keygen", {});
    const body = (await res.json()) as {
      data: { keyId: string; x25519PublicKey: string; mlKemPublicKey: string };
    };
    return body.data;
  });

  const pqSealed = await task("Seal (PQ X25519+ML-KEM-768)", async () => {
    const res = await post("/v2/sealedbox/seal-pq", {
      x25519PublicKey: pqKeys.x25519PublicKey,
      mlKemPublicKey: pqKeys.mlKemPublicKey,
      plaintext: "Quantum-safe message",
    });
    const body = (await res.json()) as { data: unknown };
    return body.data;
  });

  await task("Open (PQ X25519+ML-KEM-768)", async () => {
    const res = await post("/v2/sealedbox/open-pq", {
      keyId: pqKeys.keyId,
      sealed: pqSealed,
    });
    const body = (await res.json()) as { data: string };
    if (body.data !== "Quantum-safe message") throw new Error("Mismatch");
  });

  summary(6);
}

main().catch(console.error);
