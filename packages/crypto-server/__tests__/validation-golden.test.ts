// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateOptionalNumber,
  validateRequiredNumber,
} from "../src/utils/validation";

// Characterisation net for validateRequiredNumber (and
// validateOptionalNumber, which delegates to it): each value against no
// bounds, a minimum, a maximum and both. The expected results are in
// fixtures/validation.golden.json.

export const VALUES: unknown[] = [
  undefined,
  null,
  "",
  " ",
  "12",
  "1e3",
  "abc",
  0,
  -1,
  5,
  10,
  10.5,
  11,
  NaN,
  Infinity,
  -Infinity,
  true,
  [],
  [7],
  {},
];

export const BOUNDS: Array<{ min?: number; max?: number } | undefined> = [
  undefined,
  {},
  { min: 0 },
  { max: 10 },
  { min: 1, max: 10 },
];

export function runTable(): unknown[] {
  return VALUES.flatMap((value) =>
    BOUNDS.map((bounds) => ({
      value: String(value),
      bounds: bounds ?? null,
      required: validateRequiredNumber(value, "n", bounds),
      optional: validateOptionalNumber(value, 3, "n", bounds),
    })),
  );
}

describe("validateRequiredNumber table", () => {
  it("validates every value and bound exactly as recorded", () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/validation.golden.json"), "utf8"),
    );
    expect(JSON.parse(JSON.stringify(runTable()))).to.deep.equal(golden);
  });
});
