/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Keys from POST /v2/keys/generate work with the post-quantum routes
 * that take a keyId. keys/generate stores the private key as
 * `privateKey`, while the PQ keygen routes store `secretKey`; the
 * signing and decapsulation routes used to read only `secretKey`, so a
 * generated ML-DSA or ML-KEM key was refused with 400 INVALID_HEX.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";

describe("POST /v2/keys/generate keys on the PQ routes", () => {
  let app: FastifyInstance;
  before(async () => {
    app = await init();
  });
  after(async () => {
    await app.close();
  });

  const post = (url: string, payload: object) =>
    app.inject({ method: "POST", url, payload });

  /** Generate a server-held key and return its id and public key. */
  async function generate(
    algorithm: string,
  ): Promise<{ keyId: string; publicKey: string }> {
    const res = await post("/v2/keys/generate", { algorithm });
    expect(res.statusCode).to.equal(200);
    return res.json().data;
  }

  for (const level of [44, 65, 87] as const) {
    it(`signs with a generated ml-dsa-${level} key`, async () => {
      const { keyId, publicKey } = await generate(`ml-dsa-${level}`);
      const message = "generated key";
      const signed = await post("/v2/pq/dsa/sign", { keyId, message });
      expect(signed.statusCode, signed.body).to.equal(200);
      const { signature } = signed.json().data;
      const verified = await post("/v2/pq/dsa/verify", {
        level,
        publicKey,
        message,
        signature,
      });
      expect(verified.statusCode).to.equal(200);
      expect(verified.json().data.valid).to.equal(true);
    });
  }

  it("decapsulates with a generated ml-kem-768 key", async () => {
    const { keyId, publicKey } = await generate("ml-kem-768");
    const enc = await post("/v2/pq/encapsulate", { publicKey });
    expect(enc.statusCode).to.equal(200);
    const { ciphertext, sharedSecret } = enc.json().data;
    const dec = await post("/v2/pq/decapsulate", { keyId, ciphertext });
    expect(dec.statusCode, dec.body).to.equal(200);
    expect(dec.json().data.sharedSecret).to.equal(sharedSecret);
  });
});
