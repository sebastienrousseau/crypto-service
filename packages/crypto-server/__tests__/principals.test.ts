/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Principal identity. Server-held keys belong to `auth.sub`, so a token
 * without a usable `sub` would share an owner with every other such token,
 * and a token whose `sub` is a built-in principal name ("api-key",
 * "anonymous") would share that principal's keys.
 */
import { expect } from "chai";
import { init } from "../src/server";
import { JWT_ENV, claims, mint, withEnv } from "./support/auth";

describe("principal identity", function () {
  this.timeout(30000);

  async function status(token: string): Promise<number> {
    return withEnv(JWT_ENV, async () => {
      const app = await init();
      try {
        const res = await app.inject({
          method: "POST",
          url: "/v2/hash",
          headers: { authorization: `Bearer ${token}` },
          payload: { data: "x", algorithm: "sha256" },
        });
        return res.statusCode;
      } finally {
        await app.close();
      }
    });
  }

  it("accepts a token with a subject", async () => {
    expect(await status(mint(claims()))).to.equal(200);
  });

  it("rejects a token without a subject", async () => {
    const c = claims();
    delete c["sub"];
    expect(await status(mint(c))).to.equal(401);
  });

  for (const sub of ["", 42, null, ["svc"]]) {
    it(`rejects a token whose subject is ${JSON.stringify(sub)}`, async () => {
      expect(await status(mint(claims({ sub })))).to.equal(401);
    });
  }

  for (const sub of ["api-key", "anonymous"]) {
    it(`rejects a token claiming the built-in principal "${sub}"`, async () => {
      expect(await status(mint(claims({ sub })))).to.equal(401);
    });
  }
});
