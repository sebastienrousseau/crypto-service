// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { fetchDraft } from "../lib/ietf-draft.mjs";

const TEXT = "draft text\n";
const SHA = createHash("sha256").update(TEXT).digest("hex");
const serve = (status, body) => async () => new Response(body, { status });

describe("fetchDraft", () => {
  it("returns the text when its SHA-256 matches", async () => {
    let seen;
    const fetchImpl = async (url) => ((seen = url), new Response(TEXT));
    assert.equal(await fetchDraft("https://d/x.txt", SHA, fetchImpl), TEXT);
    assert.equal(seen, "https://d/x.txt");
  });
  it("refuses an HTTP error", async () => {
    await assert.rejects(
      fetchDraft("u", SHA, serve(410, "")),
      /^Error: HTTP 410$/,
    );
  });
  it("refuses text that changed", async () => {
    await assert.rejects(
      fetchDraft("u", SHA, serve(200, "edited\n")),
      /^Error: draft text changed: [0-9a-f]{64}$/,
    );
  });
});
