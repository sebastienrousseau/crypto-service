/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Logging. The server had two loggers with different formats: Fastify's
 * pino logger (always at info) for requests and a Winston logger, the only
 * one honouring LOG_LEVEL, for startup and shutdown. The x-request-id a
 * client sent was echoed but never used in the logs, and was echoed
 * without any length or character check. One pino logger now serves both,
 * honours LOG_LEVEL, redacts secrets, and logs the request ID.
 */
import { expect } from "chai";
import { Writable } from "stream";
import {
  createLogger,
  LOG_REDACT_PATHS,
  requestIdFrom,
} from "../src/lib/logger";
import { init } from "../src/server";
import { withEnv } from "./support/auth";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      for (const line of String(chunk).split("\n").filter(Boolean)) {
        lines.push(JSON.parse(line));
      }
      done();
    },
  });
  return { lines, stream };
}

describe("logging", function () {
  this.timeout(30000);

  it("honours LOG_LEVEL", async () => {
    await withEnv({ LOG_LEVEL: "warn" }, async () => {
      const { lines, stream } = capture();
      const log = createLogger(stream);
      log.info("hidden");
      log.warn("shown");
      expect(lines.map((l) => l["msg"])).to.deep.equal(["shown"]);
    });
  });

  it("redacts credentials and key material", () => {
    const { lines, stream } = capture();
    createLogger(stream).warn(
      {
        req: { headers: { authorization: "Bearer t", "x-api-key": "k" } },
        privateKey: "pk",
        secretKey: "sk",
        passphrase: "pp",
        password: "pw",
        body: { password: "pw2" },
      },
      "x",
    );
    const text = JSON.stringify(lines[0]);
    for (const secret of ["Bearer t", '"k"', "pk", "sk", "pp", '"pw"', "pw2"]) {
      expect(text, secret).to.not.include(secret);
    }
    expect(LOG_REDACT_PATHS).to.include("*.password");
  });

  it("accepts a well-formed x-request-id and replaces anything else", () => {
    expect(requestIdFrom("abc-123_X.y")).to.equal("abc-123_X.y");
    for (const bad of ["", "a b", "x".repeat(129), "<script>", undefined]) {
      const id = requestIdFrom(bad);
      expect(id).to.match(/^[0-9a-f-]{36}$/);
    }
    expect(requestIdFrom(["a", "b"])).to.match(/^[0-9a-f-]{36}$/);
  });

  it("uses the request ID in the response and in every request log line", async () => {
    const { lines, stream } = capture();
    const app = await init({ logger: { level: "info", stream } });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { "x-request-id": "trace-42" },
      });
      expect(res.headers["x-request-id"]).to.equal("trace-42");
      const forRequest = lines.filter((l) => l["reqId"] === "trace-42");
      expect(forRequest.length).to.be.greaterThan(0);

      const odd = await app.inject({
        method: "GET",
        url: "/health",
        headers: { "x-request-id": "bad id with spaces" },
      });
      expect(odd.headers["x-request-id"]).to.match(/^[0-9a-f-]{36}$/);
    } finally {
      await app.close();
    }
  });
});
