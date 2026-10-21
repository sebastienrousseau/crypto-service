// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import { AwsKmsProvider, KmsError } from "../src";

// AWS KMS semantics the provider must follow:
// - Sign/Verify need a SigningAlgorithm matching the key spec; without
//   one, the provider asks DescribeKey and picks the key's algorithm.
// - Verify reports a bad signature by throwing
//   KMSInvalidSignatureException, which is a mismatch (false), not an
//   error.
// - rotateKey must create new key material now: RotateKeyOnDemand.
//   EnableKeyRotation only schedules yearly automatic rotation.

type Handler = (input: Record<string, unknown>) => unknown;

function mocked(handlers: Record<string, Handler>) {
  const calls: Array<{ command: string; input: Record<string, unknown> }> = [];
  const p = new AwsKmsProvider({ region: "us-east-1" });
  (p as unknown as { client: unknown }).client = {
    send: async (cmd: {
      constructor: { name: string };
      input: Record<string, unknown>;
    }) => {
      const command = cmd.constructor.name;
      calls.push({ command, input: cmd.input });
      const handler = handlers[command];
      if (!handler) throw new Error(`unexpected ${command}`);
      return handler(cmd.input);
    },
  };
  return { p, calls };
}

const describeAs =
  (KeySpec: string, SigningAlgorithms: string[] = []) =>
  () => ({
    KeyMetadata: {
      KeyId: "k",
      KeySpec,
      KeyUsage: "SIGN_VERIFY",
      SigningAlgorithms,
      Enabled: true,
    },
  });

function invalidSignature(): never {
  const e = new Error("signature is not valid");
  e.name = "KMSInvalidSignatureException";
  throw e;
}

describe("AwsKmsProvider signing and rotation semantics", () => {
  const cases: Array<[string, string]> = [
    ["ECC_NIST_P256", "ECDSA_SHA_256"],
    ["ECC_NIST_P384", "ECDSA_SHA_384"],
    ["ECC_NIST_P521", "ECDSA_SHA_512"],
    ["ECC_SECG_P256K1", "ECDSA_SHA_256"],
    ["ECC_NIST_EDWARDS25519", "ED25519_SHA_512"],
    ["RSA_2048", "RSASSA_PSS_SHA_256"],
    ["ML_DSA_65", "ML_DSA_SHAKE_256"],
  ];
  for (const [spec, algorithm] of cases) {
    it(`signs a ${spec} key with ${algorithm} when no algorithm is given`, async () => {
      const { p, calls } = mocked({
        DescribeKeyCommand: describeAs(spec),
        SignCommand: (i) => ({
          Signature: Buffer.from("s"),
          SigningAlgorithm: i["SigningAlgorithm"],
        }),
      });
      const sig = await p.sign("k", new Uint8Array([1]));
      expect(sig.algorithm).to.equal(algorithm);
      expect(
        calls.find((c) => c.command === "SignCommand")!.input[
          "SigningAlgorithm"
        ],
      ).to.equal(algorithm);
    });
  }

  it("falls back to the key's first listed algorithm for an unmapped spec", async () => {
    const { p } = mocked({
      DescribeKeyCommand: describeAs("SM2", ["SM2DSA"]),
      SignCommand: (i) => ({
        Signature: Buffer.from("s"),
        SigningAlgorithm: i["SigningAlgorithm"],
      }),
    });
    expect((await p.sign("k", new Uint8Array([1]))).algorithm).to.equal(
      "SM2DSA",
    );
  });

  it("refuses to sign with a key that has no signing algorithm", async () => {
    const { p } = mocked({
      DescribeKeyCommand: describeAs("SYMMETRIC_DEFAULT"),
    });
    let err: unknown;
    try {
      await p.sign("k", new Uint8Array([1]));
    } catch (e) {
      err = e;
    }
    expect((err as KmsError).code).to.equal("INVALID_USAGE");
  });

  it("refuses to sign when DescribeKey returns no metadata", async () => {
    const { p } = mocked({ DescribeKeyCommand: () => ({}) });
    let err: unknown;
    try {
      await p.sign("k", new Uint8Array([1]));
    } catch (e) {
      err = e;
    }
    expect((err as KmsError).code).to.equal("INVALID_USAGE");
  });

  it("uses an explicit algorithm without describing the key", async () => {
    const { p, calls } = mocked({
      SignCommand: (i) => ({
        Signature: Buffer.from("s"),
        SigningAlgorithm: i["SigningAlgorithm"],
      }),
    });
    await p.sign("k", new Uint8Array([1]), "ECDSA_SHA_384");
    expect(calls.map((c) => c.command)).to.deep.equal(["SignCommand"]);
  });

  it("verifies with the key's algorithm and treats KMSInvalidSignatureException as a mismatch", async () => {
    let valid = true;
    const { p, calls } = mocked({
      DescribeKeyCommand: describeAs("ECC_NIST_P256"),
      VerifyCommand: () =>
        valid ? { SignatureValid: true } : invalidSignature(),
    });
    expect(await p.verify("k", new Uint8Array([1]), "c2ln")).to.equal(true);
    expect(
      calls.find((c) => c.command === "VerifyCommand")!.input[
        "SigningAlgorithm"
      ],
    ).to.equal("ECDSA_SHA_256");
    valid = false;
    expect(await p.verify("k", new Uint8Array([1]), "c2ln")).to.equal(false);
  });

  it("raises other verify errors", async () => {
    const { p } = mocked({
      VerifyCommand: () => {
        const e = new Error("no such key");
        e.name = "NotFoundException";
        throw e;
      },
    });
    let err: unknown;
    try {
      await p.verify("k", new Uint8Array([1]), "c2ln", "ECDSA_SHA_256");
    } catch (e) {
      err = e;
    }
    expect((err as Error).name).to.equal("NotFoundException");
  });

  it("rotates on demand, creating new key material now", async () => {
    const { p, calls } = mocked({
      RotateKeyOnDemandCommand: () => ({ KeyId: "k" }),
      DescribeKeyCommand: describeAs("SYMMETRIC_DEFAULT"),
    });
    await p.rotateKey("k");
    expect(calls.map((c) => c.command)).to.deep.equal([
      "RotateKeyOnDemandCommand",
      "DescribeKeyCommand",
    ]);
  });
});
