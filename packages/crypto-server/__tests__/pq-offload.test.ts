/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * ML-DSA and SLH-DSA key generation and signing ran synchronously on the
 * event loop: one SLH-DSA-SHA2-128s key generation stalled every request,
 * /health included, for over a second (10 s for SHAKE-256s). They now run
 * on a bounded worker pool, and a full pool answers 503.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import { CryptoWorkers } from "../src/lib/crypto-workers";

/** Largest gap between ticks of a 5 ms timer while `work` runs. */
async function maxEventLoopLag(work: () => Promise<unknown>): Promise<number> {
  let last = performance.now();
  let worst = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    worst = Math.max(worst, now - last);
    last = now;
  }, 5);
  try {
    await work();
  } finally {
    clearInterval(timer);
  }
  // Work that blocks until it ends leaves its gap after the last tick.
  return Math.max(worst, performance.now() - last);
}

describe("post-quantum work off the event loop", function () {
  this.timeout(120000);
  let app: FastifyInstance;
  before(async () => {
    app = await init();
  });
  after(async () => {
    await app.close();
  });

  const post = (url: string, payload: object) =>
    app.inject({ method: "POST", url, payload });

  it("keeps the event loop responsive during SLH-DSA key generation and signing", async () => {
    let keyId = "";
    const keygenLag = await maxEventLoopLag(async () => {
      const res = await post("/v2/pq/slh-dsa/keygen", { variant: "sha2-128s" });
      expect(res.statusCode).to.equal(200);
      keyId = res.json().data.keyId;
    });
    expect(keygenLag).to.be.below(100);

    const signLag = await maxEventLoopLag(async () => {
      const res = await post("/v2/pq/slh-dsa/sign", { keyId, message: "m" });
      expect(res.statusCode).to.equal(200);
    });
    expect(signLag).to.be.below(100);
  });

  it("signs and verifies ML-DSA through the pool", async () => {
    const gen = await post("/v2/pq/dsa/keygen", { level: 65 });
    expect(gen.statusCode).to.equal(200);
    const { keyId, publicKey } = gen.json().data;
    const sig = await post("/v2/pq/dsa/sign", { keyId, message: "hello" });
    expect(sig.statusCode).to.equal(200);
    const verify = await post("/v2/pq/dsa/verify", {
      level: 65,
      publicKey,
      message: "hello",
      signature: sig.json().data.signature,
    });
    expect(verify.json().data.valid).to.equal(true);
  });

  it("generates ML-DSA keys through /v2/keys/generate on the pool", async () => {
    const res = await post("/v2/keys/generate", { algorithm: "ml-dsa-44" });
    expect(res.statusCode).to.equal(200);
    expect(res.json().data.keyId).to.match(/^k_/);
  });

  it("answers 503 when the signing pool is full", async () => {
    const original = app.signer;
    app.signer = new CryptoWorkers({
      threads: 1,
      maxQueue: 0,
      taskTimeoutMs: 60000,
    });
    try {
      const results = await Promise.all(
        [1, 2, 3].map(() =>
          post("/v2/pq/slh-dsa/keygen", { variant: "sha2-128f" }),
        ),
      );
      const statuses = results.map((r) => r.statusCode).sort();
      expect(statuses).to.include(200);
      expect(statuses).to.include(503);
      const busy = results.find((r) => r.statusCode === 503)!;
      expect(busy.json().type).to.match(/service-unavailable$/);
    } finally {
      await app.signer.close();
      app.signer = original;
    }
  });

  it("answers 503 when the KDF pool is full", async () => {
    const original = app.kdf;
    app.kdf = new CryptoWorkers({
      threads: 1,
      maxQueue: 0,
      taskTimeoutMs: 60000,
    });
    try {
      const results = await Promise.all(
        [1, 2, 3].map(() =>
          post("/v2/kdf", {
            algorithm: "scrypt",
            password: "pw",
            params: { N: 131072, r: 8, p: 1 },
          }),
        ),
      );
      const statuses = results.map((r) => r.statusCode);
      expect(statuses).to.include(200);
      expect(statuses).to.include(503);
    } finally {
      await app.kdf.close();
      app.kdf = original;
    }
  });

  it("answers 503 when a task overruns its deadline", async () => {
    const original = app.signer;
    app.signer = new CryptoWorkers({
      threads: 1,
      maxQueue: 4,
      taskTimeoutMs: 1,
    });
    try {
      const res = await post("/v2/pq/slh-dsa/keygen", { variant: "sha2-128s" });
      expect(res.statusCode).to.equal(503);
    } finally {
      await app.signer.close();
      app.signer = original;
    }
  });
});
