/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Worker thread pool for offloading CPU-intensive cryptographic operations.
 *
 * Uses Node.js `worker_threads` to parallelize heavy operations (key generation,
 * hashing large data, PQ crypto) across multiple threads. The pool auto-sizes
 * based on available CPUs.
 *
 * Each worker runs a generic executor that accepts a task module path and
 * function name, deserializes the arguments, runs the function, and returns
 * the serialized result.
 *
 * A worker that crashes, exits or overruns `taskTimeoutMs` is replaced and
 * its task rejected, so the pool keeps its size. `maxQueue` bounds the
 * tasks waiting for a worker; beyond it `execute` rejects at once with
 * {@link WorkerPoolBusyError}.
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
  /**
   * Tasks that may wait for a worker; further tasks are rejected with
   * {@link WorkerPoolBusyError}. Default: unbounded.
   */
  maxQueue?: number;
  /**
   * Milliseconds a task may run before it is rejected with
   * {@link WorkerTaskTimeoutError} and its worker replaced. The clock
   * starts once the worker is running, so a fresh worker's start-up does
   * not count. Default: none.
   */
  taskTimeoutMs?: number;
  /** Resource limits for each worker thread (heap sizes, stack size). */
  resourceLimits?: import("node:worker_threads").ResourceLimits;
}

/** Raised by `execute` when `maxQueue` tasks are already waiting. */
export class WorkerPoolBusyError extends Error {
  override readonly name = "WorkerPoolBusyError";
}

