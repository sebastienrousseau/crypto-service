/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Deprecation of the v1 API. v1 responses sent `Deprecation: true` (an
 * early draft form; RFC 9745 wants the date it was deprecated), an ISO
 * 8601 `Sunset` (RFC 8594 wants an HTTP date) and a `Link` to `/v2`, a
 * route that does not exist; the OpenAPI document did not mark v1
 * deprecated, and operators could not turn v1 off before its sunset.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import { withEnv } from "./support/auth";

const V1_ROUTES = [
  "/v1/encrypt",
  "/v1/decrypt",
  "/v1/generate",
  "/v1/revoke",
  "/v1/verify",
];

describe("v1 deprecation", function () {
  this.timeout(60000);
  let app: FastifyInstance;
  before(async () => {
    app = await init({ logger: false });
  });
  after(async () => {
    await app.close();
  });

  it("sends RFC 9745 and RFC 8594 headers on every v1 response", async () => {
    for (const url of V1_ROUTES) {
      const res = await app.inject({ method: "POST", url, payload: {} });
      expect(res.headers["deprecation"], url).to.equal("@1787270400");
      expect(res.headers["sunset"], url).to.equal(
        "Fri, 01 Jan 2027 00:00:00 GMT",
      );
      expect(res.headers["link"], url).to.equal(
        '<https://github.com/sebastienrousseau/crypto-service/blob/main/MIGRATION.md>; rel="deprecation"; type="text/html"',
      );
    }
  });

  it("sends none of them on v2 responses", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v2/hash",
      payload: { algorithm: "sha256", data: "x" },
    });
    expect(res.headers).to.not.have.property("deprecation");
    expect(res.headers).to.not.have.property("sunset");
  });

  it("marks every v1 operation deprecated in the OpenAPI document", async () => {
    const doc = (await app.inject({ url: "/docs/json" })).json();
    for (const url of V1_ROUTES) {
      expect(doc.paths[url].post.deprecated, url).to.equal(true);
    }
  });

  it("removes the v1 routes when V1_ENABLED=0", async () => {
    await withEnv({ V1_ENABLED: "0" }, async () => {
      const off = await init({ logger: false });
      try {
        for (const url of V1_ROUTES) {
          const res = await off.inject({ method: "POST", url, payload: {} });
          expect(res.statusCode, url).to.equal(404);
        }
      } finally {
        await off.close();
      }
    });
  });
});
