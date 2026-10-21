// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateCbom } from "../src/validator";

// Characterisation net for validateCbom: valid and broken CycloneDX and
// SPDX documents, non-objects and unknown formats. The expected results
// are in fixtures/validator.golden.json.

const asset = { type: "cryptographic-asset", name: "AES-256-GCM" };
const cdx = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: "urn:uuid:1",
  components: [asset],
};

export const INPUTS: unknown[] = [
  null,
  undefined,
  42,
  "CycloneDX",
  [],
  {},
  { bomFormat: "SPDX" },
  cdx,
  { ...cdx, components: [] },
  { ...cdx, specVersion: "1.5" },
  { ...cdx, specVersion: undefined },
  { ...cdx, serialNumber: "" },
  { ...cdx, serialNumber: 7 },
  { ...cdx, components: "nope" },
  { ...cdx, components: undefined },
  { ...cdx, components: [null, 0, {}, { type: "library", name: "x" }] },
  { ...cdx, components: [{ type: "cryptographic-asset" }, asset] },
  { bomFormat: "CycloneDX" },
  { spdxVersion: "SPDX-3.0", spdxId: "SPDXRef-DOC", elements: [] },
  { spdxVersion: "SPDX-3.0" },
  { spdxVersion: "SPDX-3.0", spdxId: 1, elements: {} },
  { spdxVersion: "spdx-3.0", spdxId: "x", elements: [] },
  { spdxVersion: 3, spdxId: "x", elements: [] },
  { ...cdx, spdxVersion: "SPDX-3.0" },
];

export const runInputs = (): unknown[] => INPUTS.map(validateCbom);

describe("validateCbom", () => {
  it("validates every input exactly as recorded", () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/validator.golden.json"), "utf8"),
    );
    expect(runInputs()).to.deep.equal(golden);
  });
});
