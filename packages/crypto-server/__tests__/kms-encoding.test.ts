/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Byte encoding of KMS inputs. /v2/kms/encrypt and /v2/kms/wrap read a
 * string as hex when it looked like hex and as UTF-8 otherwise, so the
 * text "cafe" was encrypted as the two bytes 0xca 0xfe while "cafes" was
 * five bytes of text. encrypt now takes an explicit `encoding` (UTF-8 by
 * default), and wrap reads `unwrappedKey` as hex, the encoding unwrap
 * returns, refusing anything else.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";

describe("KMS input encoding", function () {
  this.timeout(60000);
  let app: FastifyInstance;
  let keyId: string;
  const post = (url: string, payload: object) =>
    app.inject({ method: "POST", url, payload });

  before(async () => {
    app = await init({ logger: false });
    keyId = (await post("/v2/kms/create-key", {})).json().data.keyId;
  });
  after(async () => {
    await app.close();
  });

  const roundTrip = async (payload: object) => {
    const enc = await post("/v2/kms/encrypt", { keyId, ...payload });
    expect(enc.statusCode).to.equal(200);
    const dec = await post("/v2/kms/decrypt", {
      keyId,
      ciphertext: enc.json().data.ciphertext,
    });
    return dec.json().data as { plaintext: string; hex: string };
  };

  it("encrypts text that looks like hex as text by default", async () => {
    const out = await roundTrip({ plaintext: "cafe" });
    expect(out).to.deep.include({ plaintext: "cafe", hex: "63616665" });
  });

  it("encrypts hex as bytes when encoding is hex", async () => {
    const out = await roundTrip({ plaintext: "cafe", encoding: "hex" });
    expect(out.hex).to.equal("cafe");
  });

  it("refuses an encoding: hex plaintext that is not hex", async () => {
    const res = await post("/v2/kms/encrypt", {
      keyId,
      plaintext: "not hex",
      encoding: "hex",
    });
    expect(res.statusCode).to.equal(400);
  });

  it("refuses an unknown encoding", async () => {
    const res = await post("/v2/kms/encrypt", {
      keyId,
      plaintext: "x",
      encoding: "latin1",
    });
    expect(res.statusCode).to.equal(400);
  });

  it("wraps a hex key and unwraps the same hex", async () => {
    const key = "00112233445566778899aabbccddeeff";
    const wrapped = await post("/v2/kms/wrap", { keyId, unwrappedKey: key });
    expect(wrapped.statusCode).to.equal(200);
    const unwrapped = await post("/v2/kms/unwrap", {
      keyId,
      wrappedKey: wrapped.json().data.wrappedKey,
    });
    expect(unwrapped.json().data.unwrappedKey).to.equal(key);
  });

  it("refuses a key to wrap that is not hex", async () => {
    const res = await post("/v2/kms/wrap", {
      keyId,
      unwrappedKey: "a passphrase, not a key",
    });
    expect(res.statusCode).to.equal(400);
  });
});
