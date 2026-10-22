/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// A task that failed in a worker came back as a plain Error with only the
// message, so a CryptoError lost its code and a RangeError its class, and
// crypto-server could no longer tell bad input from a fault for the work
// it runs in workers (password decryption and verification, KDFs). The
// worker now sends the error's name and code, and the pool rebuilds it.
import { expect } from "chai";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { WorkerPool } from "../../src/accel/worker-pool";
import { CryptoError } from "../../src/errors";

const MODULE = `
exports.cryptoError = () => {
  const e = new Error("Key must be 32 bytes");
  e.name = "CryptoError";
  e.code = "INVALID_KEY";
  throw e;
};
exports.rangeError = () => {
  throw new RangeError("expected Uint8Array of length 32, got length=4");
};
exports.plainError = () => {
  throw new Error("something broke");
};
`;

describe("WorkerPool errors keep their class and code", function () {
  this.timeout(30000);
  let modulePath: string;
  let pool: WorkerPool;

  before(() => {
    modulePath = path.join(os.tmpdir(), `pool-errors-${process.pid}.cjs`);
    fs.writeFileSync(modulePath, MODULE);
    pool = new WorkerPool({ size: 1 });
  });

  after(async () => {
    await pool.shutdown();
    fs.unlinkSync(modulePath);
  });

  async function failure(functionName: string): Promise<Error> {
    try {
      await pool.execute({ modulePath, functionName, args: [] });
    } catch (e) {
      return e as Error;
    }
    throw new Error("expected a rejection");
  }

  it("rebuilds a CryptoError with its code", async () => {
    const err = await failure("cryptoError");
    expect(err).to.be.instanceOf(CryptoError);
    expect((err as CryptoError).code).to.equal("INVALID_KEY");
    expect(err.message).to.equal("Key must be 32 bytes");
  });

  it("rebuilds a RangeError", async () => {
    const err = await failure("rangeError");
    expect(err).to.be.instanceOf(RangeError);
    expect(err.message).to.match(/length 32/);
  });

  it("leaves any other error a plain Error", async () => {
    const err = await failure("plainError");
    expect(err).to.not.be.instanceOf(CryptoError);
    expect(err).to.not.be.instanceOf(RangeError);
    expect(err.message).to.equal("something broke");
  });
});
