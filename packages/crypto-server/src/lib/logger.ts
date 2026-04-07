/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { createLogger, format, transports } from "winston";
import { randomUUID } from "node:crypto";

// Generate a correlation ID for logging.
const correlationId = randomUUID();

const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      level: process.env.LOG_LEVEL ?? "info",
      format: format.combine(
        format.colorize(),
        format.printf(
          (info) =>
            `${correlationId} | ${info.timestamp} | ${info.level}: ${info.message}`,
        ),
      ),
    }),
  ],
});

export default logger;
