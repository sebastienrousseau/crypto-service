/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * The v1 OpenPGP routes wrote private keys to CRYPTO_KEY_OUT_DIR as a side
 * effect of crypto-lib's generate() and revoke(): /v1/generate wrote the
 * new private key to a fixed file name (rsa.key, ecc.key ...) that the next
 * call by any tenant overwrote, and /v1/revoke wrote the server's own
 * private key there. The files were plaintext whatever
 * CRYPTO_KEY_STORAGE_KEY said, and no route ever read them back. The
 * server now generates and revokes without writing anything.
 */
import { expect } from "chai";
import { mkdtempSync, readdirSync, rmSync } from "fs";
import { createRequire } from "module";
import { tmpdir } from "os";
import * as path from "path";
import { init } from "../src/server";
import { withEnv } from "./support/auth";

const { _resetKeystoreForTests } = createRequire(__filename)(
  path.join(
    path.dirname(require.resolve("@sebastienrousseau/crypto-lib")),
    "key",
    "keystore.js",
  ),
) as { _resetKeystoreForTests: () => void };

const FIXTURE_KEYS = path.resolve(
  __dirname,
  "..",
  "..",
  "crypto-lib",
  "__tests__",
  "fixtures",
  "keys",
);

describe("v1 routes do not write key files", function () {
  this.timeout(120000);
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "v1-out-"));
    _resetKeystoreForTests();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    _resetKeystoreForTests();
  });

  const run = (url: string, payload: object) =>
    withEnv(
      {
        CRYPTO_KEY_OUT_DIR: dir,
        CRYPTO_KEY_DIR: FIXTURE_KEYS,
        CRYPTO_KEY_ALLOW_PLAINTEXT: "1",
      },
      async () => {
        const app = await init({ logger: false });
        try {
          return await app.inject({ method: "POST", url, payload });
        } finally {
          await app.close();
        }
      },
    );

  it("/v1/generate returns the public key and writes nothing", async () => {
    const res = await run("/v1/generate", {
      name: "Test",
      email: "test@example.com",
      type: "ecc",
      passphrase: "gen-test-pass",
      curve: "curve25519",
      format: "armored",
    });
    expect(res.statusCode).to.equal(200);
    expect(res.json().data.publicKey).to.include("PUBLIC KEY");
    expect(readdirSync(dir)).to.deep.equal([]);
  });

  it("/v1/revoke returns the revoked public key and writes nothing", async () => {
    const res = await run("/v1/revoke", {
      passphrase: "123456789abcdef",
      flag: 0,
      reason: "test",
    });
    expect(res.statusCode).to.equal(200);
    expect(readdirSync(dir)).to.deep.equal([]);
  });
});
