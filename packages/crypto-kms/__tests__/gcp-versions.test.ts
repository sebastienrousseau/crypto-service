// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import { GcpKmsProvider, KmsError } from "../src";
import { FakeCloudKms } from "./fake-gcp-kms";

// Asymmetric signing against a model of Cloud KMS: keys have numbered
// versions and no primary, verification happens locally against the
// version's public key (Cloud KMS has no remote asymmetric verify), and
// state changes apply to every version.

const message = new TextEncoder().encode("pay 100 to alice");
const tampered = new TextEncoder().encode("pay 900 to alice");

describe("GcpKmsProvider asymmetric keys and versions", () => {
  let fake: FakeCloudKms;
  const provider = new GcpKmsProvider({
    projectId: "p",
    locationId: "l",
    keyRingId: "r",
    token: "t",
  });

  beforeEach(() => {
    fake = new FakeCloudKms();
    fake.install();
  });
  afterEach(() => fake.uninstall());

  it("signs a SHA-256 digest with the newest enabled version and verifies locally", async () => {
    fake.addKey("ec", "EC_SIGN_P256_SHA256", 3);
    fake.expectMessage(message);
    const sig = await provider.sign("ec", message);
    expect(sig.algorithm).to.equal("EC_SIGN_P256_SHA256");
    expect(
      fake.calls.some((c) => c.includes("cryptoKeyVersions/3:asymmetricSign")),
    ).to.equal(true);

    expect(await provider.verify("ec", message, sig.signature)).to.equal(true);
    expect(await provider.verify("ec", tampered, sig.signature)).to.equal(
      false,
    );
    expect(fake.calls.some((c) => c.includes("macVerify"))).to.equal(false);
  });

  it("sends the message itself for Ed25519", async () => {
    fake.addKey("ed", "EC_SIGN_ED25519");
    const sig = await provider.sign("ed", message);
    expect(sig.algorithm).to.equal("EC_SIGN_ED25519");
    expect(await provider.verify("ed", message, sig.signature)).to.equal(true);
    expect(await provider.verify("ed", tampered, sig.signature)).to.equal(
      false,
    );
  });

  it("verifies RSA-PSS with a salt as long as the digest", async () => {
    fake.addKey("rsa", "RSA_SIGN_PSS_2048_SHA256");
    fake.expectMessage(message);
    const sig = await provider.sign("rsa", message);
    expect(await provider.verify("rsa", message, sig.signature)).to.equal(true);
    expect(await provider.verify("rsa", tampered, sig.signature)).to.equal(
      false,
    );
  });

  for (const algorithm of [
    "EC_SIGN_P384_SHA384",
    "RSA_SIGN_PKCS1_2048_SHA256",
    "RSA_SIGN_PSS_3072_SHA512",
  ] as const) {
    it(`signs and verifies ${algorithm} with its own digest and padding`, async () => {
      fake.addKey(algorithm, algorithm);
      fake.expectMessage(message);
      const sig = await provider.sign(algorithm, message);
      expect(sig.algorithm).to.equal(algorithm);
      expect(await provider.verify(algorithm, message, sig.signature)).to.equal(
        true,
      );
      expect(
        await provider.verify(algorithm, tampered, sig.signature),
      ).to.equal(false);
    });
  }

  it("refuses a signing algorithm it cannot verify locally", async () => {
    fake.addKey("pq", "PQ_SIGN_ML_DSA_65");
    let err: unknown;
    try {
      await provider.sign("pq", message);
    } catch (e) {
      err = e;
    }
    expect((err as KmsError).code).to.equal("INVALID_ARGUMENT");
    expect((err as KmsError).message).to.include("PQ_SIGN_ML_DSA_65");
  });

  it("keeps verifying earlier versions after rotation until they are destroyed", async () => {
    fake.addKey("rot", "EC_SIGN_P256_SHA256");
    fake.expectMessage(message);
    const before = await provider.sign("rot", message);
    await provider.rotateKey("rot");
    const after = await provider.sign("rot", message);
    expect(
      fake.calls.some((c) => c.includes("cryptoKeyVersions/2:asymmetricSign")),
    ).to.equal(true);
    expect(await provider.verify("rot", message, before.signature)).to.equal(
      true,
    );
    expect(await provider.verify("rot", message, after.signature)).to.equal(
      true,
    );

    fake.keys.get("rot")!.versions[0]!.state = "DESTROY_SCHEDULED";
    expect(await provider.verify("rot", message, before.signature)).to.equal(
      false,
    );
    expect(await provider.verify("rot", message, after.signature)).to.equal(
      true,
    );
  });

  it("rejects a signature that is not base64 as a mismatch", async () => {
    fake.addKey("ec2", "EC_SIGN_P256_SHA256");
    expect(await provider.verify("ec2", message, "%%%")).to.equal(false);
  });

  it("propagates transport and not-found errors instead of returning false", async () => {
    let err: unknown;
    try {
      await provider.verify("missing", message, "AAAA");
    } catch (e) {
      err = e;
    }
    expect(err).to.be.instanceOf(KmsError);
    expect((err as KmsError).code).to.equal("NOT_FOUND");
  });

  it("fails when a key has no enabled version to sign with", async () => {
    fake.addKey("off", "EC_SIGN_ED25519");
    fake.keys.get("off")!.versions[0]!.state = "DISABLED";
    let err: unknown;
    try {
      await provider.sign("off", message);
    } catch (e) {
      err = e;
    }
    expect((err as KmsError).code).to.equal("DISABLED");
  });

  it("disables, enables and destroys every version, across pages", async () => {
    fake.addKey("many", "EC_SIGN_ED25519", 5);
    const states = () => fake.keys.get("many")!.versions.map((v) => v.state);

    await provider.disableKey("many");
    expect(states()).to.deep.equal(Array(5).fill("DISABLED"));
    await provider.enableKey("many");
    expect(states()).to.deep.equal(Array(5).fill("ENABLED"));

    fake.keys.get("many")!.versions[1]!.state = "DESTROY_SCHEDULED";
    await provider.scheduleKeyDeletion("many");
    expect(states()).to.deep.equal(Array(5).fill("DESTROY_SCHEDULED"));
    expect(fake.calls.some((c) => c.includes("pageToken="))).to.equal(true);
  });

  it("reports an asymmetric key's algorithm from its version template", async () => {
    fake.addKey("meta", "EC_SIGN_ED25519");
    const meta = await provider.getKey("meta");
    expect(meta.algorithm).to.equal("EC_SIGN_ED25519");
    expect(meta.usage).to.equal("sign");
    expect(meta.enabled).to.equal(true);
  });
});
