/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// v4.local decrypt and v4.public verify returned any authentic payload,
// so a token past its `exp`, before its `nbf` or issued in the future was
// accepted. They now check those registered claims (RFC 3339 dates, as the
// PASETO specification defines them) against `now` (default: the current
// time), and refuse a claim that is not a valid date.
import { expect } from "chai";
import { ed25519 } from "@noble/curves/ed25519.js";
import { v4local, v4public } from "../../src/tokens/paseto";

const key = "aa".repeat(32);
const seed = Buffer.from("bb".repeat(32), "hex");
const pk = ed25519.getPublicKey(seed);
const secretKey = Buffer.concat([seed, pk]).toString("hex");
const publicKey = Buffer.from(pk).toString("hex");

const NOW = new Date("2026-06-01T12:00:00Z");
const local = (payload: Record<string, unknown>) =>
  v4local.encrypt({ key, payload }).token;

describe("PASETO time claims", () => {
  it("accepts a token inside its validity window", () => {
    const token = local({
      sub: "u",
      iat: "2026-06-01T11:00:00Z",
      nbf: "2026-06-01T11:00:00Z",
      exp: "2026-06-01T13:00:00+00:00",
    });
    expect(v4local.decrypt({ key, token, now: NOW }).payload["sub"]).to.equal(
      "u",
    );
  });

  it("refuses an expired token", () => {
    const token = local({ exp: "2026-06-01T11:59:59Z" });
    expect(() => v4local.decrypt({ key, token, now: NOW })).to.throw(
      "Token expired",
    );
  });

  it("treats exp as exclusive", () => {
    const token = local({ exp: "2026-06-01T12:00:00Z" });
    expect(() => v4local.decrypt({ key, token, now: NOW })).to.throw(
      "Token expired",
    );
  });

  it("refuses a token before its nbf", () => {
    const token = local({ nbf: "2026-06-01T12:00:01Z" });
    expect(() => v4local.decrypt({ key, token, now: NOW })).to.throw(
      "Token not yet valid",
    );
  });

  it("refuses a token issued in the future", () => {
    const token = local({ iat: "2026-06-01T12:00:01Z" });
    expect(() => v4local.decrypt({ key, token, now: NOW })).to.throw(
      "Token issued in the future",
    );
  });

  it("refuses a time claim that is not an RFC 3339 date", () => {
    for (const exp of ["tomorrow", 1790000000, "2026-06-01", null]) {
      const token = local({ exp });
      expect(
        () => v4local.decrypt({ key, token, now: NOW }),
        String(exp),
      ).to.throw("Invalid exp claim");
    }
  });

  it("checks against the current time by default", () => {
    const token = local({ exp: "2000-01-01T00:00:00Z" });
    expect(() => v4local.decrypt({ key, token })).to.throw("Token expired");
  });

  it("checks v4.public tokens too", () => {
    const { token } = v4public.sign({
      secretKey,
      payload: { exp: "2026-06-01T11:00:00Z" },
    });
    expect(() => v4public.verify({ publicKey, token, now: NOW })).to.throw(
      "Token expired",
    );
    expect(
      v4public.verify({
        publicKey,
        token,
        now: new Date("2026-06-01T10:00:00Z"),
      }).payload,
    ).to.deep.equal({ exp: "2026-06-01T11:00:00Z" });
  });
});
