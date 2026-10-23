/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Startup, readiness and shutdown. The entry point (src/index.ts) ran
 * everything at import time, so no test loaded it and the coverage
 * report left it out; /ready always answered "ready", even while the
 * server was draining connections for shutdown. Startup and shutdown
 * now live in lib/lifecycle.ts, /ready reports draining and an
 * unwritable key directory, and a test runs the real entry point.
 */
import { expect } from "chai";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { chmod, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import type { FastifyInstance } from "fastify";
import { pino } from "pino";
import { gracefulShutdown, start } from "../src/lib/lifecycle";
import { init } from "../src/server";
import { withEnv } from "./support/auth";

const silent = pino({ level: "silent" });

function fakeServer(close: () => Promise<void>) {
  return { close } as unknown as FastifyInstance;
}

describe("server lifecycle", function () {
  this.timeout(60000);

  describe("gracefulShutdown", () => {
    it("closes the server, runs onClosed and exits 0, once", async () => {
      const exits: number[] = [];
      let closed = 0;
      let flushed = 0;
      const shutdown = gracefulShutdown(
        fakeServer(async () => {
          closed++;
        }),
        {
          timeoutMs: 1000,
          log: silent,
          exit: (code) => exits.push(code),
          onClosed: async () => {
            flushed++;
          },
        },
      );
      await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);
      expect({ closed, flushed, exits }).to.deep.equal({
        closed: 1,
        flushed: 1,
        exits: [0],
      });
    });

    it("exits 1 when closing fails", async () => {
      const exits: number[] = [];
      await gracefulShutdown(
        fakeServer(async () => {
          throw new Error("close failed");
        }),
        { timeoutMs: 1000, log: silent, exit: (code) => exits.push(code) },
      )("SIGTERM");
      expect(exits).to.deep.equal([1]);
    });

    it("forces exit 1 when draining takes too long", async () => {
      const exits: number[] = [];
      let release = (): void => undefined;
      const pending = gracefulShutdown(
        fakeServer(() => new Promise<void>((r) => (release = r))),
        { timeoutMs: 20, log: silent, exit: (code) => exits.push(code) },
      )("SIGTERM");
      await new Promise((r) => setTimeout(r, 60));
      expect(exits).to.deep.equal([1]);
      release();
      await pending;
    });
  });

  describe("start", () => {
    it("listens on the configured port and shuts down on a signal", async () => {
      const signals = new EventEmitter();
      const exits: number[] = [];
      const server = await start({
        env: { ...process.env, PORT: "0", HOST: "127.0.0.1" },
        log: silent,
        exit: (code) => exits.push(code),
        signals,
      });
      const address = server.addresses()[0]!;
      const res = await fetch(`http://127.0.0.1:${address.port}/live`);
      expect(res.status).to.equal(200);
      expect(signals.listenerCount("SIGTERM")).to.equal(1);
      expect(signals.listenerCount("SIGINT")).to.equal(1);
      signals.emit("SIGTERM");
      await new Promise((r) => setTimeout(r, 200));
      expect(exits).to.deep.equal([0]);
    });

    it("refuses to start with an invalid configuration", async () => {
      let error: unknown;
      try {
        await start({
          env: { ...process.env, PORT: "3000abc" },
          log: silent,
          exit: () => undefined,
          signals: new EventEmitter(),
        });
      } catch (e) {
        error = e;
      }
      expect(String(error)).to.include("PORT");
    });
  });

  describe("/ready", () => {
    it("answers 503 while the server drains for shutdown", async () => {
      const app = await init({ logger: false });
      try {
        expect((await app.inject({ url: "/ready" })).statusCode).to.equal(200);
        app.lifecycle.draining = true;
        const res = await app.inject({ url: "/ready" });
        expect(res.statusCode).to.equal(503);
        expect(res.json()).to.deep.equal({
          status: "not_ready",
          checks: { accepting: false, keyStore: true },
        });
        app.lifecycle.draining = false;
      } finally {
        await app.close();
      }
      expect(app.lifecycle.draining).to.equal(true);
    });

    it("answers 503 when the key directory is not writable", async function () {
      if (process.platform === "win32" || process.getuid?.() === 0) {
        this.skip();
      }
      const dir = await mkdtemp(path.join(tmpdir(), "ready-"));
      try {
        await withEnv({ CRYPTO_KEY_OUT_DIR: dir }, async () => {
          const app = await init({ logger: false });
          try {
            const ok = await app.inject({ url: "/ready" });
            expect(ok.json().checks.keyStore).to.equal(true);
            await chmod(dir, 0o500);
            const res = await app.inject({ url: "/ready" });
            expect(res.statusCode).to.equal(503);
            expect(res.json()).to.deep.include({ status: "not_ready" });
            expect(res.json().checks.keyStore).to.equal(false);
          } finally {
            await chmod(dir, 0o700);
            await app.close();
          }
        });
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    // Unlike the chmod test above, this one runs on Windows too.
    it("answers 503 when the key directory is gone", async () => {
      const dir = await mkdtemp(path.join(tmpdir(), "ready-"));
      await withEnv({ CRYPTO_KEY_OUT_DIR: dir }, async () => {
        const app = await init({ logger: false });
        try {
          await rm(dir, { recursive: true, force: true });
          const res = await app.inject({ url: "/ready" });
          expect(res.statusCode).to.equal(503);
          expect(res.json().checks.keyStore).to.equal(false);
        } finally {
          await app.close();
        }
      });
    });
  });

  describe("entry point", () => {
    const entry = path.join(__dirname, "..", "src", "index.ts");
    const run = (env: Record<string, string>) =>
      spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", entry],
        {
          cwd: path.join(__dirname, ".."),
          env: { ...process.env, LOG_LEVEL: "info", ...env },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

    function exitOf(child: ReturnType<typeof run>) {
      return new Promise<number | null>((resolve) =>
        child.on("exit", (code) => resolve(code)),
      );
    }

    it("starts the server and drains it on SIGTERM", async () => {
      const child = run({ PORT: "0", HOST: "127.0.0.1" });
      const exited = exitOf(child);
      let output = "";
      const port = await new Promise<number>((resolve, reject) => {
        child.stdout.on("data", (chunk: Buffer) => {
          output += chunk.toString();
          const m = /Server listening on http:\/\/127\.0\.0\.1:(\d+)\//.exec(
            output,
          );
          if (m) resolve(Number(m[1]));
        });
        child.on("exit", () => reject(new Error(output)));
      });
      const res = await fetch(`http://127.0.0.1:${port}/live`);
      expect(res.status).to.equal(200);
      child.kill("SIGTERM");
      const code = await exited;
      if (process.platform !== "win32") {
        expect(code).to.equal(0);
        expect(output).to.include("Goodbye");
      }
    });

    it("exits 1 and says why when the configuration is invalid", async () => {
      const child = run({ PORT: "3000abc" });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
      expect(await exitOf(child)).to.equal(1);
      expect(output).to.include("Server failed to start");
      expect(output).to.include("PORT");
    });
  });
});
