/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// docs/ALGORITHMS.md tells readers which crypto-lib function to use for
// each job. A renamed or removed function would leave the page pointing at
// nothing, so every function or module it names must be exported (a
// module such as protocols.pqxdh, or an object such as tokens.v4local
// with its own functions), and the registry
// facts it states must hold.
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import * as lib from "../src";

const page = readFileSync(
  path.join(__dirname, "..", "..", "..", "docs", "ALGORITHMS.md"),
  "utf8",
);

/** `name`, `name()` or `module.name` in backticks, in camelCase. */
const named = [
  ...new Set(
    [
      ...page.matchAll(
        /`([a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)?)(?:\(\))?`/g,
      ),
    ]
      .map((m) => m[1]!)
      .filter((name) => /[A-Z.]/.test(name)),
  ),
];

describe("docs/ALGORITHMS.md", () => {
  it("names functions", () => {
    expect(named.length).to.be.greaterThan(20);
  });

  for (const name of named) {
    it(`names an export: ${name}`, () => {
      const value = name
        .split(".")
        .reduce<unknown>(
          (obj, key) => (obj as Record<string, unknown>)?.[key],
          lib,
        );
      expect(typeof value, name).to.be.oneOf(["function", "object"]);
      expect(value, name).to.not.equal(null);
    });
  }

  it("is right that PBKDF2 is deprecated and Argon2id recommended", () => {
    expect(lib.isDeprecated("pbkdf2-sha256")).to.equal(true);
    expect(lib.getAlgorithm("argon2id")?.status).to.equal("recommended");
    expect(lib.getAlgorithm("x-wing")?.status).to.equal("recommended");
    expect(lib.getAlgorithm("ed25519-ml-dsa-65")?.status).to.equal(
      "recommended",
    );
  });
});
