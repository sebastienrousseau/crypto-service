/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { ApiError } from "./types";

/**
 * Error thrown when the Crypto API returns a non-OK HTTP response. Its
 * `body` is the RFC 9457 problem the server sent.
 *
 * @example
 * ```ts
 * try {
 *   await client.sign({ keyId: 'k_unknown0000000000000000', message: 'x' });
 * } catch (err) {
 *   if (err instanceof CryptoApiError) {
 *     console.error(err.status, err.body.type, err.body.detail);
 *   }
 * }
 * ```
 */
export class CryptoApiError extends Error {
  /** HTTP status code returned by the API. */
  public readonly status: number;
  /** Parsed problem details body. */
  public readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(`API Error ${status}: ${body.detail}`);
    this.name = "CryptoApiError";
    this.status = status;
    this.body = body;
  }
}

/** Whether a parsed body looks like an RFC 9457 problem with a `detail`. */
function isProblem(body: unknown): body is ApiError {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { detail?: unknown }).detail === "string"
  );
}

/**
 * The problem body of a failed response. A body that is not JSON or not a
 * problem (for example an HTML page from a proxy) becomes an `about:blank`
 * problem for the status code, so `CryptoApiError.body` always has the
 * problem shape.
 */
export async function readProblem(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => undefined);
  if (isProblem(body)) return body;
  return {
    type: "about:blank",
    title: res.statusText || "HTTP error",
    status: res.status,
    detail: `The server answered ${res.status} without a problem body`,
  };
}
