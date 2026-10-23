/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * The v1 handlers answered a failed field validation and then returned
 * undefined from an async handler. Fastify then ran its error path on a
 * reply that was already sent and logged FST_ERR_REP_ALREADY_SENT for
 * every such request (84 times in one CI run). A handler that has
 * replied must return the reply.
 */
import { expect } from "chai";
import { Writable } from "stream";
import { init } from "../src/server";

/** Bodies that pass each route's JSON schema but fail its own checks. */
const CASES: Array<[string, Record<string, unknown>]> = [
  ["/v1/encrypt", { passphrase: " ", message: " ", publicKey: " " }],
  ["/v1/decrypt", { passphrase: " ", message: " ", publicKey: " " }],
  ["/v1/verify", { date: " ", message: " ", verificationKeys: " " }],
  ["/v1/revoke", { passphrase: " ", flag: 0, reason: " " }],
  [
    "/v1/generate",
    {
      name: " ",
      email: "a@b.c",
      type: "ecc",
      passphrase: " ",
      curve: "ed25519",
    },
  ],
];

describe("v1 handlers return the reply they sent", function () {
  this.timeout(30000);

  for (const [url, payload] of CASES) {
    it(`${url} answers a failed validation without a second reply`, async () => {
      const lines: string[] = [];
      const stream = new Writable({
        write(chunk, _enc, done) {
          lines.push(String(chunk));
          done();
        },
      });
      const app = await init({ logger: { level: "warn", stream } });
      try {
        const res = await app.inject({ method: "POST", url, payload });
        expect(res.statusCode, res.body).to.equal(400);
        expect(res.json().errors, res.body).to.be.an("array");
        expect(lines.join("")).to.not.include("FST_ERR_REP_ALREADY_SENT");
      } finally {
        await app.close();
      }
    });
  }
});
