// SPDX-License-Identifier: Apache-2.0 OR MIT

// The README's "Tools Exposed" table must list exactly the tools the
// server defines.

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "../src/tools";

describe("README tools table", () => {
  it("lists every tool the server exposes, and no others", () => {
    const readme = readFileSync(join(__dirname, "..", "README.md"), "utf8");
    const listed = [...readme.matchAll(/^\| `(crypto_[a-z_]+)`/gm)].map(
      (match) => match[1],
    );
    expect([...listed].sort()).to.deep.equal(
      TOOLS.map((tool) => tool.name).sort(),
    );
  });
});
