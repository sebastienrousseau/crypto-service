// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import { generateCycloneDxCbom, generateSpdxCbom } from "../src";

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as { version: string };

describe("Crypto CBOM version reporting", () => {
  it("reports the package.json version as the CycloneDX tool version", () => {
    const cbom = generateCycloneDxCbom([]);
    expect(cbom.metadata.tools[0]?.name).to.equal(
      "@sebastienrousseau/crypto-cbom",
    );
    expect(cbom.metadata.tools[0]?.version).to.equal(pkg.version);
  });

  it("does not invent a version for the analysed component", () => {
    const cbom = generateCycloneDxCbom([]);
    expect(cbom.metadata.component).to.not.have.property("version");
  });

  it("reports the package.json version in the default SPDX creator", () => {
    const spdx = generateSpdxCbom([]);
    expect(spdx.creationInfo.creators).to.deep.equal([
      `Tool: @sebastienrousseau/crypto-cbom-${pkg.version}`,
    ]);
  });
});
