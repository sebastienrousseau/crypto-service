/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Starting and stopping the server.
 *
 * {@link start} validates the configuration, listens, and installs
 * SIGTERM and SIGINT handlers that drain connections through
 * {@link gracefulShutdown}, forcing an exit when draining takes longer
 * than `SHUTDOWN_TIMEOUT_MS`.
 */

import type { EventEmitter } from "events";
import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";
import { loadConfig } from "../config/env";
import { init } from "../server";

/** How the server is stopped. */
export interface ShutdownOptions {
  /** Milliseconds to wait for connections to drain before exiting 1. */
  timeoutMs: number;
  /** Logger for shutdown progress. */
  log: Logger;
  /** Ends the process (`process.exit` outside tests). */
  exit: (code: number) => void;
  /** Runs after the server closes, before exiting (telemetry flush). */
  onClosed?: () => Promise<void>;
}

/**
 * The signal handler: closes the server once, however many signals
 * arrive, then exits 0, or 1 when closing fails or overruns the timeout.
 */
export function gracefulShutdown(
  server: FastifyInstance,
  options: ShutdownOptions,
): (signal: string) => Promise<void> {
  let started = false;
  return async (signal) => {
    if (started) return;
    started = true;
    const { log, exit, timeoutMs } = options;
    log.info({ signal }, "Shutting down gracefully");
    const forceTimer = setTimeout(() => {
      log.error(
        { shutdownTimeoutMs: timeoutMs },
        "Shutdown timed out; forcing exit",
      );
      exit(1);
    }, timeoutMs);
    forceTimer.unref();
    try {
      await server.close();
      await options.onClosed?.();
      log.info("All connections drained. Goodbye.");
      exit(0);
    } catch (err) {
      log.error({ err }, "Error during shutdown");
      exit(1);
    } finally {
      clearTimeout(forceTimer);
    }
  };
}

/** What {@link start} needs from its environment. */
export interface StartOptions extends Omit<ShutdownOptions, "timeoutMs"> {
  /** Environment to configure from. */
  env: NodeJS.ProcessEnv;
  /** Where SIGTERM and SIGINT arrive (`process` outside tests). */
  signals: EventEmitter;
}

/**
 * Validates the configuration, starts listening and installs the
 * shutdown handlers.
 *
 * @throws ConfigError for an invalid configuration, before listening.
 */
export async function start(options: StartOptions): Promise<FastifyInstance> {
  const config = loadConfig(options.env);
  const server = await init();
  await server.listen({ port: config.port, host: config.host });
  const base = `${config.protocol}://${config.host}:${server.addresses()[0]!.port}`;
  options.log.info(`Server listening on ${base}/`);
  options.log.info(`Swagger docs at ${base}/docs`);

  const shutdown = gracefulShutdown(server, {
    ...options,
    timeoutMs: config.shutdownTimeoutMs,
  });
  options.signals.on("SIGTERM", () => void shutdown("SIGTERM"));
  options.signals.on("SIGINT", () => void shutdown("SIGINT"));
  return server;
}
