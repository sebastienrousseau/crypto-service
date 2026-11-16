/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Runs the conformance kit (repository root `conformance/`)
 * against the server: every vector's status, media type, headers and
 * body, and every answer against the response schema the OpenAPI
 * document gives for it. Each file runs on a fresh server, as its own
 * principal (`conformance-<group>`), as the kit's README describes.
 */

import { expect } from "chai";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import type { FastifyInstance, InjectOptions } from "fastify";
import { init } from "../src/server";
import { bearer, JWT_ENV } from "./support/auth";
import {
  KIT,
  documentedSchema,
  loadKit,
  mismatches,
  pointer,
  schemaErrors,
  substitute,
  type Auth,
  type OpenApi,
  type Vector,
} from "./support/conformance";

/** The server configuration the kit assumes (README, "Server"). */
const ENV: Record<string, string | undefined> = {
  ...JWT_ENV,
  RATE_LIMIT_MAX: "100000",
  DOCS_ENABLED: "1",
  V1_ENABLED: "1",
  KMS_PROVIDERS: undefined,
  CRYPTO_KEY_OUT_DIR: undefined,
};

/** Credentials for a vector, as the principal `sub`. */
function headersFor(auth: Auth | undefined, sub: string) {
  if (auth === "none") return {};
  if (auth === undefined || auth === "admin") return bearer(sub);
  return bearer(sub, auth.scopes);
}

/** The request a vector describes, after substitution. */
function requestOf(
  v: Vector,
  sub: string,
  captured: Record<string, string>,
): InjectOptions {
  const r = substitute(v.request, captured) as Vector["request"];
  const headers = { ...headersFor(v.auth, sub), ...r.headers };
  const payload = r.rawBody ?? (r.body as InjectOptions["payload"]);
  return {
    method: r.method as InjectOptions["method"],
    url: r.path,
    headers,
    ...(payload === undefined ? {} : { payload }),
  };
}

const kit = loadKit();

describe("Conformance kit", function () {
  this.timeout(120000);
  const saved: Record<string, string | undefined> = {};
  let doc: OpenApi;

  before(async () => {
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    const app = await init({ logger: false });
    doc = app.swagger() as unknown as OpenApi;
    await app.close();
  });

  after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("has a vector for every documented route", () => {
    const covered = new Set(
      kit.flatMap(([, f]) =>
        f.vectors.map((v) => `${v.request.method} ${v.request.path}`),
      ),
    );
    const missing = Object.entries(doc.paths)
      .flatMap(([url, ops]) =>
        Object.keys(ops).map((m) => `${m.toUpperCase()} ${url}`),
      )
      .filter((r) => !covered.has(r));
    expect(missing).to.deep.equal([]);
  });

  it("lists every file in SHA256SUMS with its digest", () => {
    const sums = readFileSync(path.join(KIT, "SHA256SUMS"), "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split(/\s+\*?/) as [string, string]);
    const listed = sums.map(([, file]) => file).sort();
    const files = readdirSync(KIT)
      .filter((f) => f !== "SHA256SUMS")
      .sort();
    expect(listed).to.deep.equal(files);
    for (const [digest, file] of sums) {
      const actual = createHash("sha256")
        .update(readFileSync(path.join(KIT, file)))
        .digest("hex");
      expect(actual, file).to.equal(digest);
    }
  });

  for (const [file, { group, vectors }] of kit) {
    describe(file, () => {
      const sub = `conformance-${group}`;
      const captured: Record<string, string> = {};
      let app: FastifyInstance;

      before(async () => {
        app = await init({ logger: false });
      });

      after(async () => {
        await app.close();
      });

      for (const v of vectors) {
        it(`${v.id}: ${v.description}`, async () => {
          const res = await app.inject(requestOf(v, sub, captured));
          const mediaType = String(res.headers["content-type"] ?? "").split(
            ";",
          )[0] as string;
          expect(res.statusCode, res.payload).to.equal(v.expect.status);
          expect(mediaType).to.equal(v.expect.mediaType);
          for (const [name, value] of Object.entries(v.expect.headers ?? {})) {
            expect(res.headers[name], name).to.equal(value);
          }
          const body = mediaType.endsWith("json") ? res.json() : res.payload;
          const template =
            v.expect.body === undefined ? v.expect.text : v.expect.body;
          expect(mismatches(template, body, captured)).to.deep.equal([]);

          // The answer matches the schema the OpenAPI document gives for
          // its status and media type (an unknown route has none).
          if (doc.paths[v.request.path] !== undefined) {
            const schema = documentedSchema(
              doc,
              v.request.method,
              v.request.path,
              res.statusCode,
              mediaType,
            );
            expect(schema, "documented response").to.not.equal(undefined);
            expect(schemaErrors(schema as object, body)).to.deep.equal([]);
          }

          for (const [name, at] of Object.entries(v.capture ?? {})) {
            captured[name] = String(pointer(body, at));
          }
        });
      }
    });
  }
});
