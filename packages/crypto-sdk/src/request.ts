/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { CryptoApiError, readProblem } from "./errors";

/** Internal normalized retry configuration. */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
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
