/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Security regression tests for src/protocols/pake.ts. The attacks below
// succeeded against the implementation shipped before 0.0.7.

import { expect } from "chai";
import * as pake from "../../src/protocols/pake";
import { p256, p256_hasher } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const point = (h: string) => p256.Point.fromHex(h);

/** RFC 9497 § 4.3 HashToGroup DST for P256-SHA256 in OPRF mode (0x00). */
const OPRF_DST = Buffer.from("HashToGroup-OPRFV1-\x00-P256-SHA256", "latin1");

/** The pre-0.0.7 "hash to point" scalar: HKDF(password, salt) reduced mod n. */
function oldHashToScalar(password: string, salt: Uint8Array): bigint {
  const expanded = hkdf(
    sha256,
    Buffer.from(password, "utf8"),
    salt,
    new TextEncoder().encode("opaque-p256-oprf-scalar"),
    48,
  );
  const n = p256.Point.Fn.ORDER;
  let s = BigInt(0);
  for (const b of expanded) s = (s * BigInt(256) + BigInt(b)) % n;
  return s;
}

function login(password: string, record: pake.RegistrationRecord) {
  const start = pake.clientStartLogin(password);
  const server = pake.serverRespondLogin(start.request, record);
  return { start, server };
}

describe("PAKE security regressions", () => {
  const serverId = "auth.example";
  const password = "correct horse battery staple";

  it("record does not let an attacker test password guesses from userPublicKey", () => {
    const record = pake.serverRegister(password, serverId);
    // Before 0.0.7 the record stored H(pw)·G with H a public function of (pw, oprfSalt), so
    // each guess could be checked offline against the record.
    const guess = p256.Point.BASE.multiply(
      oldHashToScalar(password, Buffer.from(record.oprfSalt, "hex")),
    );
    expect(point(record.userPublicKey).equals(guess)).to.equal(false);
  });

  it("blinds RFC 9380 hash-to-curve of the password, not a multiple of G", () => {
    const { request, state } = pake.clientStartLogin(password);
    const blind = p256.Point.Fn.fromBytes(Buffer.from(state.blind, "hex"));
    const expected = p256_hasher
      .hashToCurve(Buffer.from(password, "utf8"), { DST: OPRF_DST })
      .multiply(blind);
    expect(point(request.blindedElement).equals(expected)).to.equal(true);
  });

  it("completes a login with the correct password", () => {
    const record = pake.serverRegister(password, serverId);
    const { start, server } = login(password, record);
    const client = pake.clientFinishLogin(
      server.response,
      start.state,
      serverId,
    );
    expect(client.sessionKey).to.equal(server.state.sessionKey);
    expect(pake.serverVerifyClient(client.clientMac, server.state)).to.equal(
      true,
    );
  });

  it("rejects a client that does not know the password", () => {
    const record = pake.serverRegister(password, serverId);
    // Before 0.0.7 every key was derived from the ephemeral ECDH alone, so anyone
    // could compute a valid client MAC without the password.
    const { start, server } = login("not the password", record);
    const ecdh = point(server.response.serverEphemeralPublic).multiply(
      p256.Point.Fn.fromBytes(
        Buffer.from(start.state.clientEphemeralPrivate, "hex"),
      ),
    );
    const derived = hkdf(
      sha256,
      ecdh.toBytes(false),
      Buffer.from(serverId, "utf8"),
      new TextEncoder().encode("opaque-session"),
      96,
    );
    const forged = hmac(
      sha256,
      derived.subarray(64, 96),
      Buffer.concat([
        point(server.response.serverEphemeralPublic).toBytes(false),
        point(start.request.clientEphemeralPublic).toBytes(false),
      ]),
    );
    expect(pake.serverVerifyClient(hex(forged), server.state)).to.equal(false);
    expect(() =>
      pake.clientFinishLogin(server.response, start.state, serverId),
    ).to.throw("Authentication failed");
  });

  it("rejects a tampered server MAC", () => {
    const record = pake.serverRegister(password, serverId);
    const { start, server } = login(password, record);
    const mac = Buffer.from(server.response.serverMac, "hex");
    mac[0] ^= 1;
    const response = { ...server.response, serverMac: hex(mac) };
    expect(() =>
      pake.clientFinishLogin(response, start.state, serverId),
    ).to.throw("Server authentication failed");
  });

  it("rejects a session for a different server identity", () => {
    const record = pake.serverRegister(password, serverId);
    const { start, server } = login(password, record);
    expect(() =>
      pake.clientFinishLogin(server.response, start.state, "evil.example"),
    ).to.throw("Authentication failed");
  });
});
