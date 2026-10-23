/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Runs CPU-heavy crypto-lib calls off the event loop.
 * crypto-lib's scrypt, PBKDF2 and Argon2 functions, and ML-DSA and SLH-DSA
 * key generation and signing, are synchronous: one call takes from tens of
 * milliseconds (ML-DSA) to seconds (SLH-DSA "s" variants), during which a
 * request on the main thread would stall every other request, `/health`
 * included. Routes call the same crypto-lib functions on a bounded worker
 * pool instead, so their results and error messages are unchanged.
 *
 * A pool rejects work it cannot queue (WorkerPoolBusyError) and work that
 * overruns its deadline (WorkerTaskTimeoutError); the server answers both
 * with 503. A worker that dies is replaced.
 */

import { availableParallelism } from "node:os";
import { WorkerPool } from "@sebastienrousseau/crypto-lib/accel";

/** Size and limits of one pool. */
export interface WorkerLimits {
  /** Worker threads. */
  readonly threads: number;
  /** Tasks that may wait for a free thread; more are refused. */
  readonly maxQueue: number;
  /** Milliseconds one task may run before it fails. */
  readonly taskTimeoutMs: number;
}

/**
 * KDF and password hashing: each Argon2 or scrypt call can hold up to
 * 256 MiB, so the pool stays small.
 */
export const KDF_LIMITS: WorkerLimits = Object.freeze({
  threads: 2,
  maxQueue: 32,
  taskTimeoutMs: 60_000,
});

/**
 * Post-quantum key generation and signing: CPU-bound and small in memory,
 * so up to four threads, leaving one core for the event loop.
 */
export const SIGNING_LIMITS: WorkerLimits = Object.freeze({
  threads: Math.max(1, Math.min(4, availableParallelism() - 1)),
  maxQueue: 64,
  taskTimeoutMs: 60_000,
});

/**
 * The crypto-lib entry points whose functions a pool may call, resolved
 * to files through the package's exports map: `modern` has the KDF,
 * password, ML-DSA and SLH-DSA functions; `highLevel` has
 * `passwordEncrypt` and `passwordDecrypt`; `keys` has `generateKeyPair`.
 */
export const MODULES = {
  modern: require.resolve("@sebastienrousseau/crypto-lib/modern"),
  highLevel: require.resolve("@sebastienrousseau/crypto-lib/high-level"),
  keys: require.resolve("@sebastienrousseau/crypto-lib/keys"),
} as const;

/** A crypto-lib module a pool can call into. */
export type WorkerModule = keyof typeof MODULES;

/**
 * Runs crypto-lib functions on a worker pool, created on first use so a
 * server that never needs one starts no threads.
 */
export class CryptoWorkers {
  private pool: WorkerPool | undefined;

  constructor(private readonly limits: WorkerLimits) {}

  /**
   * Call `module.functionName(...args)` on a worker thread. Arguments and
   * the result are structured-cloned; a thrown error comes back as an
   * `Error` with the same message.
   */
  run<T>(module: WorkerModule, functionName: string, ...args: unknown[]) {
    this.pool ??= new WorkerPool({
      size: this.limits.threads,
      maxQueue: this.limits.maxQueue,
      taskTimeoutMs: this.limits.taskTimeoutMs,
    });
    return this.pool.execute<T>({
      modulePath: MODULES[module],
      functionName,
      args,
    });
  }

  /** Stop the worker threads, if any were started. */
  async close(): Promise<void> {
    const pool = this.pool;
    this.pool = undefined;
    await pool?.shutdown();
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** Off-event-loop KDF and password hashing. */
    kdf: CryptoWorkers;
    /** Off-event-loop ML-DSA and SLH-DSA key generation and signing. */
    signer: CryptoWorkers;
  }
}
