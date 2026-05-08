// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Webhook signature verification middleware.
 *
 * Verifies incoming webhook payloads using HMAC-SHA256 signatures,
 * similar to GitHub's webhook verification (x-hub-signature-256).
 *
 * Run: `npx ts-node examples/webhook.ts`
 */

import { header, task, summary } from "./support";
import { verifyHmacSignature, CryptoMiddlewareError } from "../src";
import { computeHmac } from "@sebastienrousseau/crypto-lib";

const HMAC_KEY =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

async function main() {
  header("crypto-middleware -- webhook");

  await task("Verify valid HMAC-SHA256 signature", async () => {
    const body = '{"event":"push","ref":"refs/heads/main"}';
    const { mac } = computeHmac({ algorithm: "sha256", key: HMAC_KEY, data: body });
    const valid = verifyHmacSignature(HMAC_KEY, body, mac);
    if (!valid) throw new Error("Signature should be valid");
  });

  await task("Verify sha256= prefixed signature (GitHub format)", async () => {
    const body = '{"action":"completed"}';
    const { mac } = computeHmac({ algorithm: "sha256", key: HMAC_KEY, data: body });
    const valid = verifyHmacSignature(HMAC_KEY, body, `sha256=${mac}`);
    if (!valid) throw new Error("Prefixed signature should be valid");
  });

  await task("Reject invalid signature", async () => {
    const body = '{"event":"push"}';
    try {
      verifyHmacSignature(HMAC_KEY, body, "deadbeef".repeat(8));
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
      if (err.code !== "INVALID_SIGNATURE") throw new Error("Expected INVALID_SIGNATURE");
    }
  });

  await task("Reject missing signature", async () => {
    try {
      verifyHmacSignature(HMAC_KEY, "body", "");
      throw new Error("Should have thrown");
    } catch (err) {
      if (!(err instanceof CryptoMiddlewareError)) throw err;
      if (err.code !== "MISSING_SIGNATURE") throw new Error("Expected MISSING_SIGNATURE");
    }
  });

  summary(4);
}

main();
