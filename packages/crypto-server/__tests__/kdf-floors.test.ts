/**
 * KDF and password-hash work factors and event-loop isolation (audit
 * findings F14, F15).
 *
 * Before this change /v2/kdf accepted scrypt N = 2 and one PBKDF2
 * iteration, /v2/password/hash accepted Argon2 with 1 KiB of memory, and
 * every derivation ran synchronously on the event loop, so one request
 * at the maximum cost stalled every other request, /health included.
 */
import { expect } from "chai";
import { monitorEventLoopDelay } from "perf_hooks";
import type { FastifyInstance } from "fastify";
import { hashPassword } from "@sebastienrousseau/crypto-lib/modern";
import { init } from "../src/server";
import { KdfRunner } from "../src/lib/kdf-runner";
import { KDF_FLOORS } from "../src/routes/v2/kdf";
import { ARGON2_FLOORS } from "../src/routes/v2/password";

describe("KDF floors and off-loop work (F14, F15)", function () {
  this.timeout(60000);

  let app: FastifyInstance;
  before(async () => {
    app = await init();
  });
  after(async () => {
    await app.close();
  });

  /** POST a JSON body and return the response. */
  const post = (url: string, payload: object) =>
    app.inject({ method: "POST", url, payload });

  it("uses the OWASP floors", () => {
    expect(KDF_FLOORS).to.deep.equal({
      scryptN: 131072,
      scryptR: 8,
      pbkdf2Iterations: 600000,
    });
    expect(ARGON2_FLOORS).to.deep.equal({ memoryCostKiB: 19456, timeCost: 2 });
  });

  const belowFloor: Array<[string, string, object]> = [
    [
      "scrypt N = 2^16",
      "/v2/kdf",
      { algorithm: "scrypt", password: "pw", params: { N: 65536 } },
    ],
    [
      "scrypt r = 4",
      "/v2/kdf",
      { algorithm: "scrypt", password: "pw", params: { r: 4 } },
    ],
    [
      "PBKDF2 with 599,999 iterations",
      "/v2/kdf",
      {
        algorithm: "pbkdf2-sha256",
        password: "pw",
        params: { iterations: 599999 },
      },
    ],
    ["Argon2 t = 1", "/v2/password/hash", { password: "pw", timeCost: 1 }],
    [
      "Argon2 m = 19455 KiB",
      "/v2/password/hash",
      { password: "pw", memoryCost: 19455 },
    ],
  ];
  for (const [label, url, payload] of belowFloor) {
    it(`rejects ${label} with 400`, async () => {
      expect((await post(url, payload)).statusCode).to.equal(400);
    });
  }

  it("derives at the floor (PBKDF2 600,000 iterations)", async () => {
    const res = await post("/v2/kdf", {
      algorithm: "pbkdf2-sha256",
      password: "pw",
      salt: "00".repeat(16),
      params: { iterations: 600000 },
    });
    expect(res.statusCode).to.equal(200);
    expect(res.json().data.derivedKey).to.have.length(64);
  });

  it("still verifies an existing hash made below today's floor", async () => {
    const old = hashPassword({
      password: "legacy",
      timeCost: 1,
      memoryCost: 1024,
      parallelism: 1,
    });
    const res = await post("/v2/password/verify", {
      password: "legacy",
      hash: old.hash,
      salt: old.salt,
      params: old.params,
    });
    expect(res.statusCode).to.equal(200);
    expect(res.json().data.valid).to.equal(true);
  });

  it("keeps the event loop responsive during a maximum-cost KDF", async () => {
    const lag = monitorEventLoopDelay({ resolution: 10 });
    lag.enable();
    const started = Date.now();
    let kdfDone = 0;
    const kdf = post("/v2/kdf", {
      algorithm: "scrypt",
      password: "pw",
      params: { N: 131072, r: 8, p: 4 },
    }).then((res) => {
      kdfDone = Date.now();
      return res;
    });

    // Let the KDF request reach its handler, then probe the server.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const health = await app.inject({ method: "GET", url: "/health" });
    const healthDone = Date.now();
    const res = await kdf;
    lag.disable();

    expect(res.statusCode).to.equal(200);
    expect(health.statusCode).to.equal(200);
    // /health answered while the derivation was still running ...
    expect(kdfDone).to.be.greaterThan(healthDone);
    // ... the derivation took long enough for that to mean something ...
    expect(kdfDone - started).to.be.greaterThan(300);
    // ... and no tick of the event loop was held up for long.
    expect(lag.max / 1e6).to.be.lessThan(200);
  });

  describe("KdfRunner", () => {
    it("starts no threads until used, and closes cleanly either way", async () => {
      const runner = new KdfRunner();
      await runner.close();
      const out = await runner.run<{ algorithm: string }>(
        "modern",
        "kdfDerive",
        {
          algorithm: "hkdf-sha256",
          password: "x",
        },
      );
      expect(out.algorithm).to.equal("hkdf-sha256");
      await runner.close();
    });

    it("returns crypto-lib's error message from the worker", async () => {
      const runner = new KdfRunner();
      try {
        const err = await runner
          .run("modern", "kdfDerive", {
            algorithm: "hkdf-sha256",
            password: "x",
            salt: "zz",
          })
          .catch((e: Error) => e);
        expect((err as Error).message).to.equal("Invalid hex string");
      } finally {
        await runner.close();
      }
    });
  });
});
