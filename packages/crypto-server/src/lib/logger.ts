/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Configures and exports a Winston logger for application logging.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import { createLogger, format, transports } from "winston";
import { v4 as uuidv4 } from "uuid";

// Generate a correlation ID for logging.
const correlationId = uuidv4();

/**
 * Configures and creates a Winston logger instance.
 *
 * - Log format: Correlation ID | Timestamp | Level: Message
 * - Logs are output to the console with coloured log levels.
 * - Timestamp format: YYYY-MM-DD HH:mm:ss
 * - Logging level: info (includes info, warn, error, and below)
 *
 * @example Log output: `123e4567-e89b-12d3-a456-426614174000 | 2023-10-09 08:07:06 | info: Application started`
 */
const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      level: "info",
      format: format.combine(
        format.colorize(),
        format.printf(
          (info) => `${correlationId} | ${info.timestamp} | ${info.level}: ${info.message}`,
        ),
      ),
    }),
  ],
});

export default logger;
