/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The OpenAPI document: security derived from the route policy,
 * operationIds, and a documented response for every status a route can
 * answer.
 */

import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import {
  documentRoute,
  operationId,
  operationSecurity,
  withEncodings,
} from "../src/config/openapi";
import { isPublicRoute, routeRequirement } from "../src/config/auth-policy";
import { HEX_PATTERN } from "../src/utils/response-schemas";
import { withEnv } from "./support/auth";

type Operation = {
  operationId: string;
  security: Array<Record<string, string[]>>;
  "x-required-scopes"?: string[];
  responses: Record<
    string,
    { description: string; content?: Record<string, unknown> }
  >;
};

describe("OpenAPI document", function () {
  this.timeout(30000);

  describe("operationSecurity", () => {
    it("needs no credential on a public route", () => {
      for (const [method, url] of [
        ["GET", "/health"],
        ["GET", "/metrics"],
        ["POST", "/v2/opaque/login/init"],
        ["GET", "/docs/json"],
      ] as const) {
        expect(operationSecurity(method, url), url).to.deep.equal({
          security: [],
        });
      }
    });

    it("takes either credential and no scope on an authenticated route", () => {
      expect(operationSecurity("GET", "/v2/algorithms")).to.deep.equal({
        security: [{ apiKey: [] }, { bearerAuth: [] }],
        "x-required-scopes": [],
      });
    });

    it("names the scope a route requires", () => {
      expect(operationSecurity("POST", "/v2/hash")).to.deep.equal({
        security: [{ apiKey: [] }, { bearerAuth: ["crypto:hash"] }],
        "x-required-scopes": ["crypto:hash"],
      });
    });

    it("takes only a token for a scope crypto:admin does not imply", () => {
      expect(operationSecurity("POST", "/v2/keys/export")).to.deep.equal({
        security: [{ bearerAuth: ["crypto:keys:export"] }],
        "x-required-scopes": ["crypto:keys:export"],
      });
    });
  });

  describe("operationId", () => {
    it("joins the method and the path words", () => {
      expect(operationId("POST", "/v2/pq/slh-dsa/keygen")).to.equal(
        "postV2PqSlhDsaKeygen",
      );
      expect(operationId("GET", "/v2/compliance/cbom")).to.equal(
        "getV2ComplianceCbom",
      );
      expect(operationId("GET", "/")).to.equal("getRoot");
    });
  });

  describe("withEncodings", () => {
    it("marks hex and base64 strings with contentEncoding", () => {
      const doc = {
        a: [{ type: "string", pattern: HEX_PATTERN }],
        b: { type: "string", format: "byte" },
        c: { type: "string", pattern: "^x$" },
        d: null,
      };
      expect(withEncodings(doc)).to.deep.equal({
        a: [
          { type: "string", pattern: HEX_PATTERN, contentEncoding: "base16" },
        ],
        b: { type: "string", format: "byte", contentEncoding: "base64" },
        c: { type: "string", pattern: "^x$" },
        d: null,
      });
      expect(doc.b).to.not.have.property("contentEncoding");
    });
  });

  describe("documentRoute", () => {
    it("adds the operationId and security to a copy of the schema", () => {
      const schema = { summary: "Hash" };
      const out = documentRoute({
        schema,
        url: "/v2/hash",
        route: { method: ["POST"] },
      });
      expect(out.url).to.equal("/v2/hash");
      expect(out.schema).to.deep.include({
        summary: "Hash",
        operationId: "postV2Hash",
        "x-required-scopes": ["crypto:hash"],
      });
      expect(schema).to.deep.equal({ summary: "Hash" });
    });

    it("documents a route registered without a schema", () => {
      const out = documentRoute({
        url: "/live",
        route: { method: "GET" },
      });
      expect(out.schema).to.deep.equal({
        operationId: "getLive",
        security: [],
      });
    });
  });

  describe("served at /docs/json", () => {
    let app: FastifyInstance;
    let doc: {
      openapi: string;
      info: { version: string };
      components: { securitySchemes: Record<string, unknown> };
      paths: Record<string, Record<string, Operation>>;
    };
    const operations = (): Array<[string, string, Operation]> =>
      Object.entries(doc.paths).flatMap(([url, ops]) =>
        Object.entries(ops).map(
          ([method, op]) =>
            [method.toUpperCase(), url, op] as [string, string, Operation],
        ),
      );

    before(async () => {
      await withEnv({ DOCS_ENABLED: "1", V1_ENABLED: "1" }, async () => {
        app = await init({ logger: false });
      });
      doc = (await app.inject({ url: "/docs/json" })).json();
    });

    after(async () => {
      await app.close();
    });

    it("is OpenAPI 3.1 with the API key and bearer JWT schemes", () => {
      expect(doc.openapi).to.equal("3.1.0");
      expect(doc.components.securitySchemes).to.have.keys([
        "apiKey",
        "bearerAuth",
      ]);
      expect(doc.components.securitySchemes["bearerAuth"]).to.deep.include({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      });
    });

    it("documents every route with a unique operationId", () => {
      const ids = operations().map(([, , op]) => op.operationId);
      expect(ids.length).to.be.greaterThan(60);
      expect(new Set(ids).size).to.equal(ids.length);
    });

    it("states the scope the route policy enforces", () => {
      for (const [method, url, op] of operations()) {
        const required = routeRequirement(method, url);
        if (isPublicRoute(url)) {
          expect(op.security, url).to.deep.equal([]);
        } else if (required === "authenticated") {
          expect(op["x-required-scopes"], url).to.deep.equal([]);
        } else {
          expect(op["x-required-scopes"], url).to.deep.equal([required]);
        }
      }
    });

    it("documents a success and an RFC 9457 problem for each route", () => {
      for (const [method, url, op] of operations()) {
        const codes = Object.keys(op.responses);
        expect(codes, `${method} ${url}`).to.include("200");
        expect(codes, `${method} ${url}`).to.include("500");
        for (const [code, res] of Object.entries(op.responses)) {
          expect(res.description, `${url} ${code}`).to.not.equal(
            "Default Response",
          );
          if (code === "200" || (url === "/ready" && code === "503")) continue;
          expect(res.content, `${url} ${code}`).to.have.keys([
            "application/problem+json",
          ]);
        }
      }
    });

    it("lists 401 and 403 exactly on the routes that need credentials", () => {
      for (const [, url, op] of operations()) {
        const codes = Object.keys(op.responses);
        const guarded = !isPublicRoute(url);
        expect(codes.includes("401"), url).to.equal(guarded);
        expect(codes.includes("403"), url).to.equal(guarded);
      }
    });
  });
});
