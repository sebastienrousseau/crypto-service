/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { CryptoClient } from "../src/index";
import {
  generateSdkTraceparent,
  resolveTraceparentHeader,
  buildClientHeaders,
} from "../src/request";

describe("Crypto SDK Trace Context", () => {
  const sampleTraceparent =
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

  describe("generateSdkTraceparent", () => {
    it("should generate a valid W3C traceparent Level 1 string", () => {
      const tp = generateSdkTraceparent();
      expect(tp).to.match(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    it("should fallback cleanly when globalThis.crypto is undefined", () => {
      const originalCrypto = globalThis.crypto;
      try {
        // Temporarily redefine crypto
        Object.defineProperty(globalThis, "crypto", {
          value: undefined,
          configurable: true,
          writable: true,
        });
        const tp = generateSdkTraceparent();
        expect(tp).to.match(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
      } finally {
        Object.defineProperty(globalThis, "crypto", {
          value: originalCrypto,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe("resolveTraceparentHeader", () => {
    it("should return trimmed string when given valid string", () => {
      expect(resolveTraceparentHeader(`  ${sampleTraceparent}  `)).to.equal(
        sampleTraceparent,
      );
    });

    it("should return undefined for non-string or boolean inputs", () => {
      expect(resolveTraceparentHeader(true)).to.be.undefined;
      expect(resolveTraceparentHeader(false)).to.be.undefined;
      expect(resolveTraceparentHeader("")).to.be.undefined;
      expect(resolveTraceparentHeader(undefined)).to.be.undefined;
    });
  });

  describe("buildClientHeaders", () => {
    it("should configure static traceparent header when string is passed", () => {
      const headers = buildClientHeaders({
        baseUrl: "http://localhost:3000",
        traceparent: sampleTraceparent,
      });
      expect(headers["traceparent"]).to.equal(sampleTraceparent);
    });

    it("should omit traceparent header when traceparent is true (auto per request)", () => {
      const headers = buildClientHeaders({
        baseUrl: "http://localhost:3000",
        traceparent: true,
      });
      expect(headers["traceparent"]).to.be.undefined;
    });
  });

  describe("CryptoClient with traceparent", () => {
    it("should send static traceparent header on requests", async () => {
      let recordedHeaders: HeadersInit | undefined;
      const customFetch = async (
        _input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        recordedHeaders = init?.headers;
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch: customFetch as unknown as typeof globalThis.fetch,
        traceparent: sampleTraceparent,
      });

      await client.algorithms();
      expect(
        (recordedHeaders as Record<string, string>)["traceparent"],
      ).to.equal(sampleTraceparent);
    });

    it("should generate a unique traceparent header per request when traceparent is true", async () => {
      const recordedTraceparents: string[] = [];
      const customFetch = async (
        _input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const tp = (init?.headers as Record<string, string>)["traceparent"];
        if (tp) recordedTraceparents.push(tp);
        return new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const client = new CryptoClient({
        baseUrl: "http://localhost:3000",
        fetch: customFetch as unknown as typeof globalThis.fetch,
        traceparent: true,
      });

      await client.algorithms();
      await client.algorithms();

      expect(recordedTraceparents.length).to.equal(2);
      expect(recordedTraceparents[0]).to.match(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
      );
      expect(recordedTraceparents[1]).to.match(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
      );
      expect(recordedTraceparents[0]).to.not.equal(recordedTraceparents[1]);
    });
  });
});
