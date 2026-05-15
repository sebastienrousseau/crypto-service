/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Configures and exports a Winston logger for application logging.
 *
 * Outputs structured JSON in production for machine parsing (ELK, Datadog,
 * etc.) and human-readable coloured text in development.
 */

import { createLogger, format, transports } from "winston";
import { v4 as uuidv4 } from "uuid";

/** Unique correlation ID for the lifetime of this server process. */
const correlationId = uuidv4();
/** Whether the server is running in production mode. */
const isProduction = process.env["NODE_ENV"] === "production";

/** JSON log format for production environments (machine-parseable). */
const structuredFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  format.errors({ stack: true }),
  format.json(),
);

/** Colorized human-readable log format for development. */
const devFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.colorize(),
  format.printf(
    (info) =>
      `${correlationId} | ${info.timestamp} | ${info.level}: ${info.message}`,
  ),
);

/** Pre-configured Winston logger instance for the crypto-server. */
const logger = createLogger({
  defaultMeta: { service: "crypto-server", correlationId },
  format: isProduction ? structuredFormat : devFormat,
  transports: [
    new transports.Console({
      level: process.env["LOG_LEVEL"] ?? "info",
    }),
  ],
});

/** Default export of the pre-configured Winston logger instance. */
export default logger;
