/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { generateKeyPair } from "@sebastienrousseau/crypto-lib/keys";
import { EXIT } from "../../src/program/index";
import { runCli } from "./helpers";

describe("crypto-cli stream", function () {
  this.timeout(60000);

  const tempDir = path.join(
    os.tmpdir(),
    `crypto-cli-stream-test-${process.pid}`,
  );
  const plainFile = path.join(tempDir, "plaintext.txt");
  const plainText =
    "The quick brown fox jumps over the lazy dog. Hybrid post-quantum streams!";

  let xPublic: string;
  let xSecret: string;
  let mlKemPublic: string;
  let mlKemSecret: string;

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(plainFile, plainText, "utf8");

    const xKey = generateKeyPair("x25519");
    xPublic = xKey.publicKey;
    xSecret = xKey.privateKey;

    const kemKey = generateKeyPair("ml-kem-768");
    mlKemPublic = kemKey.publicKey;
    mlKemSecret = kemKey.privateKey;
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("encrypts and decrypts round-trip via pipes and defaults", async () => {
    const enc = await runCli(
      ["stream", "encrypt", "-x", xPublic, "-m", mlKemPublic],
      [plainText],
    );
    expect(enc.code).to.equal(EXIT.OK);
    expect(enc.stdout).to.be.a("string");
    const ciphertext = enc.stdout.trim();

    const dec = await runCli(
      ["stream", "decrypt", "-x", xSecret, "-m", mlKemSecret],
      [ciphertext],
    );
    expect(dec.code).to.equal(EXIT.OK);
    expect(dec.stdout).to.equal(plainText);
  });

  it("encrypts with --json and decrypts with file input and custom chunk size", async () => {
    const enc = await runCli([
      "stream",
      "encrypt",
      plainFile,
      "-x",
      xPublic,
      "-m",
      mlKemPublic,
      "-c",
      "128",
      "--json",
    ]);
    expect(enc.code).to.equal(EXIT.OK);
    const encJson = JSON.parse(enc.stdout);
    expect(encJson).to.have.property("ciphertext");
    expect(encJson.algorithm).to.equal(
      "x25519-ml-kem-768-xchacha20-poly1305-stream",
    );

    const dec = await runCli(
      [
        "stream",
        "decrypt",
        "-x",
        xSecret,
        "-m",
        mlKemSecret,
        "-c",
        "128",
        "--json",
      ],
      [enc.stdout],
    );
    expect(dec.code).to.equal(EXIT.OK);
    const decJson = JSON.parse(dec.stdout);
    expect(decJson.encoding).to.equal("base64");
    expect(decJson.algorithm).to.equal("x25519-ml-kem-768-xchacha20-poly1305");
    const decoded = Buffer.from(decJson.plaintext, "base64").toString("utf8");
    expect(decoded).to.equal(plainText);
  });

  it("fails when recipient public keys are missing on encrypt", async () => {
    const r1 = await runCli(["stream", "encrypt"], ["data"]);
    expect(r1.code).to.equal(EXIT.USAGE);
    expect(r1.stderr).to.include("missing recipient public key");

    const r2 = await runCli(["stream", "encrypt", "-x", xPublic], ["data"]);
    expect(r2.code).to.equal(EXIT.USAGE);
    expect(r2.stderr).to.include("missing recipient public key");
  });

  it("fails when recipient secret keys are missing on decrypt", async () => {
    const r1 = await runCli(["stream", "decrypt"], ["data"]);
    expect(r1.code).to.equal(EXIT.USAGE);
    expect(r1.stderr).to.include("missing recipient secret key");

    const r2 = await runCli(["stream", "decrypt", "-x", xSecret], ["data"]);
    expect(r2.code).to.equal(EXIT.USAGE);
    expect(r2.stderr).to.include("missing recipient secret key");
  });

  it("rejects invalid chunk size values", async () => {
    const r1 = await runCli(
      ["stream", "encrypt", "-x", xPublic, "-m", mlKemPublic, "-c", "invalid"],
      ["data"],
    );
    expect(r1.code).to.equal(EXIT.USAGE);
    expect(r1.stderr).to.include("--chunk-size must be an integer >= 64");

    const r2 = await runCli(
      ["stream", "encrypt", "-x", xPublic, "-m", mlKemPublic, "-c", "32"],
      ["data"],
    );
    expect(r2.code).to.equal(EXIT.USAGE);
    expect(r2.stderr).to.include("--chunk-size must be an integer >= 64");
  });

  it("fails with exit code 1 on invalid base64 input in decrypt", async () => {
    const r = await runCli(
      ["stream", "decrypt", "-x", xSecret, "-m", mlKemSecret],
      ["not!base64!valid"],
    );
    expect(r.code).to.equal(EXIT.FAILURE);
    expect(r.stderr).to.include("not base64 from crypto-cli stream encrypt");
  });

  it("fails with exit code 1 on wrong key or corrupted ciphertext", async () => {
    const enc = await runCli(
      ["stream", "encrypt", "-x", xPublic, "-m", mlKemPublic],
      [plainText],
    );
    const ciphertext = enc.stdout.trim();

    // Wrong X25519 secret
    const wrongX = generateKeyPair("x25519");
    const rWrong = await runCli(
      ["stream", "decrypt", "-x", wrongX.privateKey, "-m", mlKemSecret],
      [ciphertext],
    );
    expect(rWrong.code).to.equal(EXIT.FAILURE);
    expect(rWrong.stderr).to.include("decryption failed");

    // Corrupted ciphertext
    const corrupted = Buffer.from(ciphertext, "base64");
    corrupted[corrupted.length - 5] ^= 0xff;
    const rCorrupt = await runCli(
      ["stream", "decrypt", "-x", xSecret, "-m", mlKemSecret],
      [corrupted.toString("base64")],
    );
    expect(rCorrupt.code).to.equal(EXIT.FAILURE);
    expect(rCorrupt.stderr).to.include("decryption failed");
  });
});
