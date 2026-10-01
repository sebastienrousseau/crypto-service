/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Runs password hashing and key derivation off the event loop.
 *
 * crypto-lib's scrypt, PBKDF2 and Argon2 functions are synchronous: at the
 * work factors the API enforces, one call takes hundreds of milliseconds,
 * during which a request on the main thread would stall every other
 * request, `/health` included. The routes call the same crypto-lib
 * functions through crypto-lib's `WorkerPool` instead, so their semantics
 * and error messages are unchanged.
 */

import { WorkerPool } from "@sebastienrousseau/crypto-lib/dist/accel/worker-pool";

/**
 * Worker threads for KDF work. Each Argon2 or scrypt call can hold up to
 * 256 MiB, so the pool stays small; further requests queue.
 */
export const KDF_WORKER_THREADS = 2;

/** The crypto-lib modules whose functions the runner may call. */
const MODULES = {
  kdf: require.resolve("@sebastienrousseau/crypto-lib/dist/modern/kdf"),
  password:
    require.resolve("@sebastienrousseau/crypto-lib/dist/modern/password"),
  passwordEncrypt:
    require.resolve("@sebastienrousseau/crypto-lib/dist/high-level/password-encrypt"),
} as const;

/** A crypto-lib module the runner can call into. */
export type KdfModule = keyof typeof MODULES;

/**
 * Runs crypto-lib KDF functions on a worker pool, created on first use so
 * a server that never derives a key starts no threads.
 */
export class KdfRunner {
  private pool: WorkerPool | undefined;

  /**
   * Call `module.functionName(...args)` on a worker thread. Arguments and
   * the result are structured-cloned; a thrown error comes back as an
   * `Error` with the same message.
   */
  run<T>(module: KdfModule, functionName: string, ...args: unknown[]) {
    this.pool ??= new WorkerPool({ size: KDF_WORKER_THREADS });
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
    /** Off-event-loop KDF and password hashing (see `lib/kdf-runner.ts`). */
    kdf: KdfRunner;
  }
}
