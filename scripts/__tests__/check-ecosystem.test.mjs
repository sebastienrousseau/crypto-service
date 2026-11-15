// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  checkEcosystem,
  checkMember,
  registryUrls,
  requiredAssets,
} from "../check-ecosystem.mjs";

const V = "0.0.40";
const ECOSYSTEM = JSON.parse(
  readFileSync(new URL("../../docs/ecosystem.json", import.meta.url), "utf8"),
);

/** A fake GitHub API and registry for one fully released suite. */
function released(overrides = {}) {
  const api = {
    "git/ref/tags/v0.0.40": { object: { type: "tag", sha: "t1" } },
    "git/tags/t1": { verification: { verified: true } },
    "releases/tags/v0.0.40": {
      body: "## Highlights\n\n## Checksums\n",
      assets: [
        { name: "SHA256SUMS" },
        { name: "crypto-service-0.0.40.intoto.jsonl" },
      ],
    },
    "contents/VERSION": { content: Buffer.from("0.0.40\n").toString("base64") },
    ...overrides,
  };
  return {
    owner: "o",
    github: async (path) => {
      const key = path.split("/").slice(3).join("/");
      return api[key] ?? null;
    },
    exists: async (url) => !url.includes("missing"),
  };
}

const member = (name) => ECOSYSTEM.members.find((m) => m.name === name);

describe("registryUrls", () => {
  it("builds one URL per id for each registry", () => {
    const urls = (type, ids) =>
      registryUrls({ type, ids }, V).map((u) => u.url);
    assert.deepEqual(urls("npm", ["@s/a"]), [
      "https://registry.npmjs.org/@s/a/0.0.40",
    ]);
    assert.deepEqual(urls("crates", ["c"]), [
      "https://crates.io/api/v1/crates/c/0.0.40",
    ]);
    assert.deepEqual(urls("maven", ["co.cryptoservice:crypto-service-sdk"]), [
      "https://repo1.maven.org/maven2/co/cryptoservice/crypto-service-sdk/0.0.40/crypto-service-sdk-0.0.40.pom",
    ]);
    assert.deepEqual(urls("nuget", ["CryptoService.Sdk"]), [
      "https://api.nuget.org/v3-flatcontainer/cryptoservice.sdk/0.0.40/cryptoservice.sdk.nuspec",
    ]);
    assert.deepEqual(urls("pypi", ["crypto-service"]), [
      "https://pypi.org/pypi/crypto-service/0.0.40/json",
    ]);
    assert.deepEqual(urls("go", ["github.com/o/M"]), [
      "https://proxy.golang.org/github.com/o/m/@v/v0.0.40.info",
    ]);
  });
  it("has nothing to check for a GitHub-only or unpublished member", () => {
    assert.deepEqual(
      registryUrls({ type: "github-release", ids: ["x"] }, V),
      [],
    );
    assert.deepEqual(registryUrls({ type: "none", ids: [] }, V), []);
  });
});

describe("requiredAssets", () => {
  it("substitutes the version", () => {
    assert.deepEqual(requiredAssets(member("crypto-service"), V), [
      "crypto-service-0.0.40.intoto.jsonl",
    ]);
    assert.deepEqual(requiredAssets({}, V), []);
  });
});

describe("checkMember", () => {
  it("passes every member of a fully released suite", async () => {
    const results = await checkEcosystem(ECOSYSTEM, V, released());
    assert.equal(results.length, 8);
    for (const r of results) assert.deepEqual(r.problems, [], r.name);
  });

  it("reports a missing, lightweight or unsigned tag", async () => {
    const sdk = member("crypto-service-sdk-rust");
    assert.deepEqual(
      await checkMember(
        sdk,
        V,
        released({ "git/ref/tags/v0.0.40": undefined }),
      ),
      ["no tag v0.0.40"],
    );
    const light = {
      "git/ref/tags/v0.0.40": { object: { type: "commit", sha: "c" } },
    };
    assert.deepEqual(await checkMember(sdk, V, released(light)), [
      "tag v0.0.40 is not annotated",
    ]);
    const unsigned = { "git/tags/t1": { verification: { verified: false } } };
    assert.deepEqual(await checkMember(sdk, V, released(unsigned)), [
      "tag v0.0.40 has no verified signature",
    ]);
  });

  it("reports a missing release, asset or checksums section", async () => {
    const none = released({ "releases/tags/v0.0.40": undefined });
    assert.deepEqual(
      await checkMember(member("crypto-service-sdk-go"), V, none),
      ["no GitHub release v0.0.40"],
    );
    const bare = released({
      "releases/tags/v0.0.40": { body: "", assets: [] },
    });
    assert.deepEqual(await checkMember(member("crypto-service"), V, bare), [
      "release v0.0.40 lacks crypto-service-0.0.40.intoto.jsonl",
      "release v0.0.40 has no Checksums section",
    ]);
  });

  it("reports a version missing from its registry", async () => {
    const deps = { ...released(), exists: async () => false };
    assert.deepEqual(
      await checkMember(member("crypto-service-sdk-python"), V, deps),
      ["crypto-service-sdk-python 0.0.40 not on pypi"],
    );
  });

  it("checks the site's VERSION file", async () => {
    const site = member("crypto-service.github.io");
    const stale = {
      "contents/VERSION": { content: Buffer.from("0.0.24").toString("base64") },
    };
    assert.deepEqual(await checkMember(site, V, released(stale)), [
      "VERSION is 0.0.24",
    ]);
    const gone = { "contents/VERSION": undefined };
    assert.deepEqual(await checkMember(site, V, released(gone)), [
      "no VERSION",
    ]);
  });
});

describe("docs/ecosystem.json", () => {
  it("lists core, six SDKs and the site, each with a repo and registry", () => {
    const kinds = ECOSYSTEM.members.map((m) => m.kind);
    assert.deepEqual(kinds, ["core", ...Array(6).fill("sdk"), "site"]);
    for (const m of ECOSYSTEM.members) {
      assert.ok(m.repo && m.registry && m.purpose, m.name);
    }
  });
  it("lists every publishable package of this repository", () => {
    const core = member("crypto-service").registry.ids;
    const pkgs = readFileSync(
      new URL("../../packages/README.md", import.meta.url),
      "utf8",
    );
    assert.equal(core.length, 18);
    for (const id of core) assert.ok(pkgs.includes(id.split("/")[1]), id);
  });
});
