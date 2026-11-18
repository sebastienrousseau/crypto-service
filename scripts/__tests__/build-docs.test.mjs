// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { assembleSite, findSsgBinary, main } from "../build-docs.mjs";

const temp = (prefix) => mkdtempSync(join(tmpdir(), prefix));

/** Write `files` ({ path: text }) under `root`. */
function write(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

/** What findSsgBinary returns when nothing earlier in its search matches. */
const SYSTEM =
  ["/usr/local/bin/ssg", "/opt/homebrew/bin/ssg"].find(existsSync) ?? "ssg";

describe("findSsgBinary", () => {
  const none = () => {
    throw new Error("which: no ssg");
  };

  it("prefers an existing $SSG_BIN", () => {
    const bin = join(write(temp("ssg-"), { ssg: "" }), "ssg");
    assert.equal(findSsgBinary({ SSG_BIN: bin }, none), bin);
  });
  it("then the ssg on PATH", () => {
    const bin = join(write(temp("ssg-"), { ssg: "" }), "ssg");
    const env = { SSG_BIN: "/no/such/ssg", HOME: temp("home-") };
    assert.equal(
      findSsgBinary(env, () => `${bin}\n`),
      bin,
    );
  });
  it("then the mise and cargo installs under $HOME", () => {
    const mise = ".local/share/mise/installs/cargo-ssg/0.0.76/bin/ssg";
    const home = write(temp("home-"), { [mise]: "" });
    assert.equal(
      findSsgBinary({ HOME: home }, () => ""),
      join(home, mise),
    );
    const cargo = write(temp("home-"), { ".cargo/bin/ssg": "" });
    assert.equal(
      findSsgBinary({ HOME: cargo }, () => "/no/such/ssg"),
      join(cargo, ".cargo/bin/ssg"),
    );
  });
  it("then the system locations, else plain ssg", () => {
    assert.equal(findSsgBinary({}, none), SYSTEM);
    assert.equal(findSsgBinary({ HOME: temp("home-") }, none), SYSTEM);
  });
});

describe("assembleSite", () => {
  it("merges ssg output, website files and every package's docs", () => {
    const root = write(temp("site-"), {
      "_site/stale.html": "old",
      "public/index.html": "portal",
      "public/assets/portal.css": "portal css",
      "website/images/logo.svg": "logo",
      "website/assets/site.js": "site js",
      "packages/README.md": "not a package",
      "packages/crypto-lib/package.json": '{"version": "1.0.0"}',
      "packages/crypto-lib/docs/index.html": "lib home",
      "packages/crypto-lib/docs/functions/f.html": "f",
      "packages/crypto-lib/docs/assets/portal.css": "typedoc css",
      "packages/crypto-lib/docs/assets/main.js": "typedoc js",
      "packages/crypto-a/package.json": '{"description": "A", "version": "2"}',
      "packages/crypto-bad/package.json": "{not json",
      "packages/crypto-none/src/x.ts": "",
    });
    const logs = [];
    const meta = assembleSite(root, (m) => logs.push(m));
    const site = (path) => readFileSync(join(root, "_site", path), "utf8");

    assert.equal(existsSync(join(root, "_site/stale.html")), false);
    assert.equal(site("index.html"), "portal");
    assert.equal(site("images/logo.svg"), "logo");
    assert.equal(site("assets/site.js"), "site js");
    assert.equal(
      readFileSync(join(root, "public/images/logo.svg"), "utf8"),
      "logo",
    );
    assert.equal(site("CNAME"), "docs.crypto-service.co\n");
    assert.equal(site(".nojekyll"), "");
    assert.equal(site("packages/crypto-lib/functions/f.html"), "f");
    assert.equal(site("crypto-lib.html"), "lib home");
    assert.equal(site("functions/f.html"), "f");
    // The portal's own files win over TypeDoc's at the root.
    assert.equal(site("assets/portal.css"), "portal css");
    assert.equal(site("assets/main.js"), "typedoc js");
    const fallback = "Package documentation and API reference.";
    assert.deepEqual(meta, [
      { name: "crypto-a", version: "2", description: "A" },
      { name: "crypto-bad", version: "0.0.4", description: fallback },
      { name: "crypto-lib", version: "1.0.0", description: fallback },
      { name: "crypto-none", version: "0.0.4", description: fallback },
    ]);
    assert.deepEqual(logs, [
      "Copied TypeDoc docs for crypto-lib -> /packages/crypto-lib/",
    ]);
  });
  it("assembles a bare site when nothing was built", () => {
    const root = write(temp("site-"), { "packages/.keep": "" });
    assert.deepEqual(
      assembleSite(root, () => {}),
      [],
    );
    assert.equal(
      readFileSync(join(root, "_site/CNAME"), "utf8").trim(),
      "docs.crypto-service.co",
    );
  });
});

describe("main", () => {
  function run(failSsg) {
    const root = write(temp("docs-"), {
      "packages/crypto-a/package.json": "{}",
    });
    const commands = [];
    const out = { logs: [], errors: [] };
    const exec = (command, options) => {
      commands.push([command, options?.cwd]);
      if (command === "which ssg") return "";
      if (failSsg && command.includes(" build ")) throw new Error("ssg died");
      return "";
    };
    const code = main([], {
      root,
      exec,
      env: { SSG_BIN: "/no/such/ssg", HOME: root },
      log: (m) => out.logs.push(m),
      error: (...args) => out.errors.push(args),
    });
    return { code, commands, out, root };
  }

  it("builds TypeDoc, compiles the portal and assembles _site", () => {
    const { code, commands, out, root } = run(false);
    assert.equal(code, 0);
    assert.deepEqual(commands, [
      ["pnpm -r run docs", root],
      ["which ssg", undefined],
      [`${SYSTEM} build -f website/ssg.toml`, root],
    ]);
    assert.ok(existsSync(join(root, "_site/CNAME")));
    assert.equal(out.logs.at(-1), "==> Total workspace packages indexed: 1");
  });
  it("exits 1 when ssg fails, before touching _site", () => {
    const { code, out, root } = run(true);
    assert.equal(code, 1);
    assert.equal(out.errors[0][0], "Failed to compile with SSG:");
    assert.match(out.errors[0][1].message, /ssg died/);
    assert.equal(existsSync(join(root, "_site")), false);
  });
});
