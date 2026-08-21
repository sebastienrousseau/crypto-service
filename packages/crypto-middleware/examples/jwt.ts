// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * JWT verification middleware.
 *
 * Verifies HS256 JWT tokens and demonstrates payload extraction,
 * expiration handling, and error cases.
 *
 * Run: `npx ts-node examples/jwt.ts`
 */

import { createHmac } from "node:crypto";
import { header, task, summary } from "./support";
import { verifyJwt, CryptoMiddlewareError } from "../src";

const JWT_SECRET = "my-secret";

/** Build a minimal HS256 JWT. */
function createJwt(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

async function main() {
  header("crypto-middleware -- jwt");

  await task("Verify valid HS256 JWT", async () => {
    const token = createJwt(
      { sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 },
      JWT_SECRET,
    );
    const payload = verifyJwt(JWT_SECRET, token);
    if (payload.sub !== "user-1") throw new Error("Expected sub=user-1");
  });

  await task("Reject expired JWT", async () => {
    const token = createJwt(
      { sub: "user-2", exp: Math.floor(Date.now() / 1000) - 60 },
      JWT_SECRET,
    );
    try {
      verifyJwt(JWT_SECRET, token);
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
      if (err.code !== "TOKEN_EXPIRED") throw new Error("Expected TOKEN_EXPIRED");
    }
  });

  await task("Reject missing token", async () => {
    try {
      verifyJwt(JWT_SECRET, "");
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
      if (err.code !== "MISSING_TOKEN") throw new Error("Expected MISSING_TOKEN");
    }
  });

  await task("Reject malformed token", async () => {
    try {
      verifyJwt(JWT_SECRET, "not.a.valid.jwt.token");
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
    }
  });

  summary(4);
}

main();
