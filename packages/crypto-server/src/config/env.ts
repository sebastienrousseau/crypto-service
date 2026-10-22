/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Centralized, validated configuration.
 *
 * All environment variables are parsed and validated at boot time. If
 * any value is missing or malformed, loadConfig throws a ConfigError
 * listing every problem, and the server does not start.
 */

import { authConfigError } from "./auth-policy";
import { resolveRateLimitMax } from "./constants";
import { flagSetting, integerSetting } from "./settings";
import { kmsConfigError } from "../lib/kms-providers";
import { keyStoreConfigError } from "../lib/key-store";

/** Invalid configuration; the message lists every problem found. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

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
  /** Requests per client per minute. */
  readonly rateLimitMax: number;
  /** Whether /docs serves the API documentation (`DOCS_ENABLED`). */
  readonly docsEnabled: boolean;
  /** Whether the deprecated v1 routes are served (`V1_ENABLED`). */
  readonly v1Enabled: boolean;
}

/** Whether /docs serves the API documentation: `DOCS_ENABLED`, default on. */
export function docsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return flagSetting(env, "DOCS_ENABLED", true);
}

/** Whether the deprecated v1 routes are served: `V1_ENABLED`, default on. */
export function v1Enabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return flagSetting(env, "V1_ENABLED", true);
}

/** Runs a parser, recording its error and returning `fallback` on failure. */
function attempt<T>(errors: string[], fallback: T, parse: () => T): T {
  try {
    return parse();
  } catch (e) {
    errors.push((e as Error).message);
    return fallback;
  }
}

/** Parse a comma-separated string into a trimmed array, or false if empty. */
function parseCsvList(val: string | undefined): string[] | false {
  if (!val) return false;
  const entries = val
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return entries.length > 0 ? entries : false;
}

/** Errors for PROTOCOL, NODE_ENV and LOG_LEVEL values out of range. */
function enumErrors(
  protocol: string,
  nodeEnv: string,
  logLevel: string,
): string[] {
  const errors: string[] = [];
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
  return errors;
}

/** Numeric and on/off settings, each recorded in `errors` when invalid. */
function checkedSettings(env: NodeJS.ProcessEnv, errors: string[]) {
  return {
    port: attempt(errors, 3000, () =>
      integerSetting(env, "PORT", 3000, 0, 65535),
    ),
    shutdownTimeoutMs: attempt(errors, 30000, () =>
      integerSetting(env, "SHUTDOWN_TIMEOUT_MS", 30000, 1),
    ),
    rateLimitMax: attempt(errors, 0, () => resolveRateLimitMax(env)),
    docsEnabled: attempt(errors, true, () => docsEnabled(env)),
    v1Enabled: attempt(errors, true, () => v1Enabled(env)),
  };
}

/** Settings that need no validation: credentials, paths and lists. */
function openSettings(env: NodeJS.ProcessEnv) {
  return {
    host: env["HOST"] ?? "localhost",
    apiKey: env["CRYPTO_API_KEY"] || undefined,
    corsOrigins: parseCsvList(env["CORS_ORIGIN"]),
    trustProxy: parseCsvList(env["TRUSTED_PROXY_CIDRS"]),
    keyDir: env["CRYPTO_KEY_DIR"] || undefined,
    keyOutDir: env["CRYPTO_KEY_OUT_DIR"] || undefined,
  };
}

/**
 * Loads and validates all configuration from the environment. The
 * returned object is frozen.
 *
 * @throws ConfigError listing every invalid setting.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const protocol = (env["PROTOCOL"] ?? "http") as Config["protocol"];
  const nodeEnv = (env["NODE_ENV"] ?? "development") as Config["nodeEnv"];
  const logLevel = (env["LOG_LEVEL"] ?? "info") as Config["logLevel"];

  const errors = enumErrors(protocol, nodeEnv, logLevel);
  for (const check of [authConfigError, kmsConfigError, keyStoreConfigError]) {
    const error = check(env);
    if (error) errors.push(error);
  }
  const checked = checkedSettings(env, errors);
  if (errors.length > 0) {
    throw new ConfigError(
      [
        "Configuration validation failed:",
        ...errors.map((e) => `  - ${e}`),
      ].join("\n"),
    );
  }

  return Object.freeze({
    ...openSettings(env),
    protocol,
    nodeEnv,
    logLevel,
    ...checked,
  });
}
