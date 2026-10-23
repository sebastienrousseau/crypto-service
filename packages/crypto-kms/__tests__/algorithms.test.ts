// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import {
  AwsKmsProvider,
  GcpKmsProvider,
  KmsError,
  LocalKmsProvider,
  VaultKmsProvider,
} from "../src";
import { FakeVault } from "./fake-vault";

// createKey must create the key that was asked for, or refuse: never a
// different algorithm. Each provider maps crypto-kms names (aes-256-gcm,
// ed25519, p256, p384, rsa-2048, ml-dsa-65 ...) to its backend's names
// and also accepts the backend's own names.

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    expect(e).to.be.instanceOf(KmsError);
    return (e as KmsError).code;
  }
  return undefined;
}

describe("createKey honours the requested algorithm", () => {
  describe("LocalKmsProvider", () => {
    const kms = new LocalKmsProvider();

    it("creates AES-256-GCM encryption and wrap keys and Ed25519 signing keys", async () => {
      expect(
        (await kms.createKey("aes-256-gcm", "encrypt")).algorithm,
      ).to.equal("aes-256-gcm");
      expect((await kms.createKey("aes-256-gcm", "wrap")).algorithm).to.equal(
        "aes-256-gcm",
      );
      expect((await kms.createKey("ed25519", "sign")).algorithm).to.equal(
        "ed25519",
      );
    });

    it("refuses algorithms it cannot provide instead of substituting", async () => {
      expect(await codeOf(kms.createKey("rsa-2048", "sign"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(await codeOf(kms.createKey("ed25519", "encrypt"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(
        await codeOf(kms.createKey("chacha20-poly1305", "encrypt")),
      ).to.equal("INVALID_ARGUMENT");
    });
  });

  describe("GcpKmsProvider", () => {
    const kms = new GcpKmsProvider({
      projectId: "p",
      locationId: "l",
      keyRingId: "r",
    });
    let sent: Record<string, unknown> | undefined;
    let original: typeof globalThis.fetch;
    beforeEach(() => {
      original = globalThis.fetch;
      sent = undefined;
      globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        sent = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ name: "x", purpose: sent!["purpose"] }),
        );
      }) as typeof globalThis.fetch;
    });
    afterEach(() => {
      globalThis.fetch = original;
    });

    const cases: Array<[string, "encrypt" | "sign" | "wrap", string]> = [
      ["aes-256-gcm", "encrypt", "GOOGLE_SYMMETRIC_ENCRYPTION"],
      ["aes-256-gcm", "wrap", "GOOGLE_SYMMETRIC_ENCRYPTION"],
      ["ed25519", "sign", "EC_SIGN_ED25519"],
      ["p256", "sign", "EC_SIGN_P256_SHA256"],
      ["ecdsa-p256", "sign", "EC_SIGN_P256_SHA256"],
      ["p384", "sign", "EC_SIGN_P384_SHA384"],
      ["rsa-2048", "sign", "RSA_SIGN_PSS_2048_SHA256"],
      ["rsa-3072", "sign", "RSA_SIGN_PSS_3072_SHA256"],
      ["rsa-4096", "sign", "RSA_SIGN_PSS_4096_SHA256"],
      ["RSA_SIGN_PKCS1_2048_SHA256", "sign", "RSA_SIGN_PKCS1_2048_SHA256"],
    ];
    for (const [algorithm, usage, expected] of cases) {
      it(`maps ${algorithm} (${usage}) to ${expected}`, async () => {
        await kms.createKey(algorithm, usage);
        expect(
          (sent!["versionTemplate"] as { algorithm: string }).algorithm,
        ).to.equal(expected);
      });
    }

    it("refuses unknown or mismatched algorithms", async () => {
      expect(await codeOf(kms.createKey("custom-algo", "sign"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(await codeOf(kms.createKey("ed25519", "encrypt"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(await codeOf(kms.createKey("rsa-2048", "encrypt"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(sent).to.equal(undefined);
    });
  });

  describe("VaultKmsProvider", () => {
    const kms = new VaultKmsProvider({
      address: "http://vault.test",
      token: "t",
    });
    let fake: FakeVault;
    beforeEach(() => {
      fake = new FakeVault();
      fake.install();
    });
    afterEach(() => fake.uninstall());

    const cases: Array<[string, "encrypt" | "sign" | "wrap", string]> = [
      ["aes-256-gcm", "encrypt", "aes256-gcm96"],
      ["aes-256-gcm", "wrap", "aes256-gcm96"],
      ["chacha20-poly1305", "encrypt", "chacha20-poly1305"],
      ["rsa-2048", "encrypt", "rsa-2048"],
      ["ed25519", "sign", "ed25519"],
      ["p256", "sign", "ecdsa-p256"],
      ["p384", "sign", "ecdsa-p384"],
      ["rsa-4096", "sign", "rsa-4096"],
      ["ecdsa-p521", "sign", "ecdsa-p521"],
    ];
    let n = 0;
    for (const [algorithm, usage, expected] of cases) {
      it(`maps ${algorithm} (${usage}) to ${expected}`, async () => {
        const meta = await kms.createKey(algorithm, usage, {
          keyId: `k${n++}`,
        });
        expect(meta.algorithm).to.equal(expected);
      });
    }

    it("refuses unknown or mismatched algorithms", async () => {
      expect(
        await codeOf(kms.createKey("custom-algo", "sign", { keyId: "x1" })),
      ).to.equal("INVALID_ARGUMENT");
      expect(
        await codeOf(kms.createKey("ed25519", "encrypt", { keyId: "x2" })),
      ).to.equal("INVALID_ARGUMENT");
      expect(fake.keys.size).to.equal(0);
    });
  });

  describe("AwsKmsProvider", () => {
    const sent: Array<Record<string, unknown>> = [];
    const kms = new AwsKmsProvider({ region: "us-east-1" });
    (kms as unknown as { client: unknown }).client = {
      send: async (cmd: { input: Record<string, unknown> }) => {
        sent.push(cmd.input);
        return { KeyMetadata: { KeyId: "id" } };
      },
    };
    beforeEach(() => {
      sent.length = 0;
    });

    const cases: Array<[string, "encrypt" | "sign" | "wrap", string]> = [
      ["aes-256-gcm", "encrypt", "SYMMETRIC_DEFAULT"],
      ["aes-256-gcm", "wrap", "SYMMETRIC_DEFAULT"],
      ["SYMMETRIC_DEFAULT", "encrypt", "SYMMETRIC_DEFAULT"],
      ["rsa-2048", "encrypt", "RSA_2048"],
      ["ed25519", "sign", "ECC_NIST_EDWARDS25519"],
      ["p256", "sign", "ECC_NIST_P256"],
      ["p384", "sign", "ECC_NIST_P384"],
      ["rsa-3072", "sign", "RSA_3072"],
      ["ml-dsa-65", "sign", "ML_DSA_65"],
      ["ML_DSA_87", "sign", "ML_DSA_87"],
    ];
    for (const [algorithm, usage, expected] of cases) {
      it(`maps ${algorithm} (${usage}) to ${expected}`, async () => {
        const meta = await kms.createKey(algorithm, usage);
        expect(sent[0]!["KeySpec"]).to.equal(expected);
        expect(meta.algorithm).to.equal(expected);
      });
    }

    it("refuses unknown or mismatched algorithms", async () => {
      expect(await codeOf(kms.createKey("custom-algo", "sign"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(await codeOf(kms.createKey("ml-dsa-65", "encrypt"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(await codeOf(kms.createKey("aes-256-gcm", "sign"))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(sent).to.have.length(0);
    });
  });
});
