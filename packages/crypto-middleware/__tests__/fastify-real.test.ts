/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The plugin on a real Fastify instance (the other Fastify tests use a
// mock): registration must succeed on the Fastify major the suite ships
// with, and encrypt-response must round-trip through decryptPayload.

import { expect } from "chai";
import Fastify from "fastify";
import { generateKeyPair } from "@sebastienrousseau/crypto-lib/keys";
import { cryptoPlugin, pqStreamPlugin } from "../src/fastify";
import {
  decryptPayload,
  encryptPqPayload,
  decryptPqPayload,
} from "../src/common";

const KEY = "aa".repeat(32);

describe("Fastify plugin on a real Fastify instance", () => {
  it("registers and encrypts responses", async () => {
    const app = Fastify();
    await app.register(cryptoPlugin, {
      key: KEY,
      routes: ["/api/**"],
      operations: ["encrypt-response"],
    });
    app.get("/api/data", async () => ({ hello: "world" }));

    const res = await app.inject({ method: "GET", url: "/api/data" });
    await app.close();

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.not.include("world");
    const { encrypted } = res.json<{ encrypted: string }>();
    const opened = decryptPayload(KEY, encrypted);
    expect(opened).to.deep.equal({ hello: "world" });
  });

  it("registers pqStreamPlugin and handles post-quantum hybrid request/response", async () => {
    const x25519 = generateKeyPair("x25519");
    const mlkem = generateKeyPair("ml-kem-768");

    const app = Fastify();
    await app.register(pqStreamPlugin, {
      recipientKeys: {
        recipientX25519Public: x25519.publicKey,
        recipientMlKemPublic: mlkem.publicKey,
        recipientX25519Secret: x25519.privateKey,
        recipientMlKemSecret: mlkem.privateKey,
      },
      routes: ["/api/**"],
    });
    app.post("/api/echo", async (req, reply) => {
      reply.header("content-type", "application/json");
      const payload = req.body as { secure?: string };
      return { secure: String(payload?.secure ?? "") };
    });

    const ciphertext = encryptPqPayload(x25519.publicKey, mlkem.publicKey, {
      secure: "quantum-payload",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/echo",
      payload: { encrypted: ciphertext },
    });
    await app.close();

    expect(res.statusCode).to.equal(200);
    const json = res.json<{ encrypted: string; algorithm: string }>();
    expect(json.algorithm).to.equal("X25519-ML-KEM-768-XChaCha20-Poly1305");
    const decrypted = decryptPqPayload(
      x25519.privateKey,
      mlkem.privateKey,
      json.encrypted,
    );
    expect(decrypted).to.deep.equal({ secure: "quantum-payload" });
  });
});
