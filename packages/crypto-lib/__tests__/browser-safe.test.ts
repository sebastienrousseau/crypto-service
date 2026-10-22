/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// crypto-lib used Node's Buffer throughout and failed in browsers with
// "Buffer is not defined". The browser subpaths (./modern, ./high-level,
// ./keys, ./streaming, ./protocols, ./tokens) now use none of Node's API;
// this test keeps it that way. Only the Node-only parts below may.
import { expect } from "chai";
import { readdirSync, readFileSync } from "fs";
import * as path from "path";

const SRC = path.join(__dirname, "..", "src");

/** Node-only source, and why it may use Node's API. */
const NODE_ONLY: Record<string, string> = {
  "lib/": "the OpenPGP API, reached only from the main entry",
  "bin/": "the OpenPGP namespace, reached only from the main entry",
  "key/": "the file keystore, reached only from the main entry",
  "accel/worker-pool.ts": "Node worker threads (./accel)",
  "accel/webcrypto-bridge.ts": "imports node:crypto; reached only from ./accel",
  "accel/webcrypto-modern.ts": "imports node:crypto; reached only from ./accel",
  "accel/pq-backend.ts":
    "Buffer only on the native path, after node:crypto is found at run time",
};

const files = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => f.endsWith(".ts"))
  .filter((f) => !Object.keys(NODE_ONLY).some((p) => f.startsWith(p)));

/** Source without comments, so prose about Buffer does not count. */
const code = (file: string) =>
  readFileSync(path.join(SRC, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("browser-safe source", () => {
  it("has files to check", () => {
    expect(files.length).to.be.greaterThan(50);
  });

  it("uses no Buffer outside the Node-only parts", () => {
    const offenders = files.filter((f) => /\bBuffer\b/.test(code(f)));
    expect(offenders).to.deep.equal([]);
  });

  it("imports no Node built-in outside the Node-only parts", () => {
    // `import type` is erased at compile time, so it does not count.
    const builtin =
      /^import (?!type )[^;]*from "(node:[a-z_/]+|fs|fs\/promises|path|os|crypto|worker_threads)"/m;
    const offenders = files.filter((f) => builtin.test(code(f)));
    expect(offenders).to.deep.equal([]);
  });
});
