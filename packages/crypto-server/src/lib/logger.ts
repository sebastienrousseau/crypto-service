/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The server's one logger: pino, as Fastify uses for request logs,
 * so startup, shutdown and request lines share one JSON format. Its level
 * comes from `LOG_LEVEL` (default `info`), and fields that can carry
 * credentials or key material are redacted wherever they appear.
 */

import { randomUUID } from "crypto";
import { pino, type DestinationStream, type Logger } from "pino";

/**
 * Paths pino replaces with "[Redacted]": request credentials, and any
 * password, passphrase or key field at the top level or one level down.
 */
export const LOG_REDACT_PATHS: readonly string[] = [
  "req.headers.authorization",
  'req.headers["x-api-key"]',
  "req.headers.cookie",
  "headers.authorization",
  'headers["x-api-key"]',
  ...[
    "password",
    "passphrase",
    "privateKey",
    "secretKey",
    "secret",
    "token",
  ].flatMap((field) => [field, `*.${field}`]),
];

/** A logger at `LOG_LEVEL`, writing JSON to `destination` (stdout). */
export function createLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      level: process.env["LOG_LEVEL"] ?? "info",
      base: { service: "crypto-server" },
      redact: { paths: [...LOG_REDACT_PATHS] },
    },
    destination,
  );
}

/** Characters and length accepted from an incoming x-request-id. */
const REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * The request ID for a request: the client's `x-request-id` when it is
 * one well-formed value of at most 128 characters, else a fresh UUID, so
 * a caller cannot inject arbitrary text into logs and headers.
 */
export function requestIdFrom(header: string | string[] | undefined): string {
  return typeof header === "string" && REQUEST_ID.test(header)
    ? header
    : randomUUID();
}

/** The server's logger. */
const logger = createLogger();
export default logger;
