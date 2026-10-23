/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { CryptoClient, CryptoApiError, CryptoTransportError } from "../src";
import { computeBackoffDelay, isIdempotentRequest } from "../src/request";

// With retries enabled, the client retried every request after a network
// error or a 504, including requests that create server state (a key
// generation may have succeeded before the connection dropped), shared
// one timeout signal across all attempts, ignored a Retry-After longer
// than its cap, and followed redirects with the API key attached.

const ok = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
const status = (code: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ title: "x", status: code }), {
    status: code,
    headers: { "content-type": "application/problem+json", ...headers },
  });

function client(responses: Array<() => Response | Promise<Response>>) {
  const calls: RequestInit[] = [];
  const fetchFn = (async (_url: unknown, init?: RequestInit) => {
    calls.push(init ?? {});
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    return next();
  }) as typeof globalThis.fetch;
  return {
    calls,
    sdk: new CryptoClient({
      baseUrl: "http://server",
      apiKey: "k",
      timeout: 1000,
      fetch: fetchFn,
      retry: { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 50 },
    }),
  };
}

const dropped = () => {
  throw new TypeError("socket hang up");
};

async function rejection(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected a rejection");
}

describe("SDK retry safety", () => {
  it("classifies state-creating requests as not idempotent", () => {
    expect(isIdempotentRequest("POST", "/v2/hash")).to.equal(true);
    expect(isIdempotentRequest("GET", "/v2/algorithms")).to.equal(true);
    for (const path of [
      "/v2/keys/generate",
      "/v2/keys/delete",
      "/v2/pq/keygen",
      "/v2/pq/hybrid/keygen",
      "/v2/pq/dsa/keygen",
      "/v2/pq/slh-dsa/keygen",
      "/v2/hpke/keygen",
      "/v2/kms/create-key",
      "/v2/opaque/register/finish",
    ]) {
      expect(isIdempotentRequest("POST", path), path).to.equal(false);
    }
  });

  it("does not retry a key generation after a dropped connection", async () => {
    const { sdk, calls } = client([dropped, () => ok({ keyId: "k_2" })]);
    const err = await rejection(sdk.generateKeyPair({ algorithm: "ed25519" }));
    expect(err).to.be.instanceOf(CryptoTransportError);
    expect((err as CryptoTransportError).cause).to.be.instanceOf(TypeError);
    expect(calls).to.have.length(1);
  });

  it("does not retry a key generation after a 504", async () => {
    const { sdk, calls } = client([
      () => status(504),
      () => ok({ keyId: "k_2" }),
    ]);
    const err = await rejection(sdk.generateKeyPair({ algorithm: "ed25519" }));
    expect((err as CryptoApiError).status).to.equal(504);
    expect(calls).to.have.length(1);
  });

  it("retries a key generation the server refused with 503 or 429", async () => {
    const { sdk, calls } = client([
      () => status(503),
      () => status(429),
      () => ok({ keyId: "k_1" }),
    ]);
    const res = await sdk.generateKeyPair({ algorithm: "ed25519" });
    expect((res.data as { keyId: string }).keyId).to.equal("k_1");
    expect(calls).to.have.length(3);
  });

  it("retries an idempotent request after a dropped connection", async () => {
    const { sdk, calls } = client([dropped, () => ok({ digest: "d" })]);
    const res = await sdk.hash({ algorithm: "sha256", data: "x" });
    expect((res.data as { digest: string }).digest).to.equal("d");
    expect(calls).to.have.length(2);
  });

  it("reports a timeout as a timed-out transport error", async () => {
    const timeout = () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    };
    const { sdk } = client([timeout, timeout, timeout, timeout]);
    const err = await rejection(sdk.hash({ algorithm: "sha256", data: "x" }));
    expect(err).to.be.instanceOf(CryptoTransportError);
    expect((err as CryptoTransportError).timedOut).to.equal(true);
    expect(err.message).to.equal("Request timed out");
  });

  it("wraps a rejection that is not an Error", async () => {
    const odd = () => Promise.reject(null);
    const { sdk } = client([odd, odd, odd, odd]);
    const err = await rejection(sdk.hash({ algorithm: "sha256", data: "x" }));
    expect(err).to.be.instanceOf(CryptoTransportError);
    expect((err as CryptoTransportError).timedOut).to.equal(false);
  });

  it("gives each attempt its own timeout signal", async () => {
    const { sdk, calls } = client([dropped, () => ok({ digest: "d" })]);
    await sdk.hash({ algorithm: "sha256", data: "x" });
    expect(calls[0]!.signal).to.be.instanceOf(AbortSignal);
    expect(calls[1]!.signal).to.not.equal(calls[0]!.signal);
  });

  it("does not follow redirects with credentials attached", async () => {
    const { sdk, calls } = client([() => ok({ digest: "d" })]);
    await sdk.hash({ algorithm: "sha256", data: "x" });
    expect(calls[0]!.redirect).to.equal("error");
  });

  it("stops retrying when Retry-After exceeds the delay limit", async () => {
    const { sdk, calls } = client([
      () => status(429, { "retry-after": "60" }),
      () => ok({ digest: "d" }),
    ]);
    const err = await rejection(sdk.hash({ algorithm: "sha256", data: "x" }));
    expect((err as CryptoApiError).status).to.equal(429);
    expect(calls).to.have.length(1);
  });

  describe("computeBackoffDelay", () => {
    const config = { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 1000 };

    it("honours Retry-After in seconds or as an HTTP date", () => {
      expect(computeBackoffDelay(1, config, "0.5")).to.equal(500);
      const soon = new Date(Date.now() + 800).toUTCString();
      const delay = computeBackoffDelay(1, config, soon) as number;
      expect(delay).to.be.within(0, 1000);
    });

    it("returns undefined for a Retry-After beyond maxDelayMs", () => {
      expect(computeBackoffDelay(1, config, "5")).to.equal(undefined);
    });

    it("jitters the exponential backoff below its cap", () => {
      for (let attempt = 1; attempt <= 6; attempt++) {
        const d = computeBackoffDelay(attempt, config) as number;
        expect(d).to.be.within(0, Math.min(1000, 100 * 2 ** (attempt - 1)));
      }
    });
  });
});
