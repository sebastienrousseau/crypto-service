// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { executeTool } from "../src";
import { newKey } from "./helpers";

// Secret key material must not leave the process. Wrapping an existing
// key to public keys the caller chooses would send it out: a
// prompt-injected client could name its own keys as recipients and
// decapsulate the result elsewhere. crypto_hybrid_kem_multi_encapsulate
// therefore only wraps a fresh DEK, unless the operator sets
// MCP_ALLOW_KEY_EXPORT=1.

/** Public keys of a recipient whose secret keys live outside the server. */
function outsider() {
  const xSecret = x25519.utils.randomSecretKey();
  return {
    x25519PublicKey: Buffer.from(x25519.getPublicKey(xSecret)).toString("hex"),
    mlKemPublicKey: Buffer.from(ml_kem768.keygen().publicKey).toString("hex"),
  };
}

describe("key export through multi-recipient encapsulation", () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env["MCP_ALLOW_KEY_EXPORT"];
    delete process.env["MCP_ALLOW_KEY_EXPORT"];
  });
  afterEach(() => {
    if (saved === undefined) delete process.env["MCP_ALLOW_KEY_EXPORT"];
    else process.env["MCP_ALLOW_KEY_EXPORT"] = saved;
  });

  it("refuses to wrap an existing key handle by default", async () => {
    const existing = await newKey("symmetric-256");
    const res = await executeTool("crypto_hybrid_kem_multi_encapsulate", {
      keyHandle: existing.keyHandle,
      recipients: JSON.stringify([outsider()]),
    });
    expect(res.isError).to.equal(true);
    expect(res.content[0]?.text).to.match(/MCP_ALLOW_KEY_EXPORT/);
  });

  it("still wraps a fresh key for any recipients", async () => {
    const res = await executeTool("crypto_hybrid_kem_multi_encapsulate", {
      recipients: JSON.stringify([outsider()]),
    });
    expect(res.isError).to.not.equal(true);
  });

  it("wraps an existing key only when the operator allows export", async () => {
    process.env["MCP_ALLOW_KEY_EXPORT"] = "1";
    const existing = await newKey("symmetric-256");
    const res = await executeTool("crypto_hybrid_kem_multi_encapsulate", {
      keyHandle: existing.keyHandle,
      recipients: JSON.stringify([outsider()]),
    });
    expect(res.isError).to.not.equal(true);
  });

  for (const value of ["0", "true", "yes", ""]) {
    it(`treats MCP_ALLOW_KEY_EXPORT=${JSON.stringify(value)} as not allowed`, async () => {
      process.env["MCP_ALLOW_KEY_EXPORT"] = value;
      const existing = await newKey("symmetric-256");
      const res = await executeTool("crypto_hybrid_kem_multi_encapsulate", {
        keyHandle: existing.keyHandle,
        recipients: JSON.stringify([outsider()]),
      });
      expect(res.isError).to.equal(true);
    });
  }
});
