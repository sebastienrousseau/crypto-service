/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { CryptoApiError, readProblem } from "./errors";
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

/** Computes the backoff delay in milliseconds. */
export function computeBackoffDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterHeader?: string | null,
): number {
  if (retryAfterHeader) {
    const parsed = Number(retryAfterHeader);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(parsed * 1000, config.maxDelayMs);
    }
  }
  return Math.min(
    config.initialDelayMs * 2 ** (attempt - 1),
    config.maxDelayMs,
  );
}

/** Builds the RequestInit object with headers, body, and timeout signal. */
export function buildRequestInit(
  method: string,
  headers: Record<string, string>,
  body?: unknown,
  timeout?: number,
): RequestInit {
  const init: RequestInit = { method, headers };
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

/** Executes an HTTP request with exponential backoff on transient errors. */
export async function executeRequest<T>(
  fetchFn: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  retry: RetryConfig,
): Promise<T> {
  const maxAttempts = 1 + retry.maxRetries;
  let attempt = 0;

  while (true) {
    let res: Response;
    try {
      res = await fetchFn(url, init);
    } catch (err) {
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise((r) =>
          setTimeout(r, computeBackoffDelay(attempt, retry)),
        );
        continue;
      }
      throw err;
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    attempt++;
    if (isTransientStatus(res.status) && attempt < maxAttempts) {
      const header = res.headers?.get?.("retry-after");
      await new Promise((r) =>
        setTimeout(r, computeBackoffDelay(attempt, retry, header)),
      );
      continue;
    }

    throw new CryptoApiError(res.status, await readProblem(res));
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
