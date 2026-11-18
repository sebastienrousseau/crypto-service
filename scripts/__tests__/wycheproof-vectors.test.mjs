// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FILES, main } from "../wycheproof-vectors.mjs";

describe("main", () => {
  it("writes each vector file with its source and commit", async () => {
    const out = mkdtempSync(join(tmpdir(), "wycheproof-"));
    const urls = [];
    const logs = [];
    const fetchImpl = async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ numberOfTests: 2, testGroups: [] }));
    };
    assert.equal(
      await main([], { out, fetchImpl, log: (m) => logs.push(m) }),
      0,
    );
    assert.equal(urls.length, FILES.length);
    assert.match(
      urls[0],
      /^https:\/\/raw\.githubusercontent\.com\/C2SP\/wycheproof\/[0-9a-f]{40}\/testvectors_v1\/xchacha20_poly1305_test\.json$/,
    );
    assert.equal(
      logs[0],
      "wycheproof-vectors: xchacha20_poly1305_test: 2 tests",
    );
    const fixture = JSON.parse(
      readFileSync(join(out, "aes_gcm_test.json"), "utf8"),
    );
    assert.equal(fixture.generatedBy, "scripts/wycheproof-vectors.mjs");
    assert.match(
      fixture.source,
      /\/blob\/[0-9a-f]{40}\/testvectors_v1\/aes_gcm_test\.json$/,
    );
    assert.equal(fixture.numberOfTests, 2);
  });
  it("stops at the first HTTP error", async () => {
    const out = mkdtempSync(join(tmpdir(), "wycheproof-"));
    const fetchImpl = async () => new Response("", { status: 404 });
    await assert.rejects(
      main([], { out, fetchImpl }),
      /^Error: xchacha20_poly1305_test: HTTP 404$/,
    );
  });
});
