/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  WorkerPool,
  WorkerPoolBusyError,
  WorkerTaskTimeoutError,
} from "../../src/accel/worker-pool";

// A crashed or exited worker used to stay in the pool, marked free, so the
// next task sent to it never settled; the queue had no bound and tasks no
// deadline. The pool now replaces a worker that dies, can bound its queue
// and can time out a task (replacing the worker that ran it).

/**
 * A worker that answers "ok", crashes on "crash", exits on "exit" and
 * never answers "hang".
 */
const SCRIPT = `
const { parentPort } = require("node:worker_threads");
parentPort.on("message", (msg) => {
  if (msg.functionName === "crash") {
    setTimeout(() => { throw new Error("worker crash"); }, 0);
  } else if (msg.functionName === "exit") {
    process.exit(3);
  } else if (msg.functionName === "hang") {
    // never answers
  } else {
    parentPort.postMessage({ success: true, result: "ok" });
  }
});
`;

const task = (functionName: string) => ({
  modulePath: "unused",
  functionName,
  args: [],
});

async function rejection(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (err) {
    return err as Error;
  }
  throw new Error("expected a rejection");
}

describe("WorkerPool recovery and limits", function () {
  this.timeout(30000);
  let script: string;
  before(() => {
    script = path.join(os.tmpdir(), `pool-recovery-${process.pid}.js`);
    fs.writeFileSync(script, SCRIPT);
  });
  after(() => fs.rmSync(script, { force: true }));

  it("replaces a worker that crashes and keeps serving", async () => {
    const pool = new WorkerPool({ size: 1, workerScript: script });
    try {
      expect((await rejection(pool.execute(task("crash")))).message).to.include(
        "worker crash",
      );
      expect(await pool.execute(task("work"))).to.equal("ok");
      expect(await pool.execute(task("work"))).to.equal("ok");
    } finally {
      await pool.shutdown();
    }
  });

  it("rejects the task of a worker that exits and keeps serving", async () => {
    const pool = new WorkerPool({ size: 1, workerScript: script });
    try {
      expect((await rejection(pool.execute(task("exit")))).message).to.include(
        "exited with code 3",
      );
      expect(await pool.execute(task("work"))).to.equal("ok");
    } finally {
      await pool.shutdown();
    }
  });

  it("serves queued tasks after a crash", async () => {
    const pool = new WorkerPool({ size: 1, workerScript: script });
    try {
      const crashed = pool.execute(task("crash"));
      const queued = pool.execute(task("work"));
      await rejection(crashed);
      expect(await queued).to.equal("ok");
    } finally {
      await pool.shutdown();
    }
  });

  it("refuses work beyond maxQueue without queueing it", async () => {
    const pool = new WorkerPool({ size: 1, workerScript: script, maxQueue: 1 });
    try {
      const running = pool.execute(task("hang"));
      const queued = pool.execute(task("hang"));
      const err = await rejection(pool.execute(task("work")));
      expect(err).to.be.instanceOf(WorkerPoolBusyError);
      expect(pool.pending).to.equal(1);
      running.catch(() => {});
      queued.catch(() => {});
    } finally {
      await pool.shutdown();
    }
  });

  it("times out a task, replaces its worker and runs the next", async () => {
    const pool = new WorkerPool({
      size: 1,
      workerScript: script,
      taskTimeoutMs: 200,
    });
    try {
      const err = await rejection(pool.execute(task("hang")));
      expect(err).to.be.instanceOf(WorkerTaskTimeoutError);
      expect(await pool.execute(task("work"))).to.equal("ok");
    } finally {
      await pool.shutdown();
    }
  });

  // The deadline started when a task was posted, so it counted the start
  // of a fresh worker (tens of milliseconds, more under load): a task
  // sent to a replacement worker could time out before the worker ran,
  // and its own replacement then started just as slowly. The deadline now
  // starts when the worker is online. A worker takes over 10 ms to start
  // but answers within a few once online, so with a 10 ms deadline every
  // task here failed before.
  it("does not count a worker's start-up against the task deadline", async () => {
    for (let i = 0; i < 5; i++) {
      const pool = new WorkerPool({
        size: 1,
        workerScript: script,
        taskTimeoutMs: 10,
      });
      try {
        expect(await pool.execute(task("work"))).to.equal("ok");
      } finally {
        await pool.shutdown();
      }
    }
  });

  it("starts workers with the given resource limits", async () => {
    const pool = new WorkerPool({
      size: 1,
      workerScript: script,
      resourceLimits: { maxOldGenerationSizeMb: 64 },
    });
    try {
      expect(await pool.execute(task("work"))).to.equal("ok");
    } finally {
      await pool.shutdown();
    }
  });

  it("rejects running tasks on shutdown instead of leaving them pending", async () => {
    const pool = new WorkerPool({ size: 1, workerScript: script });
    // Handle the rejection before shutdown() causes it, not after.
    const outcome = rejection(pool.execute(task("hang")));
    await pool.shutdown();
    expect((await outcome).message).to.include("shutting down");
  });
});
