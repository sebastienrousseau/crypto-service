/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * The hybrid X25519 + ML-KEM-768 routes used crypto-lib's pre-0.0.7
 * combiner, HKDF over the two shared secrets only, while crypto-lib's
 * hybridKemEncapsulate/Decapsulate (and crypto-mcp) use the v2 combiner,
 * which also binds the ciphertexts and public keys. Both were labelled
 * "x25519-ml-kem-768", yet their secrets never matched. The server now
 * uses v2 and says so in each response.
 */
import { expect } from "chai";
import type { FastifyInstance } from "fastify";
import {
  hybridKemDecapsulate,
  hybridKemEncapsulate,
  hybridKemKeygen,
} from "@sebastienrousseau/crypto-lib/modern";
import { init } from "../src/server";

describe("hybrid KEM routes use the v2 combiner", function () {
  this.timeout(60000);
  let app: FastifyInstance;
  before(async () => {
    app = await init({ logger: false });
  });
  after(async () => {
    await app.close();
  });
  const post = (url: string, payload: object) =>
    app.inject({ method: "POST", url, payload });

  it("encapsulates to a secret crypto-lib v2 decapsulates", async () => {
    const recipient = hybridKemKeygen(768);
    const res = await post("/v2/pq/hybrid/encapsulate", {
      x25519PublicKey: recipient.x25519PublicKey,
      mlKemPublicKey: recipient.mlKemPublicKey,
    });
    expect(res.statusCode).to.equal(200);
    const data = res.json().data;
    expect(data.combiner).to.equal("crypto-service/hybrid-kem/v2");
    const local = hybridKemDecapsulate(
      768,
      recipient.x25519PrivateKey,
      recipient.mlKemSecretKey,
      data.x25519EphemeralPublic,
      data.mlKemCiphertext,
    );
    expect(data.sharedSecret).to.equal(local.sharedSecret);
  });

  it("decapsulates a crypto-lib v2 encapsulation to a server-held key", async () => {
    const gen = await post("/v2/pq/hybrid/keygen", {});
    const { keyId, x25519PublicKey, mlKemPublicKey } = gen.json().data;
    const sent = hybridKemEncapsulate(768, x25519PublicKey, mlKemPublicKey);
    const res = await post("/v2/pq/hybrid/decapsulate", {
      keyId,
      x25519EphemeralPublic: sent.x25519EphemeralPublic,
      mlKemCiphertext: sent.mlKemCiphertext,
    });
    expect(res.statusCode).to.equal(200);
    expect(res.json().data.sharedSecret).to.equal(sent.sharedSecret);
    expect(res.json().data.combiner).to.equal("crypto-service/hybrid-kem/v2");
  });
});
