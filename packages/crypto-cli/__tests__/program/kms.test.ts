/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { runCli } from "./helpers";
import { EXIT } from "../../src/program/io";
import {
  registerCliKmsProvider,
  resetCliKmsProviders,
  resolveCliKmsProvider,
} from "../../src/program/kms";
import type { KmsProvider } from "@sebastienrousseau/crypto-kms";

describe("crypto-cli kms", () => {
  afterEach(() => {
    resetCliKmsProviders();
  });

  describe("resolveCliKmsProvider", () => {
    it("resolves default local provider", () => {
      const p = resolveCliKmsProvider();
      expect(p.name).to.equal("local");
    });

    it("resolves aws, gcp, vault, and azure providers", () => {
      expect(resolveCliKmsProvider("aws").name).to.equal("aws");
      expect(resolveCliKmsProvider("gcp").name).to.equal("gcp");
      expect(resolveCliKmsProvider("vault").name).to.equal("vault");
      expect(resolveCliKmsProvider("azure").name).to.equal("azure");
    });

    it("throws on unsupported provider", () => {
      expect(() => resolveCliKmsProvider("nonexistent")).to.throw(
        "Unsupported KMS provider: nonexistent",
      );
    });

    it("allows registering and resetting custom provider", () => {
      const mock: KmsProvider = {
        name: "mock-cli-provider",
        listKeys: async () => [],
        getKey: async () => ({}) as never,
        createKey: async () => ({}) as never,
        enableKey: async () => {},
        disableKey: async () => {},
        scheduleKeyDeletion: async () => {},
        encrypt: async () => ({}) as never,
        decrypt: async () => ({}) as never,
        sign: async () => ({}) as never,
        verify: async () => true,
        rotateKey: async () => ({}) as never,
        generateDataKey: async () => ({}) as never,
      };
      registerCliKmsProvider("mock", mock);
      expect(resolveCliKmsProvider("mock").name).to.equal("mock-cli-provider");
      resetCliKmsProviders();
      expect(resolveCliKmsProvider().name).to.equal("local");
    });
  });

  describe("kms create-key", () => {
    it("creates a key with default options", async () => {
      const { code, stdout } = await runCli(["kms", "create-key"]);
      expect(code).to.equal(EXIT.OK);
      expect(stdout).to.include("Key ID:");
      expect(stdout).to.include("Algorithm: aes-256-gcm");
      expect(stdout).to.include("Usage:     encrypt");
      expect(stdout).to.include("Provider:  local");
    });

    it("creates a key with --json output", async () => {
      const { code, stdout } = await runCli([
        "kms",
        "create-key",
        "--algorithm",
        "ed25519",
        "--usage",
        "sign",
        "--json",
      ]);
      expect(code).to.equal(EXIT.OK);
      const data = JSON.parse(stdout);
      expect(data).to.have.property("keyId");
      expect(data.algorithm).to.equal("ed25519");
      expect(data.usage).to.equal("sign");
    });
  });

  describe("kms wrap and unwrap", () => {
    it("wraps and unwraps key roundtrip via CLI", async () => {
      const createRes = await runCli([
        "kms",
        "create-key",
        "--usage",
        "wrap",
        "--json",
      ]);
      expect(createRes.code).to.equal(EXIT.OK);
      const keyId = JSON.parse(createRes.stdout).keyId;

      const rawKey =
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";
      const wrapRes = await runCli([
        "kms",
        "wrap",
        "-k",
        keyId,
        "-w",
        rawKey,
        "--json",
      ]);
      expect(wrapRes.code).to.equal(EXIT.OK);
      const wrapData = JSON.parse(wrapRes.stdout);
      expect(wrapData).to.have.property("wrappedKey");
      expect(wrapData.keyId).to.equal(keyId);

      const unwrapRes = await runCli([
        "kms",
        "unwrap",
        "-k",
        keyId,
        "-w",
        wrapData.wrappedKey,
        "--json",
      ]);
      expect(unwrapRes.code).to.equal(EXIT.OK);
      const unwrapData = JSON.parse(unwrapRes.stdout);
      expect(unwrapData.unwrappedKey).to.equal(rawKey);
      expect(unwrapData.keyId).to.equal(keyId);
    });

    it("wraps and unwraps with human readable text output", async () => {
      const createRes = await runCli(["kms", "create-key", "--json"]);
      const keyId = JSON.parse(createRes.stdout).keyId;

      const wrapRes = await runCli([
        "kms",
        "wrap",
        "-k",
        keyId,
        "-w",
        "01020304",
      ]);
      expect(wrapRes.code).to.equal(EXIT.OK);
      expect(wrapRes.stdout).to.include("Wrapped Key:");

      // extract wrapped key
      const match = wrapRes.stdout.match(/Wrapped Key:\s+(.*)/);
      expect(match).to.not.be.null;
      const wrappedKey = match![1].trim();

      const unwrapRes = await runCli([
        "kms",
        "unwrap",
        "-k",
        keyId,
        "-w",
        wrappedKey,
      ]);
      expect(unwrapRes.code).to.equal(EXIT.OK);
      expect(unwrapRes.stdout).to.include("Unwrapped Key: 01020304");
    });

    it("wraps and unwraps with key read from stdin", async () => {
      const createRes = await runCli(["kms", "create-key", "--json"]);
      const keyId = JSON.parse(createRes.stdout).keyId;
      const rawKey = "cafebabe12345678";

      const wrapRes = await runCli(
        ["kms", "wrap", "-k", keyId, "--json"],
        [rawKey],
      );
      expect(wrapRes.code).to.equal(EXIT.OK);
      const wrapData = JSON.parse(wrapRes.stdout);
      expect(wrapData).to.have.property("wrappedKey");

      const unwrapRes = await runCli(
        ["kms", "unwrap", "-k", keyId, "--json"],
        [wrapData.wrappedKey],
      );
      expect(unwrapRes.code).to.equal(EXIT.OK);
      const unwrapData = JSON.parse(unwrapRes.stdout);
      expect(unwrapData.unwrappedKey).to.equal(rawKey);
    });

    it("throws when provider does not support wrapKey or unwrapKey", async () => {
      const mock: KmsProvider = {
        name: "no-wrap",
        listKeys: async () => [],
        getKey: async () => ({}) as never,
        createKey: async () => ({}) as never,
        enableKey: async () => {},
        disableKey: async () => {},
        scheduleKeyDeletion: async () => {},
        encrypt: async () => ({}) as never,
        decrypt: async () => ({}) as never,
        sign: async () => ({}) as never,
        verify: async () => true,
        rotateKey: async () => ({}) as never,
        generateDataKey: async () => ({}) as never,
      };
      registerCliKmsProvider("no-wrap", mock);

      const wrapRes = await runCli([
        "kms",
        "wrap",
        "-k",
        "k",
        "-w",
        "1234",
        "-p",
        "no-wrap",
      ]);
      expect(wrapRes.code).to.not.equal(EXIT.OK);

      const unwrapRes = await runCli([
        "kms",
        "unwrap",
        "-k",
        "k",
        "-w",
        "1234",
        "-p",
        "no-wrap",
      ]);
      expect(unwrapRes.code).to.not.equal(EXIT.OK);
    });
  });

  describe("kms generate-data-key", () => {
    it("generates a DEK with text and json outputs", async () => {
      const createRes = await runCli(["kms", "create-key", "--json"]);
      const keyId = JSON.parse(createRes.stdout).keyId;

      const res = await runCli(["kms", "generate-data-key", "-k", keyId]);
      expect(res.code).to.equal(EXIT.OK);
      expect(res.stdout).to.include("Plaintext:");
      expect(res.stdout).to.include("Ciphertext:");

      const jsonRes = await runCli([
        "kms",
        "generate-data-key",
        "-k",
        keyId,
        "--json",
      ]);
      expect(jsonRes.code).to.equal(EXIT.OK);
      const data = JSON.parse(jsonRes.stdout);
      expect(data).to.have.property("plaintext");
      expect(data).to.have.property("ciphertext");
      expect(data.keyId).to.equal(keyId);
    });
  });

  describe("kms encrypt and decrypt", () => {
    it("encrypts and decrypts roundtrip over CLI options", async () => {
      const createRes = await runCli(["kms", "create-key", "--json"]);
      const keyId = JSON.parse(createRes.stdout).keyId;

      const encRes = await runCli([
        "kms",
        "encrypt",
        "-k",
        keyId,
        "-d",
        "sensitive payload data",
        "--json",
      ]);
      expect(encRes.code).to.equal(EXIT.OK);
      const encData = JSON.parse(encRes.stdout);
      expect(encData).to.have.property("ciphertext");

      const decRes = await runCli([
        "kms",
        "decrypt",
        "-k",
        keyId,
        "-c",
        encData.ciphertext,
        "--json",
      ]);
      expect(decRes.code).to.equal(EXIT.OK);
      const decData = JSON.parse(decRes.stdout);
      expect(decData.plaintext).to.equal("sensitive payload data");
    });

    it("encrypts with text output and decrypts via text output", async () => {
      const createRes = await runCli(["kms", "create-key", "--json"]);
      const keyId = JSON.parse(createRes.stdout).keyId;

      const encRes = await runCli([
        "kms",
        "encrypt",
        "-k",
        keyId,
        "-d",
        "hello kms",
      ]);
      expect(encRes.code).to.equal(EXIT.OK);
      expect(encRes.stdout).to.include("Ciphertext:");

      const match = encRes.stdout.match(/Ciphertext:\s+(.*)/);
      expect(match).to.not.be.null;
      const ct = match![1].trim();

      const decRes = await runCli(["kms", "decrypt", "-k", keyId, "-c", ct]);
      expect(decRes.code).to.equal(EXIT.OK);
      expect(decRes.stdout.trim()).to.equal("hello kms");
    });

    it("encrypts and decrypts with payload read from stdin", async () => {
      const createRes = await runCli(["kms", "create-key", "--json"]);
      const keyId = JSON.parse(createRes.stdout).keyId;

      const encRes = await runCli(
        ["kms", "encrypt", "-k", keyId, "--json"],
        ["stdin secret message"],
      );
      expect(encRes.code).to.equal(EXIT.OK);
      const encData = JSON.parse(encRes.stdout);
      expect(encData).to.have.property("ciphertext");

      const decRes = await runCli(
        ["kms", "decrypt", "-k", keyId, "--json"],
        [encData.ciphertext],
      );
      expect(decRes.code).to.equal(EXIT.OK);
      const decData = JSON.parse(decRes.stdout);
      expect(decData.plaintext).to.equal("stdin secret message");
    });
  });
});
