/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { runCli } from "./helpers";
import { EXIT } from "../../src/program/io";

describe("crypto-cli hpke", () => {
  describe("hpke keygen", () => {
    it("generates post-quantum hybrid keypair by default", async () => {
      const { code, stdout } = await runCli(["hpke", "keygen"]);
      expect(code).to.equal(EXIT.OK);
      expect(stdout).to.include("Algorithm:   x25519-ml-kem-768");
      expect(stdout).to.include("Public Key:");
      expect(stdout).to.include("Private Key:");
    });

    it("generates keypair with --json flag", async () => {
      const { code, stdout } = await runCli(["hpke", "keygen", "--json"]);
      expect(code).to.equal(EXIT.OK);
      const data = JSON.parse(stdout);
      expect(data.kem).to.equal("x25519-ml-kem-768");
      expect(data).to.have.property("publicKey");
      expect(data).to.have.property("privateKey");
    });

    it("generates classical x25519 keypair", async () => {
      const { code, stdout } = await runCli([
        "hpke",
        "keygen",
        "--kem",
        "x25519",
        "--json",
      ]);
      expect(code).to.equal(EXIT.OK);
      const data = JSON.parse(stdout);
      expect(data.kem).to.equal("x25519");
      expect(data.publicKey).to.have.length(64);
    });

    it("generates classical p256 keypair", async () => {
      const { code, stdout } = await runCli([
        "hpke",
        "keygen",
        "--kem",
        "p256",
        "--json",
      ]);
      expect(code).to.equal(EXIT.OK);
      const data = JSON.parse(stdout);
      expect(data.kem).to.equal("p256");
      expect(data.publicKey).to.be.a("string");
    });
  });

  describe("hpke seal and hpke open", () => {
    it("round-trips post-quantum hybrid message over stdin with JSON and text outputs", async () => {
      const keygen = await runCli(["hpke", "keygen", "--json"]);
      const kp = JSON.parse(keygen.stdout);

      // Seal via stdin with text output
      const sealText = await runCli(
        ["hpke", "seal", "-p", kp.publicKey],
        ["hello post-quantum hpke"],
      );
      expect(sealText.code).to.equal(EXIT.OK);
      expect(sealText.stdout).to.include("Encapsulated:");
      expect(sealText.stdout).to.include("Ciphertext:");

      // Seal via stdin with JSON output
      const sealJson = await runCli(
        ["hpke", "seal", "-p", kp.publicKey, "--json"],
        ["hello post-quantum hpke"],
      );
      expect(sealJson.code).to.equal(EXIT.OK);
      const sealed = JSON.parse(sealJson.stdout);
      expect(sealed).to.have.property("encapsulatedKey");
      expect(sealed).to.have.property("ciphertext");

      // Open via JSON input
      const openJson = await runCli(
        [
          "hpke",
          "open",
          "-s",
          kp.privateKey,
          "-e",
          sealed.encapsulatedKey,
          "--json",
        ],
        [JSON.stringify({ ciphertext: sealed.ciphertext })],
      );
      expect(openJson.code).to.equal(EXIT.OK);
      const opened = JSON.parse(openJson.stdout);
      expect(opened.plaintext).to.equal("hello post-quantum hpke");

      // Open with bare ciphertext text
      const openBare = await runCli(
        ["hpke", "open", "-s", kp.privateKey, "-e", sealed.encapsulatedKey],
        [sealed.ciphertext],
      );
      expect(openBare.code).to.equal(EXIT.OK);
      expect(openBare.stdout.trim()).to.equal("hello post-quantum hpke");
    });

    it("round-trips with classical p256 and aes-128-gcm with info and aad", async () => {
      const keygen = await runCli([
        "hpke",
        "keygen",
        "--kem",
        "p256",
        "--json",
      ]);
      const kp = JSON.parse(keygen.stdout);

      const seal = await runCli(
        [
          "hpke",
          "seal",
          "-p",
          kp.publicKey,
          "-k",
          "p256",
          "-a",
          "aes-128-gcm",
          "--info",
          "custom-info",
          "--aad",
          "custom-aad",
          "--json",
        ],
        ["secret-data-p256"],
      );
      expect(seal.code).to.equal(EXIT.OK);
      const sealed = JSON.parse(seal.stdout);

      const open = await runCli(
        [
          "hpke",
          "open",
          "-s",
          kp.privateKey,
          "-e",
          sealed.encapsulatedKey,
          "-k",
          "p256",
          "-a",
          "aes-128-gcm",
          "--info",
          "custom-info",
          "--aad",
          "custom-aad",
        ],
        [sealed.ciphertext],
      );
      expect(open.code).to.equal(EXIT.OK);
      expect(open.stdout.trim()).to.equal("secret-data-p256");

      // Test with valid hex info/aad and odd-length info
      const sealHex = await runCli(
        [
          "hpke",
          "seal",
          "-p",
          kp.publicKey,
          "-k",
          "p256",
          "--info",
          "01020304",
          "--aad",
          "abc",
          "--json",
        ],
        ["hex-aad-data"],
      );
      expect(sealHex.code).to.equal(EXIT.OK);
      const sealedHex = JSON.parse(sealHex.stdout);

      const openHex = await runCli(
        [
          "hpke",
          "open",
          "-s",
          kp.privateKey,
          "-e",
          sealedHex.encapsulatedKey,
          "-k",
          "p256",
          "--info",
          "01020304",
          "--aad",
          "abc",
        ],
        [sealedHex.ciphertext],
      );
      expect(openHex.code).to.equal(EXIT.OK);
      expect(openHex.stdout.trim()).to.equal("hex-aad-data");
    });

    it("fails with usage error if required options are omitted", async () => {
      const sealNoPk = await runCli(["hpke", "seal"], ["input"]);
      expect(sealNoPk.code).to.equal(EXIT.USAGE);

      const openNoSk = await runCli(
        ["hpke", "open", "-e", "aabbcc"],
        ["input"],
      );
      expect(openNoSk.code).to.equal(EXIT.USAGE);

      const openNoEk = await runCli(
        ["hpke", "open", "-s", "aabbcc"],
        ["input"],
      );
      expect(openNoEk.code).to.equal(EXIT.USAGE);
    });

    it("fails with failure error on invalid ciphertext or key", async () => {
      const openFail = await runCli(
        [
          "hpke",
          "open",
          "-s",
          "00".repeat(32),
          "-e",
          "00".repeat(32),
          "-k",
          "x25519",
        ],
        ["deadbeef"],
      );
      expect(openFail.code).to.equal(EXIT.FAILURE);
    });
  });
});
