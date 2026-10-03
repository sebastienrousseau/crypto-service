/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import {
  isValidTraceparent,
  generateTraceparent,
  parseTraceparent,
  propagateTraceContext,
} from "../src/utils/trace";
import { init } from "../src/server";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

describe("W3C Trace Context Utilities", () => {
  const validTraceparent =
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

  describe("isValidTraceparent", () => {
    it("should accept a standard valid traceparent", () => {
      expect(isValidTraceparent(validTraceparent)).to.be.true;
    });

    it("should accept valid traceparent with unsampled flag 00", () => {
      const unsampled =
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00";
      expect(isValidTraceparent(unsampled)).to.be.true;
    });

    it("should reject non-string input", () => {
      expect(isValidTraceparent(null)).to.be.false;
      expect(isValidTraceparent(undefined)).to.be.false;
      expect(isValidTraceparent(12345)).to.be.false;
      expect(isValidTraceparent({})).to.be.false;
    });

    it("should reject invalid format or wrong delimiters", () => {
      expect(isValidTraceparent("invalid-traceparent")).to.be.false;
      expect(
        isValidTraceparent(
          "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        ),
      ).to.be.false;
      expect(
        isValidTraceparent(
          "00_4bf92f3577b34da6a3ce929d0e0e4736_00f067aa0ba902b7_01",
        ),
      ).to.be.false;
    });

    it("should reject all-zeros trace ID", () => {
      const allZerosTraceId =
        "00-00000000000000000000000000000000-00f067aa0ba902b7-01";
      expect(isValidTraceparent(allZerosTraceId)).to.be.false;
    });

    it("should reject all-zeros parent ID", () => {
      const allZerosParentId =
        "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01";
      expect(isValidTraceparent(allZerosParentId)).to.be.false;
    });
  });

  describe("parseTraceparent", () => {
    it("should parse valid traceparent into its components", () => {
      const parsed = parseTraceparent(validTraceparent);
      expect(parsed).to.not.be.null;
      expect(parsed?.version).to.equal("00");
      expect(parsed?.traceId).to.equal("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(parsed?.parentId).to.equal("00f067aa0ba902b7");
      expect(parsed?.flags).to.equal("01");
    });

    it("should return null for invalid traceparent", () => {
      expect(parseTraceparent("invalid")).to.be.null;
    });
  });

  describe("generateTraceparent", () => {
    it("should generate a compliant traceparent with sampled flag by default", () => {
      const generated = generateTraceparent();
      expect(isValidTraceparent(generated)).to.be.true;
      const parsed = parseTraceparent(generated);
      expect(parsed?.flags).to.equal("01");
    });

    it("should generate unsampled traceparent when sampled is false", () => {
      const generated = generateTraceparent(false);
      expect(isValidTraceparent(generated)).to.be.true;
      const parsed = parseTraceparent(generated);
      expect(parsed?.flags).to.equal("00");
    });
  });

  describe("propagateTraceContext unit helper", () => {
    it("should honor and propagate valid incoming traceparent and tracestate", () => {
      const headers: Record<string, string> = {
        traceparent: validTraceparent,
        tracestate: "congo=t61rcWkgMzE,rojo=00f067aa0ba902b7",
      };
      const responseHeaders: Record<string, string> = {};
      const fakeReq = { headers } as unknown as FastifyRequest;
      const fakeReply = {
        header: (name: string, val: string) => {
          responseHeaders[name] = val;
        },
      } as unknown as FastifyReply;

      propagateTraceContext(fakeReq, fakeReply);
      expect(responseHeaders["traceparent"]).to.equal(validTraceparent);
      expect(responseHeaders["tracestate"]).to.equal(
        "congo=t61rcWkgMzE,rojo=00f067aa0ba902b7",
      );
      expect((fakeReq as unknown as { traceId: string }).traceId).to.equal(
        "4bf92f3577b34da6a3ce929d0e0e4736",
      );
    });

    it("should generate traceparent when incoming is missing or invalid", () => {
      const headers: Record<string, string> = {};
      const responseHeaders: Record<string, string> = {};
      const fakeReq = { headers } as unknown as FastifyRequest;
      const fakeReply = {
        header: (name: string, val: string) => {
          responseHeaders[name] = val;
        },
      } as unknown as FastifyReply;

      propagateTraceContext(fakeReq, fakeReply);
      expect(responseHeaders["traceparent"]).to.exist;
      expect(isValidTraceparent(responseHeaders["traceparent"]!)).to.be.true;
      expect(responseHeaders["tracestate"]).to.be.undefined;
    });
  });

  describe("Fastify server integration", () => {
    let app: FastifyInstance;

    before(async () => {
      app = await init();
    });

    after(async () => {
      await app.close();
    });

    it("should propagate provided traceparent and tracestate on response", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: {
          traceparent: validTraceparent,
          tracestate: "vendor=abc123xyz",
        },
      });
      expect(res.statusCode).to.equal(200);
      expect(res.headers["traceparent"]).to.equal(validTraceparent);
      expect(res.headers["tracestate"]).to.equal("vendor=abc123xyz");
      expect(res.headers["x-request-id"]).to.exist;
    });

    it("should generate and return traceparent when request does not provide one", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });
      expect(res.statusCode).to.equal(200);
      const traceparent = res.headers["traceparent"] as string;
      expect(traceparent).to.exist;
      expect(isValidTraceparent(traceparent)).to.be.true;
    });
  });
});
