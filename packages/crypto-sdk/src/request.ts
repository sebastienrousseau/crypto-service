/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { CryptoApiError, CryptoTransportError, readProblem } from "./errors";
import type { ClientOptions, RetryOptions } from "./types";

/** Internal normalized retry configuration. */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/** Resolves normalized retry options. */
export function resolveRetryConfig(retry?: RetryOptions): RetryConfig {
  return {
    maxRetries: Math.max(0, retry?.maxRetries ?? 0),
    initialDelayMs: Math.max(0, retry?.initialDelayMs ?? 200),
    maxDelayMs: Math.max(0, retry?.maxDelayMs ?? 2000),
  };
}

/** Builds initial base headers for the client. */
export function buildClientHeaders(
  options: ClientOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.apiKey) headers["x-api-key"] = options.apiKey;
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  if (
    typeof options.traceparent === "string" &&
    options.traceparent.trim().length > 0
  ) {
    headers["traceparent"] = options.traceparent.trim();
  }
  return headers;
}

/** Determines whether an HTTP status code is transient. */
export function isTransientStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504;
}

/**
 * Routes that create or delete server state. After a dropped connection
 * or a 504 the server may already have done the work, so these are only
 * retried when the server certainly did not (429, 503).
 */
const STATEFUL_ROUTE =
  /\/(keygen|keys\/generate|keys\/delete|kms\/create-key|opaque\/register\/)/;

/** Whether repeating `method path` cannot create or delete anything twice. */
export function isIdempotentRequest(method: string, path: string): boolean {
  return method === "GET" || !STATEFUL_ROUTE.test(path);
}

/** Milliseconds a Retry-After header asks for (seconds or HTTP date). */
function retryAfterMs(header: string): number | undefined {
  const seconds = Number(header);
  if (header.trim() !== "" && Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/**
 * Milliseconds to wait before attempt `attempt + 1`: the server's
 * Retry-After when it gives one, else exponential backoff with full
 * jitter. Undefined when Retry-After asks for longer than `maxDelayMs`,
 * meaning: do not retry.
 */
export function computeBackoffDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterHeader?: string | null,
): number | undefined {
  const asked = retryAfterHeader ? retryAfterMs(retryAfterHeader) : undefined;
  if (asked !== undefined) {
    return asked <= config.maxDelayMs ? asked : undefined;
  }
  const cap = Math.min(
    config.initialDelayMs * 2 ** (attempt - 1),
    config.maxDelayMs,
  );
  return Math.random() * cap;
}

/** Builds the RequestInit object with headers, body, and timeout signal. */
export function buildRequestInit(
  method: string,
  headers: Record<string, string>,
  body?: unknown,
  timeout?: number,
): RequestInit {
  // A redirect would carry the API key or token to whatever origin the
  // Location names; an API never needs one.
  const init: RequestInit = { method, headers, redirect: "error" };
  if (body) {
    init.body = JSON.stringify(body);
  }
  if (
    timeout !== undefined &&
    timeout > 0 &&
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    init.signal = AbortSignal.timeout(timeout);
  }
  return init;
}

/** The error for a request that got no response. */
function transportError(err: unknown): CryptoTransportError {
  const name = (err as { name?: string } | null)?.name;
  const timedOut = name === "TimeoutError" || name === "AbortError";
  return new CryptoTransportError(
    timedOut ? "Request timed out" : "Network error",
    err,
    timedOut,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Where a request is in its retry budget. */
interface Attempt {
  /** This attempt's number, from 1. */
  n: number;
  /** Attempts allowed in all. */
  max: number;
  retry: RetryConfig;
  idempotent: boolean;
}

/** Delay before retrying after no response arrived, or undefined. */
function delayAfterError(a: Attempt): number | undefined {
  if (!a.idempotent || a.n >= a.max) return undefined;
  return computeBackoffDelay(a.n, a.retry);
}

/** Delay before retrying after an error response, or undefined. */
function delayAfterResponse(res: Response, a: Attempt): number | undefined {
  if (a.n >= a.max || !isTransientStatus(res.status)) return undefined;
  // A 504 may have been processed upstream; a 429 or 503 was not.
  if (!a.idempotent && res.status === 504) return undefined;
  return computeBackoffDelay(a.n, a.retry, res.headers?.get?.("retry-after"));
}

/**
 * Executes an HTTP request, retrying transient failures with backoff.
 * `makeInit` is called per attempt, so each gets its own timeout. A
 * request that is not idempotent is retried only after 429 or 503, when
 * the server did not process it; never after a lost connection or 504.
 */
export async function executeRequest<T>(
  fetchFn: typeof globalThis.fetch,
  url: string,
  makeInit: () => RequestInit,
  retry: RetryConfig,
  idempotent = true,
): Promise<T> {
  let n = 0;
  while (true) {
    n++;
    const attempt: Attempt = {
      n,
      max: 1 + retry.maxRetries,
      retry,
      idempotent,
    };
    let res: Response;
    try {
      res = await fetchFn(url, makeInit());
    } catch (err) {
      const delay = delayAfterError(attempt);
      if (delay === undefined) throw transportError(err);
      await sleep(delay);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    const delay = delayAfterResponse(res, attempt);
    if (delay === undefined) {
      throw new CryptoApiError(res.status, await readProblem(res));
    }
    await sleep(delay);
  }
}

/** Generates a compliant W3C traceparent Level 1 header. */
export function generateSdkTraceparent(): string {
  const bytes = new Uint8Array(24);
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 24; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[0] = ((bytes[0] as number) % 255) + 1;
  bytes[16] = ((bytes[16] as number) % 255) + 1;

  let hex = "";
  for (let i = 0; i < 24; i++) {
    hex += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return `00-${hex.slice(0, 32)}-${hex.slice(32, 48)}-01`;
}

/** Resolves static traceparent header value from string configuration. */
export function resolveTraceparentHeader(
  traceparent?: string | boolean,
): string | undefined {
  if (typeof traceparent === "string" && traceparent.trim().length > 0) {
    return traceparent.trim();
  }
  return undefined;
}
