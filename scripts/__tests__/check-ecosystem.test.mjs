// SPDX-License-Identifier: Apache-2.0 OR MIT

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  checkEcosystem,
  checkMember,
  existsClient,
  githubClient,
  main,
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
    assert.deepEqual(urls("maven", ["co.crypto-service:crypto-service-sdk"]), [
      "https://repo1.maven.org/maven2/co/crypto-service/crypto-service-sdk/0.0.40/crypto-service-sdk-0.0.40.pom",
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

describe("checkEcosystem", () => {
  it("passes every member of a fully released suite", async () => {
    const results = await checkEcosystem(ECOSYSTEM, V, released());
    assert.equal(results.length, 8);
    for (const r of results) assert.deepEqual(r.problems, [], r.name);
  });
});

describe("checkMember", () => {
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

/** A fake fetch answering `routes[url]` (status, body), else 404. */
function fakeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers });
    const [status, body] = routes[url] ?? [404, null];
    return new Response(JSON.stringify(body), { status });
  };
  return { fetchImpl, calls };
}

describe("githubClient", () => {
  const API = "https://api.github.com/";

  it("returns the parsed body and sends the token when set", async () => {
    const { fetchImpl, calls } = fakeFetch({ [`${API}x`]: [200, { a: 1 }] });
    assert.deepEqual(await githubClient("tok", fetchImpl)("x"), { a: 1 });
    assert.equal(calls[0].headers.authorization, "Bearer tok");
    assert.equal(calls[0].headers["user-agent"], "crypto-service-suite-check");
  });
  it("sends no authorization without a token", async () => {
    const { fetchImpl, calls } = fakeFetch({ [`${API}x`]: [200, {}] });
    await githubClient(undefined, fetchImpl)("x");
    assert.equal("authorization" in calls[0].headers, false);
  });
  it("reads 404 and 409 (an empty repository) as nothing", async () => {
    const { fetchImpl } = fakeFetch({ [`${API}empty`]: [409, {}] });
    const github = githubClient("", fetchImpl);
    assert.equal(await github("missing"), null);
    assert.equal(await github("empty"), null);
  });
  it("throws on any other failure", async () => {
    const { fetchImpl } = fakeFetch({ [`${API}x`]: [500, {}] });
    await assert.rejects(
      githubClient("", fetchImpl)("x"),
      /GitHub API x: HTTP 500/,
    );
  });
});

describe("existsClient", () => {
  it("is true for 2xx and false otherwise", async () => {
    const { fetchImpl, calls } = fakeFetch({ "https://r/a": [200, {}] });
    const exists = existsClient(fetchImpl);
    assert.equal(await exists("https://r/a"), true);
    assert.equal(await exists("https://r/b"), false);
    assert.equal(calls[0].headers["user-agent"], "crypto-service-suite-check");
  });
});

const SITE = {
  name: "site",
  kind: "site",
  repo: "site",
  versionFile: "VERSION",
  registry: { type: "none", ids: [] },
};

/** A root at 1.2.3 whose suite is the site alone. */
function tree() {
  const root = `${mkdtempSync(join(tmpdir(), "ecosystem-"))}/`;
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "package.json"), `{"version": "1.2.3"}`);
  writeFileSync(
    join(root, "docs/ecosystem.json"),
    JSON.stringify({ owner: "o", members: [SITE] }),
  );
  return root;
}

/** GitHub answers for the site released at `version`. */
function api(version) {
  const base = "https://api.github.com/repos/o/site";
  return {
    [`${base}/git/ref/tags/v${version}`]: [
      200,
      { object: { type: "tag", sha: "t" } },
    ],
    [`${base}/git/tags/t`]: [200, { verification: { verified: true } }],
    [`${base}/contents/VERSION`]: [
      200,
      { content: Buffer.from(version).toString("base64") },
    ],
  };
}

describe("main", () => {
  it("checks the root version and exits 0 when consistent", async () => {
    const logs = [];
    const { fetchImpl, calls } = fakeFetch(api("1.2.3"));
    const code = await main([], {
      root: tree(),
      env: { GITHUB_TOKEN: "tok" },
      fetchImpl,
      log: (m) => logs.push(m),
    });
    assert.equal(code, 0);
    assert.deepEqual(logs, ["site: ok", "ecosystem 1.2.3: 1/1 consistent"]);
    assert.equal(calls[0].headers.authorization, "Bearer tok");
  });
  it("checks --version and exits 1 listing the problems", async () => {
    const logs = [];
    const { fetchImpl } = fakeFetch(api("1.2.3"));
    const code = await main(["--version", "1.2.4"], {
      root: tree(),
      env: {},
      fetchImpl,
      log: (m) => logs.push(m),
    });
    assert.equal(code, 1);
    assert.deepEqual(logs, [
      "site: no tag v1.2.4; VERSION is 1.2.3",
      "ecosystem 1.2.4: 0/1 consistent",
    ]);
  });
});
