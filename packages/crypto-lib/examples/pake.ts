// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * PAKE (Password-Authenticated Key Exchange): OPAQUE-like protocol using
 * P-256 OPRF, HKDF-SHA256, and XChaCha20-Poly1305 for envelope encryption.
 *
 * Demonstrates the full PAKE flow:
 * - serverRegister: register a password (server never learns it)
 * - clientStartLogin: client initiates login with blinded password
 * - serverRespondLogin: server evaluates OPRF and responds
 * - clientFinishLogin: client derives session key and proves identity
 * - serverVerifyClient: server verifies client MAC for mutual auth
 *
 * Also demonstrates:
 * - Session key agreement (both sides derive the same key)
 * - Error case: wrong password
 *
 * Run: `npx ts-node examples/pake.ts`
 */

import { header, task, taskResult, summary } from "./support";
import { protocols } from "../src";

const { serverRegister, clientStartLogin, serverRespondLogin, clientFinishLogin, serverVerifyClient } =
  protocols.pake;

async function main() {
  header("crypto-lib -- pake");

  const password = "correct-horse-battery-staple";
  const serverId = "auth.example.com";

  // 1. Registration phase
  const record = await task("Server: register user password", () => {
    const reg = serverRegister(password, serverId);
    if (!reg.userPublicKey) throw new Error("Missing userPublicKey");
    if (!reg.serverPublicKey) throw new Error("Missing serverPublicKey");
    if (!reg.serverPrivateKey) throw new Error("Missing serverPrivateKey");
    if (!reg.envelope) throw new Error("Missing envelope");
    if (!reg.oprfSalt) throw new Error("Missing oprfSalt");
    if (reg.serverId !== serverId) throw new Error("Server ID mismatch");
    return reg;
  });

  // 2. Client starts login
  const { request, state: clientState } = await task("Client: start login (blind password)", () => {
    const result = clientStartLogin(password);
    if (!result.request.blindedElement) throw new Error("Missing blindedElement");
    if (!result.request.clientEphemeralPublic) throw new Error("Missing clientEphemeralPublic");
    if (!result.state.blind) throw new Error("Missing blind");
    if (!result.state.clientEphemeralPrivate) throw new Error("Missing clientEphemeralPrivate");
    return result;
  });

  // 3. Server processes login request
  const { response, state: serverState } = await task("Server: respond to login request", () => {
    const result = serverRespondLogin(request, record);
    if (!result.response.evaluatedElement) throw new Error("Missing evaluatedElement");
    if (!result.response.serverEphemeralPublic) throw new Error("Missing serverEphemeralPublic");
    if (!result.response.serverMac) throw new Error("Missing serverMac");
    if (!result.state.sessionKey) throw new Error("Missing server sessionKey");
    if (!result.state.expectedClientMac) throw new Error("Missing expectedClientMac");
    return result;
  });

  // 4. Client finishes login (derives session key)
  const clientResult = await task("Client: finish login (derive session key)", () => {
    const result = clientFinishLogin(response, clientState, serverId);
    if (!result.sessionKey) throw new Error("Missing sessionKey");
    if (!result.clientMac) throw new Error("Missing clientMac");
    if (result.algorithm !== "opaque-p256") throw new Error("Unexpected algorithm");
    return result;
  });

  // 5. Server verifies client MAC (mutual authentication)
  await task("Server: verify client MAC (mutual auth)", () => {
    const valid = serverVerifyClient(clientResult.clientMac, serverState);
    if (!valid) throw new Error("Client MAC verification failed");
  });

  // 6. Verify both sides derived the same session key
  await task("Verify: session keys match", () => {
    if (clientResult.sessionKey !== serverState.sessionKey) {
      throw new Error("Session key mismatch between client and server");
    }
    if (clientResult.sessionKey.length !== 64) {
      throw new Error("Expected 32-byte (64 hex) session key");
    }
  });

  // 7. Error case: wrong password
  await taskResult("Error: wrong password fails login", () => {
    const wrongPassword = "wrong-password-attempt";
    const { request: wrongReq, state: wrongState } = clientStartLogin(wrongPassword);
    const { response: wrongResp } = serverRespondLogin(wrongReq, record);
    try {
      clientFinishLogin(wrongResp, wrongState, serverId);
      throw new Error("Should have thrown");
    } catch (err) {
      if ((err as Error).message === "Should have thrown") throw err;
      // Expected: server authentication failed (MAC mismatch)
    }
  });

  // 8. Verify different sessions produce different keys
  await task("Verify: different sessions produce unique keys", () => {
    const { request: req2, state: state2 } = clientStartLogin(password);
    const { response: resp2, state: serverState2 } = serverRespondLogin(req2, record);
    const result2 = clientFinishLogin(resp2, state2, serverId);

    if (result2.sessionKey === clientResult.sessionKey) {
      throw new Error("Session keys should be unique per session");
    }
    if (result2.sessionKey !== serverState2.sessionKey) {
      throw new Error("New session key mismatch");
    }
  });

  summary(8);
}

main();