/** Raised for a task that ran longer than `taskTimeoutMs`. */
export class WorkerTaskTimeoutError extends Error {
  override readonly name = "WorkerTaskTimeoutError";
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

/** Internal representation of a queued task awaiting a free worker. */
interface PendingTask {
  task: WorkerTask;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/** Internal wrapper tracking a Worker instance and the task it runs. */
interface WorkerEntry {
  worker: Worker;
  /** The task in progress, if any. */
  current: PendingTask | undefined;
  /** Timer that fails `current` after `taskTimeoutMs`. */
  timer: ReturnType<typeof setTimeout> | undefined;
  /** Set once the worker has failed and been replaced. */
  retired: boolean;
  /** Set once the worker thread runs JavaScript; deadlines start then. */
  online: boolean;
}

// --- Worker Executor (inline script) ---

/**
 * The inline worker script. We eval this in each worker thread to avoid
 * needing a separate file on disk.
 */
const WORKER_SCRIPT = `
const { parentPort } = require("node:worker_threads");
const { isAbsolute } = require("node:path");
const { pathToFileURL } = require("node:url");

parentPort.on("message", async (msg) => {
  try {
    // import() needs a file:// URL for absolute paths on Windows
    // ("D:\\..." is read as a URL with scheme "d:").
    const specifier = isAbsolute(msg.modulePath)
      ? pathToFileURL(msg.modulePath).href
      : msg.modulePath;
    const mod = await import(specifier);
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
  private readonly script: string | undefined;
  private readonly maxQueue: number;
  private readonly taskTimeoutMs: number | undefined;
  private readonly resourceLimits: WorkerPoolOptions["resourceLimits"];
  /** Number of worker threads in the pool. */
  public readonly size: number;

  constructor(options: WorkerPoolOptions = {}) {
    /* c8 ignore next 3 -- only reachable from worker threads (separate V8 instance) */
    if (!isMainThread) {
      throw new Error("WorkerPool must be created from the main thread");
    }

    this.size = Math.max(1, options.size ?? Math.floor(cpus().length / 2));
    this.script = options.workerScript;
    this.maxQueue = options.maxQueue ?? Number.POSITIVE_INFINITY;
    this.taskTimeoutMs = options.taskTimeoutMs;
    this.resourceLimits = options.resourceLimits;

    for (let i = 0; i < this.size; i++) {
      this.workers.push(this.spawn());
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
    const available = this.workers.find((w) => !w.current);
    if (!available && this.queue.length >= this.maxQueue) {
      return Promise.reject(
        new WorkerPoolBusyError("WorkerPool queue is full"),
      );
    }

    return new Promise<T>((resolve, reject) => {
      const pending: PendingTask = {
        task,
        resolve: resolve as (value: unknown) => void,
        reject,
      };
      if (available) {
        this.dispatch(available, pending);
      } else {
        this.queue.push(pending);
      }
    });
  }

  /**
   * Shut down all workers and reject queued and running tasks.
   *
   * After calling shutdown, the pool cannot be reused.
   */
  async shutdown(): Promise<void> {
    this.terminated = true;
    const stopping = new Error("WorkerPool is shutting down");

    for (const pending of this.queue) pending.reject(stopping);
    this.queue = [];
    for (const entry of this.workers) {
      this.clearTimer(entry);
      entry.current?.reject(stopping);
      entry.current = undefined;
    }

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
    return this.workers.filter((w) => w.current).length;
  }

  /** Start a worker and listen for its answers and its failure. */
  private spawn(): WorkerEntry {
    const options = this.resourceLimits
      ? { resourceLimits: this.resourceLimits }
      : {};
    const worker = this.script
      ? new Worker(this.script, options)
      : new Worker(WORKER_SCRIPT, { ...options, eval: true });
    const entry: WorkerEntry = {
      worker,
      current: undefined,
      timer: undefined,
      retired: false,
      online: false,
    };
    // A task posted before the worker runs waits for it; its deadline
    // starts only now.
    worker.once("online", () => {
      entry.online = true;
      if (entry.current) this.startTimer(entry);
    });
    worker.on("message", (msg) => this.settle(entry, msg));
    worker.on("error", (err: Error) => this.fail(entry, err));
    worker.on("exit", (code: number) =>
      this.fail(entry, new Error(`Worker exited with code ${code}`)),
    );
    return entry;
  }

  private dispatch(entry: WorkerEntry, pending: PendingTask): void {
    entry.current = pending;
    if (entry.online) this.startTimer(entry);
    entry.worker.postMessage(pending.task);
  }

  /** Fails the worker's task if it runs longer than `taskTimeoutMs`. */
  private startTimer(entry: WorkerEntry): void {
    if (this.taskTimeoutMs === undefined) return;
    const ms = this.taskTimeoutMs;
    entry.timer = setTimeout(
      () =>
        this.fail(
          entry,
          new WorkerTaskTimeoutError(`Worker task timed out after ${ms} ms`),
        ),
      ms,
    );
  }

  /** A worker answered its task. */
  private settle(
    entry: WorkerEntry,
    msg: { success: boolean; result?: unknown; error?: string },
  ): void {
    const pending = entry.current;
    /* c8 ignore next -- a worker only answers the task it was given */
    if (!pending) return;
    this.clearTimer(entry);
    entry.current = undefined;
    if (msg.success) {
      pending.resolve(msg.result);
    } else {
      /* c8 ignore next -- worker error messages always include .error */
      pending.reject(new Error(msg.error ?? "Worker task failed"));
    }
    this.processQueue(entry);
  }

  /**
   * A worker crashed, exited or overran its deadline: reject its task,
   * stop it, and put a fresh worker in its place. Runs once per worker.
   */
  private fail(entry: WorkerEntry, err: Error): void {
    if (entry.retired || this.terminated) return;
    entry.retired = true;
    this.clearTimer(entry);
    entry.current?.reject(err);
    entry.current = undefined;
    void entry.worker.terminate();
    const replacement = this.spawn();
    this.workers[this.workers.indexOf(entry)] = replacement;
    this.processQueue(replacement);
  }

  private clearTimer(entry: WorkerEntry): void {
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    entry.timer = undefined;
  }

  private processQueue(entry: WorkerEntry): void {
    const next = this.queue.shift();
    if (next) this.dispatch(entry, next);
  }
}
