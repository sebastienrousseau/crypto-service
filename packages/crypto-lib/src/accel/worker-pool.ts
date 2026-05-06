/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Worker thread pool for offloading CPU-intensive cryptographic operations.
 *
 * Uses Node.js `worker_threads` to parallelize heavy operations (key generation,
 * hashing large data, PQ crypto) across multiple threads. The pool auto-sizes
 * based on available CPUs.
 *
 * Each worker runs a generic executor that accepts a task module path and
 * function name, deserializes the arguments, runs the function, and returns
 * the serialized result.
 */

import { Worker, isMainThread } from "node:worker_threads";
import { cpus } from "node:os";

// --- Types ---

/** Configuration options for the worker thread pool. */
export interface WorkerPoolOptions {
  /** Number of worker threads. Default: Math.max(1, cpus / 2). */
  size?: number;
  /** Path to the worker script. Default: built-in generic executor. */
  workerScript?: string;
}

/** Descriptor for a task to be executed in a worker thread. */
export interface WorkerTask {
  /** Module path to import (absolute or package specifier). */
  modulePath: string;
  /** Function name to call from the module. */
  functionName: string;
  /** Arguments to pass to the function. */
  args: unknown[];
}

interface PendingTask {
  task: WorkerTask;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

interface WorkerEntry {
  worker: Worker;
  busy: boolean;
}

// --- Worker Executor (inline script) ---

/**
 * The inline worker script. We eval this in each worker thread to avoid
 * needing a separate file on disk.
 */
const WORKER_SCRIPT = `
const { parentPort } = require("node:worker_threads");

parentPort.on("message", async (msg) => {
  try {
    const mod = await import(msg.modulePath);
    const fn = mod[msg.functionName];
    if (typeof fn !== "function") {
      throw new Error(\`"\${msg.functionName}" is not a function in \${msg.modulePath}\`);
    }
    const result = await fn(...msg.args);
    parentPort.postMessage({ success: true, result });
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
`;

// --- WorkerPool Class ---

/**
 * A thread pool for offloading CPU-intensive cryptographic tasks to worker threads.
 *
 * @example
 * ```ts
 * const pool = new WorkerPool({ size: 4 });
 * const result = await pool.execute({
 *   modulePath: "@noble/hashes/sha256",
 *   functionName: "sha256",
 *   args: [new Uint8Array([1, 2, 3])],
 * });
 * await pool.shutdown();
 * ```
 */
export class WorkerPool {
  private workers: WorkerEntry[] = [];
  private queue: PendingTask[] = [];
  private terminated = false;
  /** Number of worker threads in the pool. */
  public readonly size: number;

  constructor(options: WorkerPoolOptions = {}) {
    /* c8 ignore next 3 -- only reachable from worker threads (separate V8 instance) */
    if (!isMainThread) {
      throw new Error("WorkerPool must be created from the main thread");
    }

    this.size = Math.max(1, options.size ?? Math.floor(cpus().length / 2));

    const script = options.workerScript ?? undefined;

    for (let i = 0; i < this.size; i++) {
      const worker = script
        ? new Worker(script)
        : new Worker(WORKER_SCRIPT, { eval: true });

      this.workers.push({ worker, busy: false });
    }
  }

  /**
   * Execute a task on an available worker thread.
   *
   * The task specifies a module path and function name. The worker will
   * dynamically import the module, call the function with the provided
   * arguments, and return the result.
   *
   * @param task - Task descriptor with module, function, and arguments.
   * @returns Promise resolving to the function's return value.
   */
  execute<T = unknown>(task: WorkerTask): Promise<T> {
    if (this.terminated) {
      return Promise.reject(new Error("WorkerPool has been shut down"));
    }

    return new Promise<T>((resolve, reject) => {
      const pending: PendingTask = {
        task,
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      const available = this.workers.find((w) => !w.busy);
      if (available) {
        this.dispatch(available, pending);
      } else {
        this.queue.push(pending);
      }
    });
  }

  /**
   * Shut down all workers and reject any pending tasks.
   *
   * After calling shutdown, the pool cannot be reused. Any tasks still
   * in the queue will be rejected with an error.
   */
  async shutdown(): Promise<void> {
    this.terminated = true;

    // Reject pending tasks
    for (const pending of this.queue) {
      pending.reject(new Error("WorkerPool is shutting down"));
    }
    this.queue = [];

    // Terminate all workers
    const terminations = this.workers.map((entry) => entry.worker.terminate());
    await Promise.all(terminations);
    this.workers = [];
  }

  /**
   * Get the number of tasks currently waiting in the queue.
   */
  get pending(): number {
    return this.queue.length;
  }

  /**
   * Get the number of workers currently processing a task.
   */
  get active(): number {
    return this.workers.filter((w) => w.busy).length;
  }

  private dispatch(entry: WorkerEntry, pending: PendingTask): void {
    entry.busy = true;

    const handler = (msg: {
      success: boolean;
      result?: unknown;
      error?: string;
    }) => {
      entry.worker.off("message", handler);
      entry.worker.off("error", errorHandler);
      entry.busy = false;

      if (msg.success) {
        pending.resolve(msg.result);
      } else {
        /* c8 ignore next -- worker error messages always include .error */
        pending.reject(new Error(msg.error ?? "Worker task failed"));
      }

      // Process next queued task
      this.processQueue(entry);
    };

    const errorHandler = (err: Error) => {
      entry.worker.off("message", handler);
      entry.worker.off("error", errorHandler);
      entry.busy = false;
      pending.reject(err);

      // Process next queued task
      this.processQueue(entry);
    };

    entry.worker.on("message", handler);
    entry.worker.on("error", errorHandler);
    entry.worker.postMessage(pending.task);
  }

  private processQueue(entry: WorkerEntry): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.dispatch(entry, next);
    }
  }
}
