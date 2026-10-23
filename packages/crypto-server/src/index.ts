#!/usr/bin/env node
/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Entrypoint for initializing and starting the Crypto Server.
 *
 * Startup and graceful shutdown live in lib/lifecycle.ts.
 */

import { initTelemetry, shutdownTelemetry } from "./lib/telemetry";

// Initialize OTel BEFORE other imports to ensure auto-instrumentation hooks.
initTelemetry();

import logger from "./lib/logger";
import { start } from "./lib/lifecycle";

start({
  env: process.env,
  log: logger,
  exit: (code) => process.exit(code),
  onClosed: shutdownTelemetry,
  signals: process,
}).catch((err: unknown) => {
  logger.error({ err }, "Server failed to start");
  process.exit(1);
});
