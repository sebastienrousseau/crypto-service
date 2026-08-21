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

  const x25519Keys = await task("Generate X25519 key pair", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "x25519" });
    const body = (await res.json()) as {
      data: { publicKey: string; privateKey: string };
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
      recipientSecretKey: x25519Keys.privateKey,
      sealed,
    });
    const body = (await res.json()) as { data: string };
    if (body.data !== "Anonymous message") throw new Error("Mismatch");
  });

  // --- Post-quantum sealed box ---

  const pqX25519 = await task("Generate X25519 key pair (PQ sealed box)", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "x25519" });
    const body = (await res.json()) as {
      data: { publicKey: string; privateKey: string };
    };
    return body.data;
  });

  const pqMlKem = await task("Generate ML-KEM-768 key pair (PQ sealed box)", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "ml-kem-768" });
    const body = (await res.json()) as {
      data: { publicKey: string; privateKey: string };
    };
    return body.data;
  });

  const pqSealed = await task("Seal (PQ X25519+ML-KEM-768)", async () => {
    const res = await post("/v2/sealedbox/seal-pq", {
      x25519PublicKey: pqX25519.publicKey,
      mlKemPublicKey: pqMlKem.publicKey,
      plaintext: "Quantum-safe message",
    });
    const body = (await res.json()) as { data: unknown };
    return body.data;
  });

  await task("Open (PQ X25519+ML-KEM-768)", async () => {
    const res = await post("/v2/sealedbox/open-pq", {
      x25519SecretKey: pqX25519.privateKey,
      mlKemSecretKey: pqMlKem.privateKey,
      sealed: pqSealed,
    });
    const body = (await res.json()) as { data: string };
    if (body.data !== "Quantum-safe message") throw new Error("Mismatch");
  });

  summary(7);
}

main().catch(console.error);
