// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  canonical,
  diffSummary,
  main,
  render,
  SPEC_PATH,
  scalar,
  toYaml,
} from "../export-openapi.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;

/**
 * The `yaml` parser @fastify/swagger depends on, as an independent check
 * that the emitter writes YAML that reads back as the same value.
 */
function yamlParser() {
  const server = createRequire(`${ROOT}packages/crypto-server/package.json`);
  return createRequire(server.resolve("@fastify/swagger"))("yaml");
}

describe("canonical", () => {
  it("puts the top level in OpenAPI order and sorts everything else", () => {
    const doc = canonical({
      paths: { "/b": {}, "/a": { post: { z: 1, a: 2 } } },
      components: {},
      "x-extra": true,
      info: { version: "1", title: "t" },
      openapi: "3.1.0",
    });
    assert.deepEqual(Object.keys(doc), [
      "openapi",
      "info",
      "paths",
      "components",
      "x-extra",
    ]);
    assert.deepEqual(Object.keys(doc.info), ["title", "version"]);
    assert.deepEqual(Object.keys(doc.paths), ["/a", "/b"]);
    assert.deepEqual(Object.keys(doc.paths["/a"].post), ["a", "z"]);
  });

  it("keeps array order and sorts objects inside arrays", () => {
    const doc = canonical({ required: ["b", "a"], all: [{ b: 1, a: 2 }] });
    assert.deepEqual(doc.required, ["b", "a"]);
    assert.deepEqual(Object.keys(doc.all[0]), ["a", "b"]);
  });
});

describe("scalar", () => {
  it("leaves unambiguous words plain", () => {
    assert.equal(scalar("string"), "string");
    assert.equal(scalar("x-required-scopes"), "x-required-scopes");
    assert.equal(scalar("format_byte.v2"), "format_byte.v2");
  });

  it("quotes what YAML would read as another type or syntax", () => {
    for (const s of ["200", "3.1.0", "true", "No", "null", "on", "y", ""]) {
      assert.equal(scalar(s), JSON.stringify(s), s);
    }
    for (const s of ["/v2/hash", "a: b", "- x", "#c", "a b", "^k_$"]) {
      assert.equal(scalar(s), JSON.stringify(s), s);
    }
  });

  it("writes numbers, booleans and null as JSON", () => {
    assert.equal(scalar(200), "200");
    assert.equal(scalar(0.5), "0.5");
    assert.equal(scalar(true), "true");
    assert.equal(scalar(null), "null");
  });
});

describe("toYaml", () => {
  it("writes block mappings and sequences", () => {
    assert.equal(
      toYaml({ a: 1, b: ["x", { c: "/p", d: [] }], e: {}, f: [[1, 2]] }),
      [
        "a: 1",
        "b:",
        "  - x",
        '  - c: "/p"',
        "    d: []",
        "e: {}",
        "f:",
        "  - - 1",
        "    - 2",
        "",
      ].join("\n"),
    );
  });

  it("writes a scalar or an empty document on one line", () => {
    assert.equal(toYaml("x"), "x\n");
    assert.equal(toYaml({}), "{}\n");
  });

  it("reads back as the same value", () => {
    const value = {
      openapi: "3.1.0",
      "x-n": [0, -1.5, true, false, null, "", 'multi\nline "q" \\ é'],
      "/v2/hash": { post: { 200: { $ref: "#/components/schemas/P" } } },
      nested: [[{ a: [] }, {}], "yes", "No", "1e3", "0x1f", "~"],
    };
    assert.deepEqual(yamlParser().parse(toYaml(value)), value);
  });
});

describe("render", () => {
  it("sets info.version and adds the generated-file header", () => {
    const text = render(
      { info: { title: "T", version: "old" }, openapi: "3.1.0" },
      "0.0.9",
    );
    assert.match(text, /^# SPDX-License-Identifier: Apache-2.0 OR MIT\n/);
    assert.match(
      text,
      /\nopenapi: "3\.1\.0"\ninfo:\n {2}title: T\n {2}version: "0\.0\.9"\n$/,
    );
  });

  it("drops undefined members as JSON would", () => {
    const text = render({ info: {}, x: undefined }, "1");
    assert.doesNotMatch(text, /x:/);
  });
});

describe("diffSummary", () => {
  it("counts the differing lines and shows the first ones", () => {
    const summary = diffSummary("a\nb\nc", "a\nB\nc\nd", 1);
    assert.equal(
      summary,
      [
        "2 line(s) differ",
        "  line 2:",
        "    - b",
        "    + B",
        "  ... and 1 more",
      ].join("\n"),
    );
  });

  it("marks lines one side does not have", () => {
    assert.match(diffSummary("", "x\ny"), /- \(none\)\n {4}\+ y/);
    assert.match(diffSummary("x\ny", "x"), /- y\n {4}\+ \(none\)/);
    assert.equal(diffSummary("same", "same"), "0 line(s) differ");
  });
});

describe("main", () => {
  const doc = async () => ({ openapi: "3.1.0", info: { title: "T" } });

  function tree() {
    const root = `${mkdtempSync(join(tmpdir(), "openapi-"))}/`;
    writeFileSync(join(root, "package.json"), `{"version": "0.0.9"}`);
    return root;
  }
  function capture() {
    const out = { logs: [], errors: [] };
    out.log = (m) => out.logs.push(m);
    out.error = (m) => out.errors.push(m);
    return out;
  }

  it("writes the document at the root version", async () => {
    const root = tree();
    const out = capture();
    assert.equal(await main([], { root, document: doc, ...out }), 0);
    assert.deepEqual(out.logs, [`export-openapi: wrote ${SPEC_PATH}`]);
    assert.equal(
      readFileSync(join(root, SPEC_PATH), "utf8"),
      render(await doc(), "0.0.9"),
    );
  });

  it("--check passes on a current file and writes nothing", async () => {
    const root = tree();
    await main([], { root, document: doc, log: () => {} });
    const out = capture();
    assert.equal(await main(["--check"], { root, document: doc, ...out }), 0);
    assert.deepEqual(out.logs, [`export-openapi: ok (${SPEC_PATH})`]);
  });

  it("--check fails on a stale or missing file with a diff", async () => {
    const root = tree();
    const out = capture();
    assert.equal(await main(["--check"], { root, document: doc, ...out }), 1);
    assert.match(out.errors[0], /is out of date; run pnpm run openapi\n/);
    assert.match(out.errors[0], /line\(s\) differ/);
    await main([], { root, document: doc, log: () => {} });
    writeFileSync(join(root, SPEC_PATH), "stale\n");
    assert.equal(await main(["--check"], { root, document: doc, ...out }), 1);
  });

  it("--check passes on the committed document from the built server", async () => {
    const out = capture();
    assert.equal(await main(["--check"], out), 0, out.errors.join("\n"));
  });
});
