/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Configures and exports a Winston logger for application logging.
 *
 * Outputs structured JSON in production for machine parsing (ELK, Datadog,
 * etc.) and human-readable coloured text in development.
 */

import { createLogger, format, transports } from "winston";
import { v4 as uuidv4 } from "uuid";

const correlationId = uuidv4();
const isProduction = process.env["NODE_ENV"] === "production";

const structuredFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  format.errors({ stack: true }),
  format.json(),
);

const devFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.colorize(),
  format.printf(
    (info) =>
      `${correlationId} | ${info.timestamp} | ${info.level}: ${info.message}`,
  ),
);

const logger = createLogger({
  defaultMeta: { service: "crypto-server", correlationId },
  format: isProduction ? structuredFormat : devFormat,
  transports: [
    new transports.Console({
      level: process.env["LOG_LEVEL"] ?? "info",
    }),
  ],
});

export default logger;
