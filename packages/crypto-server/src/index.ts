/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Entrypoint for initializing and starting the Crypto Server.
 *
 * Handles startup, signal-based graceful shutdown, and force-exit timeout.
 */

import { initTelemetry, shutdownTelemetry } from "./lib/telemetry";

// Initialize OTel BEFORE other imports to ensure auto-instrumentation hooks.
initTelemetry();

import { config } from "./config/env";
import { init } from "./server";
import logger from "./lib/logger";

const main = async (): Promise<void> => {
  const server = await init();
  await server.ready();

  await server.listen({ port: config.port, host: config.host });
  logger.info(
    `Server listening on ${config.protocol}://${config.host}:${config.port}/`,
  );
  logger.info(
    `Swagger docs at ${config.protocol}://${config.host}:${config.port}/docs`,
  );

  // --- Graceful Shutdown ---------------------------------------------------

  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal} — shutting down gracefully...`);

    // Force exit after timeout to prevent hanging
    const forceTimer = setTimeout(() => {
      logger.error(
        `Shutdown timed out after ${config.shutdownTimeoutMs}ms — forcing exit`,
      );
      process.exit(1);
    }, config.shutdownTimeoutMs);
    forceTimer.unref();

    try {
      await server.close();
      await shutdownTelemetry();
      logger.info("All connections drained. Goodbye.");
      process.exit(0);
    } catch (err) {
      logger.error(
        "Error during shutdown",
        err instanceof Error ? err : undefined,
      );
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

main().catch((err) => {
  logger.error(
    `Server failed to start: ${err instanceof Error ? err.message : "Unknown error"}`,
  );
  process.exit(1);
});
