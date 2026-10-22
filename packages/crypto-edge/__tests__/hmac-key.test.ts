/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// sign and verify accepted an HMAC key of any length, the empty key
// included. Like crypto-lib, they now refuse keys shorter than 16 bytes.
import { expect } from "chai";
import { sign, verify } from "../src/webcrypto";

const data = new TextEncoder().encode("message");

async function rejection(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected a rejection");
}

describe("HMAC key length", () => {
  for (const length of [0, 1, 15]) {
    it(`refuses a ${length}-byte key`, async () => {
      const key = new Uint8Array(length);
      const message = `HMAC key must be at least 16 bytes, got ${length}`;
      expect((await rejection(sign({ key, data }))).message).to.equal(message);
      expect(
        (await rejection(verify({ key, data, signature: new Uint8Array(32) })))
          .message,
      ).to.equal(message);
    });
  }

  it("accepts a 16-byte key", async () => {
    const key = new Uint8Array(16).fill(7);
    const signature = await sign({ key, data });
    expect(await verify({ key, data, signature })).to.equal(true);
  });
});
