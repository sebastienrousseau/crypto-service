// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Post-quantum KEM operations via POST /v2/pq/*.
 *
 * Demonstrates ML-KEM-768 (FIPS 203) key generation, encapsulation,
 * and decapsulation, plus the hybrid X25519 + ML-KEM-768 variant.
 *
 * Run: `npx ts-node examples/pqkem.ts`
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
  header("crypto-server -- pqkem");

  // --- ML-KEM-768 standalone ---

  const keyPair = await task("Generate ML-KEM-768 key pair", async () => {
    const res = await post("/v2/pq/keygen", {});
    const body = (await res.json()) as {
      data: { publicKey: string; secretKey: string };
    };
    return body.data;
  });

  const encap = await task("Encapsulate shared secret", async () => {
    const res = await post("/v2/pq/encapsulate", {
      publicKey: keyPair.publicKey,
    });
    const body = (await res.json()) as {
      data: { ciphertext: string; sharedSecret: string };
    };
    return body.data;
  });

  await task("Decapsulate shared secret", async () => {
    const res = await post("/v2/pq/decapsulate", {
      secretKey: keyPair.secretKey,
      ciphertext: encap.ciphertext,
    });
    const body = (await res.json()) as { data: string };
    if (!body.data) throw new Error("Decapsulation failed");
  });

  // --- Hybrid X25519 + ML-KEM-768 ---

  const hybridKeys = await task("Generate hybrid X25519+ML-KEM-768 key pair", async () => {
    const res = await post("/v2/pq/hybrid/keygen", {});
    const body = (await res.json()) as {
      data: {
        x25519PublicKey: string;
        x25519PrivateKey: string;
        mlKemPublicKey: string;
        mlKemSecretKey: string;
      };
    };
    return body.data;
  });

  const hybridEncap = await task("Hybrid encapsulate", async () => {
    const res = await post("/v2/pq/hybrid/encapsulate", {
      x25519PublicKey: hybridKeys.x25519PublicKey,
      mlKemPublicKey: hybridKeys.mlKemPublicKey,
    });
    const body = (await res.json()) as {
      data: {
        sharedSecret: string;
        x25519EphemeralPublic: string;
        mlKemCiphertext: string;
      };
    };
    return body.data;
  });

  await task("Hybrid decapsulate", async () => {
    const res = await post("/v2/pq/hybrid/decapsulate", {
      x25519PrivateKey: hybridKeys.x25519PrivateKey,
      mlKemSecretKey: hybridKeys.mlKemSecretKey,
      x25519EphemeralPublic: hybridEncap.x25519EphemeralPublic,
      mlKemCiphertext: hybridEncap.mlKemCiphertext,
    });
    const body = (await res.json()) as { data: string };
    if (!body.data) throw new Error("Hybrid decapsulation failed");
  });

  summary(6);
}

main().catch(console.error);
