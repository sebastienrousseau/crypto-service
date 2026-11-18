// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { generate, main } from "../packages-index.mjs";

const BEGIN = "<!-- BEGIN GENERATED: scripts/packages-index.mjs -->";
const END = "<!-- END GENERATED -->";

describe("generate", () => {
  it("tables each package and lists its workspace dependencies", () => {
    const text = generate([
      {
        dir: "crypto-a",
        description: "A | B",
        dependencies: {
          "@sebastienrousseau/crypto-z": "workspace:*",
          "@sebastienrousseau/crypto-b": "workspace:*",
          other: "1",
        },
      },
      { dir: "crypto-b", description: "B" },
    ]);
    assert.ok(text.startsWith(`${BEGIN}\n`));
    assert.ok(text.endsWith(`\n${END}`));
    assert.match(text, /All 2 packages share one version/);
    assert.match(text, /\| \[`crypto-a`\]\(crypto-a\/\) \| A \\\| B \|/);
    assert.match(text, /- `crypto-a`: `crypto-b`, `crypto-z`\n/);
    assert.match(text, /- `crypto-b`: no workspace dependencies\n/);
  });
});

describe("main", () => {
  function tree(readme = `# Packages\n\n${BEGIN}\n${END}\n`) {
    const root = `${mkdtempSync(join(tmpdir(), "packages-index-"))}/`;
    mkdirSync(join(root, "packages/crypto-a"), { recursive: true });
    mkdirSync(join(root, "packages/tools"));
    writeFileSync(
      join(root, "packages/crypto-a/package.json"),
      `{"description": "A"}`,
    );
    writeFileSync(join(root, "packages/README.md"), readme);
    return root;
  }
  function capture() {
    const out = { logs: [], errors: [] };
    out.log = (m) => out.logs.push(m);
    out.error = (m) => out.errors.push(m);
    return out;
  }

  it("refuses a README without both markers", async () => {
    for (const readme of ["# P\n", `# P\n${BEGIN}\n`, `# P\n${END}\n`]) {
      const root = tree(readme);
      const out = capture();
      assert.equal(await main([], { root, ...out }), 1);
      assert.match(out.errors[0], /^packages-index: markers missing in /);
    }
  });
  it("--check fails on a stale index, which a write then fixes", async () => {
    const root = tree();
    const out = capture();
    assert.equal(await main(["--check"], { root, ...out }), 1);
    assert.match(out.errors[0], /packages\/README\.md is out of date/);
    assert.equal(await main([], { root, ...out }), 0);
    assert.deepEqual(out.logs, ["packages-index: wrote 1 packages"]);
    const written = readFileSync(join(root, "packages/README.md"), "utf8");
    assert.match(written, /\| \[`crypto-a`\]\(crypto-a\/\) \| A/);
    assert.equal(await main(["--check"], { root, ...out }), 0);
    assert.equal(out.logs[1], "packages-index: ok (1 packages)");
  });
  it("--check passes on the committed packages/README.md", async () => {
    const out = capture();
    assert.equal(await main(["--check"], out), 0, out.errors.join("\n"));
  });
});
