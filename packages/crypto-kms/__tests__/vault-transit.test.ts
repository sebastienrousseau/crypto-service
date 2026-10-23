// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import { KmsError, VaultKmsProvider } from "../src";
import { FakeVault } from "./fake-vault";

// VaultKmsProvider against Vault Transit semantics. The suite always runs
// against FakeVault, and also against a real Vault when VAULT_TEST_ADDR
// (and VAULT_TEST_TOKEN, default "root") are set, for example:
//   docker run --rm -p 127.0.0.1:18200:8200 \
//     -e VAULT_DEV_ROOT_TOKEN_ID=root hashicorp/vault:1.20
//   VAULT_TEST_ADDR=http://127.0.0.1:18200 pnpm test
// The transit engine must be mounted at "transit".

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    expect(e).to.be.instanceOf(KmsError);
    return (e as KmsError).code;
  }
  return undefined;
}

interface Target {
  name: string;
  provider: () => VaultKmsProvider;
  setup: () => Promise<void>;
  teardown: () => void;
  fake?: () => FakeVault;
}

let fake: FakeVault;
const targets: Target[] = [
  {
    name: "FakeVault",
    provider: () =>
      new VaultKmsProvider({ address: "http://vault.test", token: "t" }),
    setup: async () => {
      fake = new FakeVault();
      fake.install();
    },
    teardown: () => fake.uninstall(),
    fake: () => fake,
  },
];
const liveAddr = process.env["VAULT_TEST_ADDR"];
if (liveAddr) {
  targets.push({
    name: `Vault at ${liveAddr}`,
    provider: () =>
      new VaultKmsProvider({
        address: liveAddr,
        token: process.env["VAULT_TEST_TOKEN"] ?? "root",
      }),
    setup: async () => {},
    teardown: () => {},
  });
}

let counter = 0;
const unique = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

for (const target of targets) {
  describe(`VaultKmsProvider against ${target.name}`, function () {
    this.timeout(20000);
    let kms: VaultKmsProvider;

    beforeEach(async () => {
      await target.setup();
      kms = target.provider();
    });
    afterEach(() => target.teardown());

    it("binds the encryption context: a different context does not decrypt", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt", {
        keyId: unique("ctx"),
      });
      const ct = await kms.encrypt(key.keyId, enc("secret"), {
        tenant: "a",
        app: "x",
      });
      expect(
        await codeOf(
          kms.decrypt(key.keyId, ct.ciphertext, { tenant: "b", app: "x" }),
        ),
      ).to.equal("DECRYPTION_FAILED");
      expect(await codeOf(kms.decrypt(key.keyId, ct.ciphertext))).to.equal(
        "DECRYPTION_FAILED",
      );
      // Key order does not matter.
      const pt = await kms.decrypt(key.keyId, ct.ciphertext, {
        app: "x",
        tenant: "a",
      });
      expect(dec(pt.plaintext)).to.equal("secret");
    });

    it("round-trips without a context", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt", {
        keyId: unique("plain"),
      });
      const ct = await kms.encrypt(key.keyId, enc("hello"));
      expect(
        dec((await kms.decrypt(key.keyId, ct.ciphertext)).plaintext),
      ).to.equal("hello");
    });

    for (const algorithm of ["ed25519", "rsa-2048"]) {
      it(`signs and verifies with ${algorithm}`, async () => {
        const key = await kms.createKey(algorithm, "sign", {
          keyId: unique(algorithm),
        });
        const sig = await kms.sign(key.keyId, enc("message"));
        expect(
          await kms.verify(key.keyId, enc("message"), sig.signature),
        ).to.equal(true);
        expect(
          await kms.verify(key.keyId, enc("tampered"), sig.signature),
        ).to.equal(false);
        expect(await kms.verify(key.keyId, enc("message"), "garbage")).to.equal(
          false,
        );
      });
    }

    it("raises lookup errors from verify instead of returning false", async () => {
      expect(
        await codeOf(kms.verify(unique("missing"), enc("m"), "vault:v1:AAAA")),
      ).to.equal("NOT_FOUND");
    });

    it("reports that Transit cannot disable or re-enable a key", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt", {
        keyId: unique("dis"),
      });
      expect(await codeOf(kms.disableKey(key.keyId))).to.equal(
        "NOT_IMPLEMENTED",
      );
      expect(await codeOf(kms.enableKey(key.keyId))).to.equal(
        "NOT_IMPLEMENTED",
      );
      // The key is untouched.
      const ct = await kms.encrypt(key.keyId, enc("still usable"));
      expect(
        dec((await kms.decrypt(key.keyId, ct.ciphertext)).plaintext),
      ).to.equal("still usable");
    });

    it("deletes only when told the deletion is immediate", async () => {
      const key = await kms.createKey("aes-256-gcm", "encrypt", {
        keyId: unique("del"),
      });
      expect(await codeOf(kms.scheduleKeyDeletion(key.keyId))).to.equal(
        "INVALID_ARGUMENT",
      );
      expect(await codeOf(kms.scheduleKeyDeletion(key.keyId, 7))).to.equal(
        "INVALID_ARGUMENT",
      );
      await kms.getKey(key.keyId);
      await kms.scheduleKeyDeletion(key.keyId, 0);
      expect(await codeOf(kms.getKey(key.keyId))).to.equal("NOT_FOUND");
    });

    if (target.fake) {
      it("rejects ciphertext written without the context unless opted in", async () => {
        const key = await kms.createKey("aes-256-gcm", "encrypt", {
          keyId: unique("legacy"),
        });
        const old = target.fake!().encryptUnbound(key.keyId, enc("old"));
        expect(
          await codeOf(kms.decrypt(key.keyId, old, { tenant: "a" })),
        ).to.equal("DECRYPTION_FAILED");
        const lenient = new VaultKmsProvider({
          address: "http://vault.test",
          token: "t",
          acceptUnboundContext: true,
        });
        const pt = await lenient.decrypt(key.keyId, old, { tenant: "a" });
        expect(dec(pt.plaintext)).to.equal("old");
        // Opting in never weakens ciphertext that was bound.
        const bound = await kms.encrypt(key.keyId, enc("new"), { tenant: "a" });
        expect(
          await codeOf(
            lenient.decrypt(key.keyId, bound.ciphertext, { tenant: "b" }),
          ),
        ).to.equal("DECRYPTION_FAILED");
      });
    }
  });
}
