import { expect } from "chai";
import { WorkerPool } from "../../src/accel/worker-pool";
import * as path from "path";
import * as fs from "fs";

describe("WorkerPool", () => {
  it("should create a pool with default options", () => {
    const pool = new WorkerPool();
    expect(pool).to.be.an.instanceOf(WorkerPool);
    expect(pool.size).to.be.at.least(1);
    pool.shutdown();
  });

  it("should create a pool with custom size", () => {
    const pool = new WorkerPool({ size: 2 });
    expect(pool.size).to.equal(2);
    pool.shutdown();
  });

  it("should execute a task using a module path", async () => {
    const pool = new WorkerPool({ size: 1 });
    try {
      const modulePath = path.resolve(
        __dirname,
        "../../dist/modern/hash.js",
      );
      const result = await pool.execute<{ digest: string }>({
        modulePath,
        functionName: "hash",
        args: [{ algorithm: "sha256", data: "hello" }],
      });
      expect(result.digest).to.be.a("string");
      expect(result.digest).to.have.length(64);
    } finally {
      await pool.shutdown();
    }
  });

  it("should handle shutdown gracefully", async () => {
    const pool = new WorkerPool({ size: 1 });
    await pool.shutdown();
    // After shutdown, execute should reject
    try {
      await pool.execute({
        modulePath: "node:path",
        functionName: "resolve",
        args: ["/"],
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).message).to.include("shut down");
    }
  });

  it("should reject tasks with invalid module paths", async () => {
    const pool = new WorkerPool({ size: 1 });
    try {
      await pool.execute({
        modulePath: "/nonexistent/module.js",
        functionName: "foo",
        args: [],
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).to.exist;
    } finally {
      await pool.shutdown();
    }
  });

  describe("pending and active getters", () => {
    it("should report pending and active counts when pool is saturated", async () => {
      const pool = new WorkerPool({ size: 1 });
      const modulePath = path.resolve(
        __dirname,
        "../../dist/modern/hash.js",
      );

      try {
        // Submit multiple tasks to a pool with only 1 worker
        const task = {
          modulePath,
          functionName: "hash",
          args: [{ algorithm: "sha256", data: "test" }],
        };

        // Submit 3 tasks — 1 will be dispatched, 2 will queue
        const p1 = pool.execute(task);
        const p2 = pool.execute(task);
        const p3 = pool.execute(task);

        // At this point, 1 worker is active and 2 tasks are pending
        expect(pool.active).to.equal(1);
        expect(pool.pending).to.equal(2);

        // Wait for all to complete
        await Promise.all([p1, p2, p3]);
      } finally {
        await pool.shutdown();
      }
    });
  });

  describe("processQueue", () => {
    it("should automatically dispatch queued tasks when a worker becomes free", async () => {
      const pool = new WorkerPool({ size: 1 });
      const modulePath = path.resolve(
        __dirname,
        "../../dist/modern/hash.js",
      );

      try {
        const results: Array<{ digest: string }> = [];

        // Submit 4 tasks to a single-worker pool — forces queue processing
        const tasks = Array.from({ length: 4 }, (_, i) =>
          pool.execute<{ digest: string }>({
            modulePath,
            functionName: "hash",
            args: [{ algorithm: "sha256", data: `message-${i}` }],
          }),
        );

        const all = await Promise.all(tasks);
        for (const r of all) {
          results.push(r);
        }

        // All 4 tasks completed successfully
        expect(results).to.have.length(4);
        for (const r of results) {
          expect(r.digest).to.be.a("string");
          expect(r.digest).to.have.length(64);
        }

        // After all tasks complete, pending and active should be 0
        expect(pool.pending).to.equal(0);
        expect(pool.active).to.equal(0);
      } finally {
        await pool.shutdown();
      }
    });
  });

  describe("worker error handling", () => {
    it("should reject with an error when the worker encounters a module error", async () => {
      const pool = new WorkerPool({ size: 1 });

      try {
        await pool.execute({
          modulePath: "/tmp/nonexistent-module-xyz.js",
          functionName: "doSomething",
          args: [],
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect((err as Error).message).to.be.a("string");
      } finally {
        await pool.shutdown();
      }
    });

    it("should reject when the function does not exist in the module", async () => {
      const pool = new WorkerPool({ size: 1 });
      const modulePath = path.resolve(
        __dirname,
        "../../dist/modern/hash.js",
      );

      try {
        await pool.execute({
          modulePath,
          functionName: "nonExistentFunction",
          args: [],
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect((err as Error).message).to.include("is not a function");
      } finally {
        await pool.shutdown();
      }
    });

    it("should continue processing queued tasks after an error", async () => {
      const pool = new WorkerPool({ size: 1 });
      const modulePath = path.resolve(
        __dirname,
        "../../dist/modern/hash.js",
      );

      try {
        // Submit a failing task followed by a valid task
        const failTask = pool.execute({
          modulePath: "/tmp/nonexistent-module-xyz.js",
          functionName: "doSomething",
          args: [],
        });

        const successTask = pool.execute<{ digest: string }>({
          modulePath,
          functionName: "hash",
          args: [{ algorithm: "sha256", data: "after-error" }],
        });

        // The first task should reject
        try {
          await failTask;
          expect.fail("Should have thrown");
        } catch (err) {
          expect(err).to.be.an.instanceOf(Error);
        }

        // The second task should still succeed (processQueue after error)
        const result = await successTask;
        expect(result.digest).to.be.a("string");
        expect(result.digest).to.have.length(64);
      } finally {
        await pool.shutdown();
      }
    });

    it("should trigger the worker error event handler when the worker thread crashes", async () => {
      // Create a worker script that throws an unhandled error when it receives a message
      const crashScript = "/tmp/crash-worker-test.js";
      fs.writeFileSync(
        crashScript,
        `const { parentPort } = require("node:worker_threads");
parentPort.on("message", () => {
  // Throw outside of any try/catch to trigger the 'error' event on the Worker
  setTimeout(() => { throw new Error("worker crash"); }, 0);
});`,
      );

      const pool = new WorkerPool({ size: 1, workerScript: crashScript });

      try {
        await pool.execute({
          modulePath: "irrelevant",
          functionName: "irrelevant",
          args: [],
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect((err as Error).message).to.include("worker crash");
      } finally {
        await pool.shutdown();
        fs.unlinkSync(crashScript);
      }
    });
  });

  describe("shutdown with pending tasks", () => {
    it("should reject queued tasks when shutdown is called", async () => {
      // Create a worker script that delays responding, so tasks queue up
      const slowScript = "/tmp/slow-worker-test.js";
      fs.writeFileSync(
        slowScript,
        `const { parentPort } = require("node:worker_threads");
parentPort.on("message", (msg) => {
  // Delay response to keep the worker busy
  setTimeout(() => {
    parentPort.postMessage({ success: true, result: "done" });
  }, 5000);
});`,
      );

      const pool = new WorkerPool({ size: 1, workerScript: slowScript });

      // Submit 3 tasks — first one occupies the worker, the rest queue
      pool.execute({
        modulePath: "any",
        functionName: "any",
        args: [],
      }).catch(() => { /* p1 will never resolve — worker terminated */ });

      const p2 = pool.execute({
        modulePath: "any",
        functionName: "any",
        args: [],
      });
      const p3 = pool.execute({
        modulePath: "any",
        functionName: "any",
        args: [],
      });

      // Verify tasks are pending
      expect(pool.pending).to.equal(2);

      // Shutdown immediately — queued tasks (p2, p3) should be rejected
      await pool.shutdown();

      // p2 and p3 should reject with "shutting down" error
      const results = await Promise.allSettled([p2, p3]);
      expect(results.every((r) => r.status === "rejected")).to.be.true;
      for (const r of results) {
        expect(
          (r as PromiseRejectedResult).reason.message,
        ).to.include("shutting down");
      }

      fs.unlinkSync(slowScript);
    });
  });
});
