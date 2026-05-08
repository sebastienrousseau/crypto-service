/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Centralized, validated configuration.
 *
 * All environment variables are parsed and validated at boot time.
 * If any required value is missing or malformed, the process exits
 * immediately with a clear error message — fail fast, not at runtime.
 */

/** Server configuration loaded from environment variables. */
export interface Config {
  /** Hostname the server binds to (default `"localhost"`). */
  readonly host: string;
  /** TCP port the server listens on (0–65535, default `3000`). */
  readonly port: number;
  /** HTTP or HTTPS protocol. */
  readonly protocol: "http" | "https";
  /** Current Node environment. */
  readonly nodeEnv: "development" | "production" | "test";
  /** Minimum log verbosity level. */
  readonly logLevel: "error" | "warn" | "info" | "debug";
  /** Optional static API key for service-to-service auth. */
  readonly apiKey: string | undefined;
  /** Allowed CORS origins, or `false` to disable CORS. */
  readonly corsOrigins: string[] | false;
  /** Trusted reverse-proxy CIDRs, or `false` to trust none. */
  readonly trustProxy: string[] | false;
  /** Optional directory path for reading crypto keys. */
  readonly keyDir: string | undefined;
  /** Optional directory path for writing generated keys. */
  readonly keyOutDir: string | undefined;
  /** Graceful shutdown timeout in milliseconds. */
  readonly shutdownTimeoutMs: number;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function parsePort(val: string): number {
  const port = parseInt(val, 10);
  if (!Number.isFinite(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${val} (must be 0–65535)`);
  }
  return port;
}

function parseCsvList(val: string | undefined): string[] | false {
  if (!val) return false;
  const entries = val
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return entries.length > 0 ? entries : false;
}

/**
 * Loads and validates all configuration from environment variables.
 * Call once at startup — the returned object is frozen and immutable.
 */
export function loadConfig(): Config {
  const errors: string[] = [];

  const host = optional("HOST", "localhost");
  const portStr = optional("PORT", "3000");
  const protocol = optional("PROTOCOL", "http") as Config["protocol"];
  const nodeEnv = optional("NODE_ENV", "development") as Config["nodeEnv"];
  const logLevel = optional("LOG_LEVEL", "info") as Config["logLevel"];

  if (!["http", "https"].includes(protocol)) {
    errors.push(`PROTOCOL must be "http" or "https", got "${protocol}"`);
  }
  if (!["development", "production", "test"].includes(nodeEnv)) {
    errors.push(
      `NODE_ENV must be "development", "production", or "test", got "${nodeEnv}"`,
    );
  }
  if (!["error", "warn", "info", "debug"].includes(logLevel)) {
    errors.push(
      `LOG_LEVEL must be one of error|warn|info|debug, got "${logLevel}"`,
    );
  }

  let port = 3000;
  try {
    port = parsePort(portStr);
  } catch (e) {
    errors.push((e as Error).message);
  }

  if (errors.length > 0) {
    const msg = [
      "Configuration validation failed:",
      ...errors.map((e) => `  - ${e}`),
    ].join("\n");
    console.error(msg);
    process.exit(1);
  }

  return Object.freeze({
    host,
    port,
    protocol,
    nodeEnv,
    logLevel,
    apiKey: process.env["CRYPTO_API_KEY"] || undefined,
    corsOrigins: parseCsvList(process.env["CORS_ORIGIN"]),
    trustProxy: parseCsvList(process.env["TRUSTED_PROXY_CIDRS"]),
    keyDir: process.env["CRYPTO_KEY_DIR"] || undefined,
    keyOutDir: process.env["CRYPTO_KEY_OUT_DIR"] || undefined,
    shutdownTimeoutMs: parseInt(optional("SHUTDOWN_TIMEOUT_MS", "30000"), 10),
  });
}

/**
 * Singleton config instance. Loaded once at module import time.
 */
export const config: Config = loadConfig();
