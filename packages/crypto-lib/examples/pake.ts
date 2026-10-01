// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * PAKE: OPAQUE-3DH (RFC 9807) with the P256-SHA256 suite and the default
 * scrypt key-stretching function.
 *
 * Demonstrates:
 * - Server setup and a fake record for unknown users
 * - Registration (the server never sees the password)
 * - Login: KE1 -> KE2 -> KE3, both sides derive the same session key
 * - Wire encoding of every message
 * - Error cases: wrong password, unknown user
 *
 * Run: `npx ts-node examples/pake.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { protocols } from "../src";

const { pake } = protocols;
const config = { context: "crypto-lib-example-v1" };
const equal = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

async function main() {
  header("crypto-lib -- pake (RFC 9807 OPAQUE-3DH)");

  const password = "correct-horse-battery-staple";
  const id = "alice@example.com";

  const setup = await task("Server: create long-term setup", () =>
    pake.createServerSetup(config),
  );
  const fake = pake.createFakeRecord(config);

  const record = await task("Register (client + server)", () => {
    const { request, blind } = pake.createRegistrationRequest(password, config);
    const response = pake.createRegistrationResponse(
      request,
      setup.serverPublicKey,
      id,
      setup.oprfSeed,
      config,
    );
    return pake.finalizeRegistrationRequest(
      password,
      blind,
      response,
      {},
      config,
    ).record;
  });

  /** Run one login; returns client and server session keys. */
  const login = (pw: string, rec = record) => {
    const client = pake.generateKE1(pw, config);
    const ke1 = pake.deserializeKE1(pake.serializeKE1(client.ke1));
    const server = pake.generateKE2(
      { ...setup, record: rec, credentialIdentifier: id, ke1 },
      config,
    );
    const ke2 = pake.deserializeKE2(pake.serializeKE2(server.ke2));
    const { ke3, sessionKey } = pake.generateKE3(client.state, ke2);
    return { sessionKey, serverKey: pake.serverFinish(server.state, ke3) };
  };

  const first = await task("Login: session keys match", () => {
    const result = login(password);
    if (!equal(result.sessionKey, result.serverKey)) {
      throw new Error("Session key mismatch");
    }
    return result;
  });

  await task("Login again: a fresh session key", () => {
    if (equal(login(password).sessionKey, first.sessionKey)) {
      throw new Error("Session keys should differ per login");
    }
  });

  await taskResult("Error: wrong password is rejected", () => {
    try {
      login("wrong-password");
    } catch {
      return;
    }
    throw new Error("Wrong password was accepted");
  });

  await taskResult("Error: unknown user fails like a wrong password", () => {
    try {
      login(password, fake);
    } catch {
      return;
    }
    throw new Error("Fake record was accepted");
  });

  summary(6);
}

main();
