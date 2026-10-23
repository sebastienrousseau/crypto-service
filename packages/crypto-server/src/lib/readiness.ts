/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks What /ready checks.
 *
 * The server is ready while it accepts new work: not draining for
 * shutdown, and able to write keys when a key directory is configured.
 */

import type { FastifyInstance } from "fastify";

/** Lifecycle state shared by the server and its probes. */
export interface Lifecycle {
  /** True from the moment the server starts closing. */
  draining: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    /** Lifecycle state read by /ready. */
    lifecycle: Lifecycle;
  }
}

/** Decorates the app with its lifecycle and marks it draining on close. */
export function trackLifecycle(app: FastifyInstance): void {
  app.decorate("lifecycle", { draining: false });
  app.addHook("preClose", async () => {
    app.lifecycle.draining = true;
  });
}

/** The readiness checks, each true when it passes. */
export async function readinessChecks(
  app: FastifyInstance,
): Promise<Record<string, boolean>> {
  return {
    accepting: !app.lifecycle.draining,
    keyStore: await app.keyStore.writable(),
  };
}
