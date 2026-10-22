/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Without a WebAssembly module, hash() fell back to node:crypto after
// deleting the first dash from the name, so "sha3-256" became the unknown
// "sha3256" and "blake3", the example in its own documentation, was not
// available at all. benchmark(operation) timed SHA-256 whatever operation
// it was given and labelled the result with that operation. hash() now
// falls back to crypto-lib, and benchmark() times the hash it is asked
// for and refuses operations it cannot time.
import { expect } from "chai";
import { createHash } from "node:crypto";
import { hash as libHash } from "@sebastienrousseau/crypto-lib/modern";
import { WasmAccelerator } from "../src/accelerator";

const data = new TextEncoder().encode("abc");
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

async function rejection(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected a rejection");
}

describe("WasmAccelerator JS fallback", () => {
  const accel = new WasmAccelerator();

  it("hashes SHA-3 under its own name", async () => {
    expect(hex(await accel.hash("sha3-256", data))).to.equal(
      createHash("sha3-256").update(data).digest("hex"),
    );
  });

  it("hashes BLAKE3 and BLAKE2b", async () => {
    for (const algorithm of ["blake3", "blake2b"] as const) {
      expect(hex(await accel.hash(algorithm, data)), algorithm).to.equal(
        libHash({ algorithm, data }).digest,
      );
    }
  });

  it("still accepts the SHA-256 and SHA-512 spellings it took before", async () => {
    for (const [name, node] of [
      ["sha256", "sha256"],
      ["SHA-256", "sha256"],
      ["sha-512", "sha512"],
    ]) {
      expect(hex(await accel.hash(name!, data)), name).to.equal(
        createHash(node!).update(data).digest("hex"),
      );
    }
  });

  it("refuses an unknown algorithm", async () => {
    expect((await rejection(accel.hash("md5", data))).message).to.match(
      /Unsupported algorithm: md5/,
    );
  });
});

describe("WasmAccelerator.benchmark", () => {
  class Recording extends WasmAccelerator {
    readonly seen: string[] = [];
    override async hash(algorithm: string, input: Uint8Array) {
      this.seen.push(algorithm);
      return super.hash(algorithm, input);
    }
  }

  it("times the hash it is asked for", async () => {
    const accel = new Recording();
    const result = await accel.benchmark("hash-blake3", 3);
    expect(result.operation).to.equal("hash-blake3");
    expect(accel.seen).to.deep.equal(["blake3", "blake3", "blake3"]);
  });

  it("refuses operations it cannot time", async () => {
    const err = await rejection(
      new WasmAccelerator().benchmark("ed25519-sign"),
    );
    expect(err.message).to.equal(
      "benchmark supports hash-sha256, hash-sha512 and hash-blake3, not ed25519-sign",
    );
  });
});
