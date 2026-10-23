/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The package's entry points (the root and every subpath in `exports`)
// are barrels that no test loaded: this file held a placeholder that
// asserted `true`, and coverage, which counts every source file, never
// saw them. Each entry point now loads from source, and every name it
// exports is defined.
import { expect } from "chai";
import * as path from "path";
import pkg from "../package.json";

type ExportTarget = string | { require: string };

/** The source module an `exports` target is built from. */
function sourceOf(target: ExportTarget): string {
  const built = typeof target === "string" ? target : target.require;
  return path.join(
    __dirname,
    "..",
    built.replace(/^\.\/dist\//, "src/").replace(/\.js$/, ""),
  );
}

const entryPoints = Object.entries(
  pkg.exports as Record<string, ExportTarget>,
).filter(([subpath]) => subpath !== "./package.json");

describe("package entry points", () => {
  for (const [subpath, target] of entryPoints) {
    it(`${subpath} loads and exports only defined names`, async () => {
      const mod = (await import(sourceOf(target))) as Record<string, unknown>;
      const names = Object.keys(mod);
      expect(names, subpath).to.not.be.empty;
      for (const name of names) {
        expect(mod[name], `${subpath} ${name}`).to.not.equal(undefined);
      }
    });
  }

  it("exposes its namespaces and registry at the root", async () => {
    const root = await import("../src");
    expect(root.pgp.verify).to.be.a("function");
    expect(root.tokens.v4local).to.be.an("object");
    expect(root.protocols).to.be.an("object");
    expect(root.crypto).to.be.an("object");
    expect(root.getAlgorithm).to.be.a("function");
  });
});
