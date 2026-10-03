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

  describe("stream multi-encrypt and multi-decrypt", () => {
    let aliceXPub: string;
    let aliceXSec: string;
    let aliceMlPub: string;
    let aliceMlSec: string;
    let bobXPub: string;
    let bobXSec: string;
    let bobMlPub: string;
    let bobMlSec: string;
    let recipientsFile: string;

    before(() => {
      const aX = generateKeyPair("x25519");
      aliceXPub = aX.publicKey;
      aliceXSec = aX.privateKey;
      const aMl = generateKeyPair("ml-kem-768");
      aliceMlPub = aMl.publicKey;
      aliceMlSec = aMl.privateKey;

      const bX = generateKeyPair("x25519");
      bobXPub = bX.publicKey;
      bobXSec = bX.privateKey;
      const bMl = generateKeyPair("ml-kem-768");
      bobMlPub = bMl.publicKey;
      bobMlSec = bMl.privateKey;

      recipientsFile = path.join(tempDir, "recipients.json");
      fs.writeFileSync(
        recipientsFile,
        JSON.stringify([
          {
            recipientId: "alice",
            recipientX25519Public: aliceXPub,
            recipientMlKemPublic: aliceMlPub,
          },
          {
            recipientId: "bob",
            recipientX25519Public: bobXPub,
            recipientMlKemPublic: bobMlPub,
          },
        ]),
        "utf8",
      );
    });

    it("encrypts with recipients JSON string and decrypts for both recipients", async () => {
      const recJson = JSON.stringify([
        {
          recipientId: "alice",
          recipientX25519Public: aliceXPub,
          recipientMlKemPublic: aliceMlPub,
        },
        {
          recipientId: "bob",
          recipientX25519Public: bobXPub,
          recipientMlKemPublic: bobMlPub,
        },
      ]);
      const enc = await runCli(
        ["stream", "multi-encrypt", "-r", recJson, "--json"],
        [plainText],
      );
      expect(enc.code).to.equal(EXIT.OK);
      const parsedEnc = JSON.parse(enc.stdout);
      expect(parsedEnc.recipientCount).to.equal(2);
      expect(parsedEnc.algorithm).to.equal(
        "multi-x25519-ml-kem-768-xchacha20-poly1305-stream",
      );

      // Decrypt as Alice with explicit recipient ID and JSON output
      const decAlice = await runCli(
        [
          "stream",
          "multi-decrypt",
          "-x",
          aliceXSec,
          "-m",
          aliceMlSec,
          "-i",
          "alice",
          "--json",
        ],
        [parsedEnc.ciphertext],
      );
      expect(decAlice.code).to.equal(EXIT.OK);
      const parsedAlice = JSON.parse(decAlice.stdout);
      expect(parsedAlice.recipientId).to.equal("alice");
      expect(
        Buffer.from(parsedAlice.plaintext, "base64").toString("utf8"),
      ).to.equal(plainText);

      // Decrypt as Bob without recipient ID (automatic slot discovery) to raw stdout
      const decBob = await runCli(
        ["stream", "multi-decrypt", "-x", bobXSec, "-m", bobMlSec],
        [parsedEnc.ciphertext],
      );
      expect(decBob.code).to.equal(EXIT.OK);
      expect(decBob.stdout).to.equal(plainText);
    });

    it("encrypts with recipients file and custom chunk size", async () => {
      const enc = await runCli([
        "stream",
        "multi-encrypt",
        plainFile,
        "-r",
        recipientsFile,
        "-c",
        "2048",
      ]);
      expect(enc.code).to.equal(EXIT.OK);
      const ciphertext = enc.stdout.trim();

      // Decrypt with explicit recipient ID and chunk size
      const decWithId = await runCli(
        [
          "stream",
          "multi-decrypt",
          "-x",
          bobXSec,
          "-m",
          bobMlSec,
          "-i",
          "bob",
          "-c",
          "2048",
        ],
        [ciphertext],
      );
      expect(decWithId.code).to.equal(EXIT.OK);
      expect(decWithId.stdout).to.equal(plainText);

      // Decrypt without recipient ID and with chunk size
      const decAuto = await runCli(
        [
          "stream",
          "multi-decrypt",
          "-x",
          aliceXSec,
          "-m",
          aliceMlSec,
          "-c",
          "2048",
        ],
        [ciphertext],
      );
      expect(decAuto.code).to.equal(EXIT.OK);
      expect(decAuto.stdout).to.equal(plainText);
    });

    it("rejects invalid chunk size values in multi-encrypt and multi-decrypt", async () => {
      const recJson = JSON.stringify([
        {
          recipientId: "alice",
          recipientX25519Public: aliceXPub,
          recipientMlKemPublic: aliceMlPub,
        },
      ]);
      const r1 = await runCli(
        ["stream", "multi-encrypt", "-r", recJson, "-c", "512"],
        [plainText],
      );
      expect(r1.code).to.equal(EXIT.USAGE);
      expect(r1.stderr).to.include(
        "--chunk-size must be an integer between 1024 and 16777216",
      );

      const r2 = await runCli(
        [
          "stream",
          "multi-decrypt",
          "-x",
          aliceXSec,
          "-m",
          aliceMlSec,
          "-c",
          "invalid",
        ],
        ["AQIDBA=="],
      );
      expect(r2.code).to.equal(EXIT.USAGE);
      expect(r2.stderr).to.include(
        "--chunk-size must be an integer between 1024 and 16777216",
      );
    });

    it("fails when recipients option is missing or invalid JSON", async () => {
      const r1 = await runCli(["stream", "multi-encrypt"], [plainText]);
      expect(r1.code).to.equal(EXIT.USAGE);
      expect(r1.stderr).to.include("missing recipients");

      const r2 = await runCli(
        ["stream", "multi-encrypt", "-r", "{not valid json"],
        [plainText],
      );
      expect(r2.code).to.equal(EXIT.USAGE);
      expect(r2.stderr).to.include("invalid JSON");

      const r3 = await runCli(
        ["stream", "multi-encrypt", "-r", "[]"],
        [plainText],
      );
      expect(r3.code).to.equal(EXIT.USAGE);
      expect(r3.stderr).to.include("non-empty array");

      const r4 = await runCli(
        [
          "stream",
          "multi-encrypt",
          "-r",
          JSON.stringify([{ bad: "recipient" }]),
        ],
        [plainText],
      );
      expect(r4.code).to.equal(EXIT.USAGE);
      expect(r4.stderr).to.include("each recipient must have recipientId");
    });

    it("fails when secrets are missing on multi-decrypt", async () => {
      const r1 = await runCli(["stream", "multi-decrypt"], ["data"]);
      expect(r1.code).to.equal(EXIT.USAGE);
      expect(r1.stderr).to.include("missing recipient secret key");

      const r2 = await runCli(
        ["stream", "multi-decrypt", "-x", aliceXSec],
        ["data"],
      );
      expect(r2.code).to.equal(EXIT.USAGE);
      expect(r2.stderr).to.include("missing recipient secret key");
    });

    it("fails when decryption fails on corrupted ciphertext or wrong key", async () => {
      const wrong = generateKeyPair("x25519");
      const r = await runCli(
        ["stream", "multi-decrypt", "-x", wrong.privateKey, "-m", aliceMlSec],
        ["AQIDBA=="],
      );
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.include("decryption failed");
    });
  });
});
