// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import { WasmAccelerator } from "../src/index";

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as { version: string };

const MINIMAL_WASM_WITH_MEMORY = new Uint8Array(
  Buffer.from(
    [
      "0061736d", // magic
      "01000000", // version 1
      "0503010001", // memory section: 1 memory, min 1 page
      "070a0106", // export section: 1 export, name length 6
      "6d656d6f7279", // "memory"
      "0200", // memory export, index 0
    ].join(""),
    "hex",
  ),
);

describe("WasmAccelerator version reporting", () => {
  it("reports the package.json version when WASM is loaded", async () => {
    const accel = new WasmAccelerator();
    await accel.init(MINIMAL_WASM_WITH_MEMORY);
    expect(accel.isAvailable).to.equal(true);
    expect(accel.status().version).to.equal(pkg.version);
    accel.destroy();
  });
});
