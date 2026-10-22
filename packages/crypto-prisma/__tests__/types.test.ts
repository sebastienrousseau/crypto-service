/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// src/types.ts declares types only, and every import of it is type-only, so no
// test loaded it and coverage, which counts every source file, could not
// see it. Loading it here also keeps it free of untested runtime code.
import { expect } from "chai";
import * as typesModule from "../src/types";

describe("src/types.ts", () => {
  it("declares types only, with no runtime exports", () => {
    expect(Object.keys(typesModule)).to.deep.equal([]);
  });
});
