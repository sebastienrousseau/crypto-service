/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// About 150 of crypto-lib's errors were plain Errors, so callers (and
// crypto-server) could tell bad input from a fault only by matching
// message text. Every error crypto-lib raises itself is now a CryptoError
// with a code, and isCallerErrorCode says which codes mean the caller's
// input was at fault.
import { expect } from "chai";
import { readdirSync, readFileSync } from "fs";
import * as path from "path";
import {
  CryptoError,
  CryptoErrorCode,
  OpaqueErrorCode,
  isCallerErrorCode,
} from "../src/errors";
import { hash } from "../src/modern/hash";
import { hpkeOpen } from "../src/modern/hpke";
import * as secretbox from "../src/high-level/secretbox";
import { streamDecrypt, streamEncrypt } from "../src/streaming/stream-aead";
import { v4local } from "../src/tokens/paseto";

/** The CryptoError `fn` throws. */
function thrown(fn: () => unknown): CryptoError {
  try {
    fn();
  } catch (e) {
    expect(e).to.be.instanceOf(CryptoError);
    return e as CryptoError;
  }
  throw new Error("expected an error");
}

describe("CryptoError codes", () => {
  it("separates caller errors from library faults", () => {
    for (const code of [
      CryptoErrorCode.INVALID_KEY,
      CryptoErrorCode.INVALID_HEX,
      CryptoErrorCode.INVALID_CIPHERTEXT,
      CryptoErrorCode.AUTH_FAILED,
      CryptoErrorCode.UNSUPPORTED_ALGORITHM,
      CryptoErrorCode.INVALID_INPUT,
      CryptoErrorCode.INVALID_TOKEN,
      CryptoErrorCode.INVALID_STATE,
      ...Object.values(OpaqueErrorCode),
    ]) {
      expect(isCallerErrorCode(code), code).to.equal(true);
    }
    for (const code of [
      CryptoErrorCode.BUFFER_DESTROYED,
      CryptoErrorCode.CONFIGURATION,
      "SOMETHING_ELSE",
    ]) {
      expect(isCallerErrorCode(code), code).to.equal(false);
    }
  });

  it("gives representative failures their codes", () => {
    const key = "aa".repeat(32);
    expect(thrown(() => secretbox.seal("zz", "x")).code).to.equal(
      "INVALID_HEX",
    );
    expect(thrown(() => secretbox.seal("aa", "x")).code).to.equal(
      "INVALID_KEY",
    );
    expect(
      thrown(() => hash({ data: "x", algorithm: "md5" as never })).code,
    ).to.equal("UNSUPPORTED_ALGORITHM");
    const { ciphertext } = streamEncrypt({
      key,
      plaintext: new Uint8Array(3000),
      chunkSize: 1024,
    });
    expect(
      thrown(() =>
        streamDecrypt({
          key,
          ciphertext: ciphertext.subarray(0, 24 + 1041),
          chunkSize: 1024,
        }),
      ).code,
    ).to.equal("INVALID_CIPHERTEXT");
    const { token } = v4local.encrypt({
      key,
      payload: { exp: "2000-01-01T00:00:00Z" },
    });
    expect(thrown(() => v4local.decrypt({ key, token })).code).to.equal(
      "INVALID_TOKEN",
    );
    expect(
      thrown(() =>
        hpkeOpen({
          recipientPrivateKey: "00".repeat(31),
          encapsulatedKey: "00".repeat(1120),
          ciphertext: "00",
          suite: { kem: "x-wing" },
        }),
      ).code,
    ).to.equal("INVALID_KEY");
  });

  // The only plain Error left is in the worker's inline script, which runs
  // in a separate thread where CryptoError does not exist.
  it("leaves no plain `throw new Error(` in crypto-lib's source", () => {
    const src = path.join(__dirname, "..", "src");
    const offenders = readdirSync(src, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".ts"))
      .flatMap((file) =>
        (
          readFileSync(path.join(src, file), "utf8").match(
            /throw new Error\(/g,
          ) ?? []
        ).map(() => file.split(path.sep).join("/")),
      );
    expect(offenders).to.deep.equal(["accel/worker-pool.ts"]);
  });
});
