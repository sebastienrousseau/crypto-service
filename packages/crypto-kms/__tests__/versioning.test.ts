// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import {
  KmsError,
  LocalKmsProvider,
  Pkcs11HsmProvider,
  GcpKmsProvider,
  AzureKmsProvider,
  VaultKmsProvider,
} from "../src/index";
import type { KmsProvider } from "../src/index";
import { ed25519Verify } from "@sebastienrousseau/crypto-lib";
import {
  createVersionedKey,
  currentVersion,
  signCurrent,
} from "../src/providers/versioned-key";

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

/** Await a rejection and return the error, failing if the call resolves. */
async function rejection(p: Promise<unknown>): Promise<KmsError> {
  try {
    await p;
  } catch (err) {
    return err as KmsError;
  }
  return expect.fail("expected a rejection");
}

type VersionedProvider = KmsProvider & {
  destroyKeyVersion(keyId: string, version: number): Promise<void>;
};

const providers: Array<{ label: string; make: () => VersionedProvider }> = [
  { label: "LocalKmsProvider", make: () => new LocalKmsProvider() },
  {
    label: "Pkcs11HsmProvider",
    make: () => new Pkcs11HsmProvider({ simulate: true }),
  },
];

for (const { label, make } of providers) {
  describe(`${label}: versioned key material`, () => {
    let kms: VersionedProvider;

    beforeEach(() => {
      kms = make();
    });

    it("decrypts ciphertext produced before a rotation", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const before = await kms.encrypt(key.keyId, enc("before"));
      expect(before.keyVersion).to.equal(1);

      const rotated = await kms.rotateKey(key.keyId);
      expect(rotated.currentVersion).to.equal(2);

      const after = await kms.encrypt(key.keyId, enc("after"));
      expect(after.keyVersion).to.equal(2);

      const oldPt = await kms.decrypt(key.keyId, before.ciphertext);
      expect(dec(oldPt.plaintext)).to.equal("before");
      expect(oldPt.keyVersion).to.equal(1);

      const newPt = await kms.decrypt(key.keyId, after.ciphertext);
      expect(dec(newPt.plaintext)).to.equal("after");
      expect(newPt.keyVersion).to.equal(2);
    });

    it("unwraps a data key generated before a rotation", async () => {
      const key = await kms.createKey("aes-256-gcm", "wrap");
      const dek = await kms.generateDataKey(key.keyId);
      await kms.rotateKey(key.keyId);
      await kms.rotateKey(key.keyId);
      const unwrapped = await kms.decrypt(key.keyId, dek.ciphertext);
      expect(unwrapped.plaintext).to.deep.equal(dek.plaintext);
    });

    it("verifies signatures made before a rotation", async () => {
      const key = await kms.createKey("ed25519", "sign");
      const data = enc("statement");
      const sig = await kms.sign(key.keyId, data);
      await kms.rotateKey(key.keyId);
      expect(await kms.verify(key.keyId, data, sig.signature)).to.be.true;
      const fresh = await kms.sign(key.keyId, data);
      expect(fresh.signature).to.not.equal(sig.signature);
      expect(await kms.verify(key.keyId, data, fresh.signature)).to.be.true;
      expect(await kms.verify(key.keyId, enc("other"), sig.signature)).to.be
        .false;
    });

    it("reports the version history in key metadata", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      expect(key.currentVersion).to.equal(1);
      await kms.rotateKey(key.keyId);
      const meta = await kms.getKey(key.keyId);
      expect(meta.currentVersion).to.equal(2);
    });

    it("destroys a previous version so its ciphertext no longer decrypts", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const v1 = await kms.encrypt(key.keyId, enc("old"));
      await kms.rotateKey(key.keyId);
      const v2 = await kms.encrypt(key.keyId, enc("new"));

      await kms.destroyKeyVersion(key.keyId, 1);

      const err = await rejection(kms.decrypt(key.keyId, v1.ciphertext));
      expect(err).to.be.instanceOf(KmsError);
      expect(err.code).to.equal("VERSION_DESTROYED");
      expect(
        dec((await kms.decrypt(key.keyId, v2.ciphertext)).plaintext),
      ).to.equal("new");
    });

    it("stops verifying signatures of a destroyed version", async () => {
      const key = await kms.createKey("ed25519", "sign");
      const data = enc("statement");
      const sig = await kms.sign(key.keyId, data);
      await kms.rotateKey(key.keyId);
      await kms.destroyKeyVersion(key.keyId, 1);
      expect(await kms.verify(key.keyId, data, sig.signature)).to.be.false;
    });

    it("refuses to destroy the current version or an unknown one", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const current = await rejection(kms.destroyKeyVersion(key.keyId, 1));
      expect(current.code).to.equal("INVALID_ARGUMENT");
      const unknown = await rejection(kms.destroyKeyVersion(key.keyId, 9));
      expect(unknown.code).to.equal("NOT_FOUND");
      const missing = await rejection(kms.destroyKeyVersion("missing", 1));
      expect(missing.code).to.equal("NOT_FOUND");
    });

    it("rejects ciphertext naming a version the key never had", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const ct = Buffer.from(
        (await kms.encrypt(key.keyId, enc("x"))).ciphertext,
        "base64",
      );
      ct.writeUInt32BE(7, 1);
      const err = await rejection(
        kms.decrypt(key.keyId, ct.toString("base64")),
      );
      expect(err.code).to.equal("NOT_FOUND");
    });

    it("rejects malformed ciphertext with INVALID_CIPHERTEXT", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const short = await rejection(kms.decrypt(key.keyId, "c2hvcnQ="));
      expect(short.code).to.equal("INVALID_CIPHERTEXT");

      const good = Buffer.from(
        (await kms.encrypt(key.keyId, enc("x"))).ciphertext,
        "base64",
      );
      good[0] = 0x7f;
      const badFormat = await rejection(
        kms.decrypt(key.keyId, good.toString("base64")),
      );
      expect(badFormat.code).to.equal("INVALID_CIPHERTEXT");
    });

    it("binds the version header to the ciphertext", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      await kms.rotateKey(key.keyId);
      const ct = Buffer.from(
        (await kms.encrypt(key.keyId, enc("x"))).ciphertext,
        "base64",
      );
      ct.writeUInt32BE(1, 1);
      const err = await rejection(
        kms.decrypt(key.keyId, ct.toString("base64")),
      );
      expect(err.code).to.equal("DECRYPTION_FAILED");
    });
  });

  describe(`${label}: encryption context`, () => {
    let kms: VersionedProvider;

    beforeEach(() => {
      kms = make();
    });

    it("decrypts when the context keys arrive in a different order", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const ct = await kms.encrypt(key.keyId, enc("ordered"), {
        tenant: "acme",
        purpose: "backup",
        region: "eu",
      });
      const pt = await kms.decrypt(key.keyId, ct.ciphertext, {
        region: "eu",
        purpose: "backup",
        tenant: "acme",
      });
      expect(dec(pt.plaintext)).to.equal("ordered");
    });

    it("still rejects a context with a different value", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const ct = await kms.encrypt(key.keyId, enc("x"), { a: "1", b: "2" });
      const err = await rejection(
        kms.decrypt(key.keyId, ct.ciphertext, { b: "2", a: "3" }),
      );
      expect(err).to.be.instanceOf(KmsError);
      expect(err.code).to.equal("DECRYPTION_FAILED");
    });

    it("does not confuse key/value boundaries", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const ct = await kms.encrypt(key.keyId, enc("x"), { ab: "c" });
      const err = await rejection(
        kms.decrypt(key.keyId, ct.ciphertext, { a: "bc" }),
      );
      expect(err.code).to.equal("DECRYPTION_FAILED");
    });

    it("rejects non-string context values", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt");
      const nested = { a: { b: "c" } } as unknown as Record<string, string>;
      const err = await rejection(kms.encrypt(key.keyId, enc("x"), nested));
      expect(err).to.be.instanceOf(KmsError);
      expect(err.code).to.equal("INVALID_ARGUMENT");
    });
  });

  describe(`${label}: typed errors`, () => {
    let kms: VersionedProvider;

    beforeEach(() => {
      kms = make();
    });

    it("tags lookup, state and usage failures with a code", async () => {
      const notFound = await rejection(kms.getKey("missing"));
      expect(notFound).to.be.instanceOf(KmsError);
      expect(notFound).to.be.instanceOf(Error);
      expect(notFound.name).to.equal("KmsError");
      expect(notFound.code).to.equal("NOT_FOUND");
      expect(notFound.keyId).to.equal("missing");

      const key = await kms.createKey("aes-256-gcm", "encrypt");
      await kms.disableKey(key.keyId);
      const disabled = await rejection(kms.encrypt(key.keyId, enc("x")));
      expect(disabled.code).to.equal("DISABLED");

      const live = await kms.createKey("aes-256-gcm", "encrypt");
      const usage = await rejection(kms.sign(live.keyId, enc("x")));
      expect(usage.code).to.equal("INVALID_USAGE");

      const signer = await kms.createKey("ed25519", "sign");
      const notCipher = await rejection(kms.decrypt(signer.keyId, "AAAA"));
      expect(notCipher.code).to.equal("INVALID_USAGE");
    });
  });
}

describe("stub providers reject with NOT_IMPLEMENTED", () => {
  const stubs: KmsProvider[] = [
    new GcpKmsProvider({ projectId: "p", locationId: "l", keyRingId: "r" }),
    new AzureKmsProvider({ vaultUrl: "https://v.vault.azure.net" }),
    new VaultKmsProvider({ address: "http://127.0.0.1:8200", token: "t" }),
  ];
  for (const stub of stubs) {
    it(`${stub.name}`, async () => {
      const err = await rejection(stub.getKey("k"));
      expect(err).to.be.instanceOf(KmsError);
      expect(err.code).to.equal("NOT_IMPLEMENTED");
      expect(err.message).to.include("Not implemented");
    });
  }
});

describe("Signatures are standard Ed25519 over the message bytes", () => {
  it("verifies with a plain Ed25519 verifier", () => {
    const key = createVersionedKey("sign");
    const data = enc("payment instruction");
    const signature = signCurrent(key, data);
    const publicKey = currentVersion(key).publicKey as Uint8Array;
    expect(ed25519Verify(publicKey, data, signature).valid).to.equal(true);
  });
});
