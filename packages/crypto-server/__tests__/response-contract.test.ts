/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Characterisation net for the response contract. Fastify
 * serialises a response through its route's `response` schema and
 * silently drops any property the schema does not name, so a schema that
 * is wrong changes the public API without failing a request. This test
 * calls the success path of every route (support/contract-scenario.ts)
 * and compares the status, media type and the full set of JSON paths and
 * their types against fixtures/response-shapes.golden.json, which was
 * recorded before the route schemas declared their responses.
 *
 * Regenerate the fixture with UPDATE_RESPONSE_SHAPES=1 only for an
 * intended API change, and say so in the commit.
 */

import { expect } from "chai";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resetKeystore } from "@sebastienrousseau/crypto-lib/testing";
import { init } from "../src/server";
import { bearer, JWT_ENV, withEnv } from "./support/auth";
import {
  FIXTURE_KEYS,
  runScenario,
  type Observation,
} from "./support/contract-scenario";

const GOLDEN = join(__dirname, "fixtures", "response-shapes.golden.json");

/** The JSON type of a value: `array`, `null`, or its `typeof`. */
function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Every path in a JSON value with its type, as `"<path>: <type>"`. Array
 * elements share the path `<array>[]`, so the list is the same for any
 * number of elements of the same shape.
 */
function shapeOf(value: unknown, at = "$"): string[] {
  const here = [`${at}: ${typeOf(value)}`];
  if (Array.isArray(value)) {
    return here.concat(value.flatMap((v) => shapeOf(v, `${at}[]`)));
  }
  if (value !== null && typeof value === "object") {
    return here.concat(
      Object.entries(value).flatMap(([k, v]) => shapeOf(v, `${at}.${k}`)),
    );
  }
  return here;
}

/** What the golden file records for one observation. */
function record(o: Observation): Record<string, unknown> {
  const shape =
    typeof o.body === "string"
      ? ["$: text"]
      : [...new Set(shapeOf(o.body))].sort();
  return { status: o.status, mediaType: o.mediaType, shape };
}

describe("Response contract (characterisation)", function () {
  this.timeout(300000);
  let observed: Record<string, Record<string, unknown>>;

  before(async () => {
    await withEnv(
      {
        ...JWT_ENV,
        CRYPTO_KEY_DIR: FIXTURE_KEYS,
        CRYPTO_KEY_ALLOW_PLAINTEXT: "1",
      },
      async () => {
        resetKeystore();
        try {
          const all = await runScenario(
            () => init({ logger: false }),
            // Export needs its own scope; crypto:admin does not imply it.
            bearer("contract-user", ["crypto:admin", "crypto:keys:export"]),
          );
          observed = Object.fromEntries(all.map((o) => [o.name, record(o)]));
        } finally {
          resetKeystore();
        }
      },
    );
    if (process.env["UPDATE_RESPONSE_SHAPES"] === "1") {
      writeFileSync(GOLDEN, `${JSON.stringify(observed, null, 2)}\n`);
    }
  });

  it("answers every route's success path with 2xx", () => {
    const failed = Object.entries(observed)
      .filter(([, r]) => (r["status"] as number) >= 300)
      .map(([name, r]) => `${name} -> ${r["status"]}`);
    expect(failed).to.deep.equal([]);
  });

  it("calls every route the OpenAPI document lists", async () => {
    const app = await withEnv({ DOCS_ENABLED: "1", V1_ENABLED: "1" }, () =>
      init({ logger: false }),
    );
    const paths = (app.swagger() as { paths: Record<string, object> }).paths;
    await app.close();
    const documented = Object.entries(paths).flatMap(([url, ops]) =>
      Object.keys(ops).map((m) => `${m.toUpperCase()} ${url}`),
    );
    const called = new Set(Object.keys(observed).map((n) => n.split("#")[0]));
    expect([...called].sort()).to.deep.equal(documented.sort());
  });

  it("calls the same routes the fixture records", () => {
    const golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
    expect(Object.keys(observed).sort()).to.deep.equal(
      Object.keys(golden).sort(),
    );
  });

  it("keeps every field, type and media type of the recorded responses", () => {
    const golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
    // Route by route, so a failure names the route and the paths.
    for (const name of Object.keys(golden)) {
      expect(observed[name], name).to.deep.equal(golden[name]);
    }
  });
});
