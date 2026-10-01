// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { mlKemEncap } from "@sebastienrousseau/crypto-lib";
import { CryptoMcpServer, executeTool } from "../src";
import { generateKey } from "../src/tools/keys";
import { KeyKind, KeyStore, keyStore } from "../src/tools/keystore";
import { MAX_KEK_LABELS } from "../src/tools/kms";
import { hash } from "../src/tools/signing";
import { call, callError, newKey, parse } from "./helpers";

/** The message a rejected promise carries, or "" if it resolves. */
async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err: unknown) {
    return (err as Error).message;
  }
  return "";
}

const ALL_KINDS: KeyKind[] = [
  "ed25519",
  "rsa",
  "ecc",
  "ml-kem-768",
  "symmetric-256",
  "hmac-sha256",
];

/** The raw secret bytes behind a handle, read from inside the server. */
function secretOf(keyHandle: string): Buffer {
  return keyStore.use(keyHandle, ALL_KINDS).secret as Buffer;
}

/** Every form in which a held key's secret could leak, as text. */
function secretForms(keyHandle: string): string[] {
  const key = keyStore.use(keyHandle, ALL_KINDS);
  if (key.secret) {
    return [key.secret.toString("hex"), key.secret.toString("base64")];
  }
  const der = key.privateKey?.export({ type: "pkcs8", format: "der" });
  const pem = key.privateKey?.export({ type: "pkcs8", format: "pem" });
  return [String(pem), (der as Buffer).toString("hex")];
}

/**
 * Reproduces the pre-v0.0.6 KEK derivation: scrypt(keyId, salt). If a
 * wrapped key can be opened this way, anyone who knows the public keyId
 * can recover the DEK.
 */
function unwrapWithKeyIdOnly(keyId: string, wrappedHex: string): string {
  const parts = Buffer.from(wrappedHex, "hex").toString("utf8").split(":");
  const [salt, iv, tag, data] = parts.map((p) => Buffer.from(p, "hex"));
  const kek = crypto.scryptSync(keyId, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", kek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "hex",
  );
}

describe("Security hardening", () => {
  describe("key material never reaches the client", () => {
    it("no tool output contains a secret the server holds", async () => {
      const outputs: string[] = [];
      const record = async (tool: string, args: object) => {
        const res = await executeTool(tool, args as Record<string, unknown>);
        outputs.push(res.content[0].text);
        return parse(res);
      };
      const handles: string[] = [];
      for (const type of ["ed25519", "rsa", "ecc", "hmac-sha256"]) {
        const key = await record("crypto_generate_key", { type });
        handles.push(key.keyHandle);
        await record("crypto_sign", { data: "d", keyHandle: key.keyHandle });
      }
      const kem = await record("crypto_generate_key", { type: "ml-kem-768" });
      const enc = await record("crypto_kem_encapsulate", {
        publicKey: kem.publicKey,
      });
      const dec = await record("crypto_kem_decapsulate", {
        keyHandle: kem.keyHandle,
        ciphertext: enc.ciphertext,
      });
      const sym = await record("crypto_encrypt", { plaintext: "p" });
      await record("crypto_kms_wrap", {
        provider: "local",
        keyId: "leak-check",
        keyHandle: sym.keyHandle,
      });
      await record("crypto_key_list", {});
      handles.push(kem.keyHandle, enc.keyHandle, dec.keyHandle, sym.keyHandle);

      const transcript = outputs.join("\n");
      expect(transcript).to.not.include("PRIVATE KEY");
      for (const handle of handles) {
        for (const form of secretForms(handle)) {
          expect(transcript.includes(form), handle).to.be.false;
        }
      }
    });

    it("no tool schema accepts raw key material", async () => {
      const { TOOLS } = await import("../src");
      for (const tool of TOOLS) {
        const names = Object.keys(tool.inputSchema.properties);
        for (const banned of ["key", "dek", "privateKey", "secret"]) {
          expect(names, tool.name).to.not.include(banned);
        }
      }
    });
  });

  describe("KeyStore", () => {
    const symmetric = (byte: number) => ({
      kind: "symmetric-256" as const,
      secret: Buffer.alloc(32, byte),
      info: {},
    });

    it("evicts the least recently used key and wipes its secret", () => {
      const store = new KeyStore(2);
      const first = symmetric(1);
      const a = store.add(first);
      const b = store.add(symmetric(2));
      store.use(a, ["symmetric-256"]); // a is now most recently used
      const c = store.add(symmetric(3));
      expect(store.size).to.equal(2);
      expect(() => store.use(b, ["symmetric-256"])).to.throw(
        "Unknown key handle",
      );
      expect(store.list().map((k) => k.keyHandle)).to.deep.equal([a, c]);
      expect(first.secret.equals(Buffer.alloc(32, 1))).to.be.true;
      store.add(symmetric(4));
      store.add(symmetric(5));
      expect(first.secret.equals(Buffer.alloc(32))).to.be.true;
    });

    it("wipes a destroyed key and removes keys without raw secrets", () => {
      const store = new KeyStore(4);
      const key = symmetric(7);
      const handle = store.add(key);
      expect(store.remove(handle)).to.be.true;
      expect(key.secret.equals(Buffer.alloc(32))).to.be.true;
      expect(store.remove(handle)).to.be.false;
      const pair = crypto.generateKeyPairSync("ed25519");
      const asym = store.add({ kind: "ed25519", ...pair, info: {} });
      expect(store.remove(asym)).to.be.true;
      expect(store.size).to.equal(0);
    });

    it("bounds the shared store", async () => {
      for (let i = 0; i <= keyStore.capacity; i++) {
        await newKey("hmac-sha256");
      }
      expect(keyStore.size).to.equal(keyStore.capacity);
    });
  });

  describe("crypto_kms_wrap / crypto_kms_unwrap", () => {
    it("does not let a keyId holder derive the KEK", async () => {
      const dek = await newKey("symmetric-256");
      const keyId = "public-key-label";
      const wrap = await call("crypto_kms_wrap", {
        provider: "local",
        keyId,
        keyHandle: dek.keyHandle,
      });
      let recovered: string | undefined;
      try {
        recovered = unwrapWithKeyIdOnly(keyId, wrap.wrappedKey);
      } catch {
        recovered = undefined;
      }
      expect(recovered).to.not.equal(secretOf(dek.keyHandle).toString("hex"));
    });

    it("unwraps to a handle holding the same DEK", async () => {
      const dek = await newKey("symmetric-256");
      const wrap = await call("crypto_kms_wrap", {
        provider: "local",
        keyId: "roundtrip",
        keyHandle: dek.keyHandle,
      });
      const unwrap = await call("crypto_kms_unwrap", {
        provider: "local",
        keyId: "roundtrip",
        wrappedKey: wrap.wrappedKey,
      });
      expect(unwrap.status).to.equal("unwrapped");
      expect(secretOf(unwrap.keyHandle)).to.deep.equal(secretOf(dek.keyHandle));
    });

    it("reuses one KEK per label across several wraps", async () => {
      const deks = [
        await newKey("symmetric-256"),
        await newKey("symmetric-256"),
      ];
      const wrapped: string[] = [];
      for (const dek of deks) {
        const res = await call("crypto_kms_wrap", {
          provider: "local",
          keyId: "shared-label",
          keyHandle: dek.keyHandle,
        });
        wrapped.push(res.wrappedKey);
      }
      for (const [i, wrappedKey] of wrapped.entries()) {
        const res = await call("crypto_kms_unwrap", {
          provider: "local",
          keyId: "shared-label",
          wrappedKey,
        });
        expect(secretOf(res.keyHandle)).to.deep.equal(
          secretOf(deks[i].keyHandle),
        );
      }
    });

    it("rejects providers that are not configured", async () => {
      const dek = await newKey("symmetric-256");
      for (const provider of ["aws", "gcp", "azure", "vault"]) {
        const wrap = await callError("crypto_kms_wrap", {
          provider,
          keyId: "k",
          keyHandle: dek.keyHandle,
        });
        expect(wrap, provider).to.include("not configured");
        const unwrap = await callError("crypto_kms_unwrap", {
          provider,
          keyId: "k",
          wrappedKey: "00",
        });
        expect(unwrap, provider).to.include("not configured");
      }
      const bogus = await callError("crypto_kms_wrap", {
        provider: "bogus",
        keyId: "k",
        keyHandle: dek.keyHandle,
      });
      expect(bogus).to.include('"provider" must be one of');
    });

    it("refuses to unwrap under a key label that never wrapped", async () => {
      const dek = await newKey("symmetric-256");
      const wrap = await call("crypto_kms_wrap", {
        provider: "local",
        keyId: "label-a",
        keyHandle: dek.keyHandle,
      });
      const unwrap = await callError("crypto_kms_unwrap", {
        provider: "local",
        keyId: "label-never-used",
        wrappedKey: wrap.wrappedKey,
      });
      expect(unwrap).to.include("Unknown key");
    });

    it("wraps only symmetric-256 key handles", async () => {
      const mac = await newKey("hmac-sha256");
      const res = await callError("crypto_kms_wrap", {
        provider: "local",
        keyId: "k",
        keyHandle: mac.keyHandle,
      });
      expect(res).to.include("refers to a hmac-sha256 key");
    });

    it("caps the number of KEK labels", async () => {
      const dek = await newKey("symmetric-256");
      let error = "";
      for (let i = 0; i <= MAX_KEK_LABELS && !error; i++) {
        const res = await executeTool("crypto_kms_wrap", {
          provider: "local",
          keyId: `cap-${i}`,
          keyHandle: dek.keyHandle,
        });
        if (res.isError) error = res.content[0].text;
      }
      expect(error).to.include(`At most ${MAX_KEK_LABELS} KEK labels`);
      // Labels created before the cap keep working.
      await call("crypto_kms_wrap", {
        provider: "local",
        keyId: "cap-0",
        keyHandle: dek.keyHandle,
      });
    });
  });

  describe("crypto_generate_key", () => {
    it("holds a real ML-KEM-768 keypair usable for decapsulation", async () => {
      const key = await newKey("ml-kem-768");
      expect(key.publicKey).to.match(/^[0-9a-f]{2368}$/);
      expect(secretOf(key.keyHandle)).to.have.lengthOf(2400);
      const enc = mlKemEncap(768, key.publicKey);
      const dec = await call("crypto_kem_decapsulate", {
        keyHandle: key.keyHandle,
        ciphertext: enc.ciphertext,
      });
      expect(secretOf(dec.keyHandle).toString("hex")).to.equal(
        enc.sharedSecret,
      );
    });

    it("rejects RSA modulus lengths outside the documented set", async () => {
      for (const modulusLength of [512, 1024, 2047]) {
        const res = await executeTool("crypto_generate_key", {
          type: "rsa",
          modulusLength,
        });
        expect(res.isError, String(modulusLength)).to.be.true;
      }
      const ok = await newKey("rsa", { modulusLength: 3072 });
      expect(ok.bits).to.equal(3072);
    });

    it("rejects curves outside the documented set", async () => {
      const res = await executeTool("crypto_generate_key", {
        type: "ecc",
        curve: "secp112r1",
      });
      expect(res.isError).to.be.true;
      const ok = await newKey("ecc", { curve: "secp384r1" });
      expect(ok.curve).to.equal("secp384r1");
    });
  });

  describe("handler guards behind the schema", () => {
    it("generateKey refuses weak RSA moduli and unlisted curves", async () => {
      expect(
        await rejection(generateKey({ type: "rsa", modulusLength: 1024 })),
      ).to.include("Unsupported RSA modulus length");
      expect(
        await rejection(generateKey({ type: "ecc", curve: "secp112r1" })),
      ).to.include("Unsupported curve");
      const dsa = await generateKey({ type: "dsa" });
      expect(dsa.isError).to.be.true;
    });
  });

  describe("crypto_hash", () => {
    it("rejects algorithms outside the declared enum", async () => {
      for (const algorithm of ["md5", "sha1", "sha224", "SHA256"]) {
        const res = await executeTool("crypto_hash", {
          data: "x",
          algorithm,
        });
        expect(res.isError, algorithm).to.be.true;
        expect(res.content[0].text).to.include('"algorithm" must be one of');
      }
    });

    it("refuses an undeclared algorithm even past the schema", async () => {
      expect(await rejection(hash({ data: "x", algorithm: "md5" }))).to.include(
        "Unsupported hash algorithm",
      );
    });

    it("accepts every algorithm in the declared enum", async () => {
      for (const algorithm of [
        "sha256",
        "sha384",
        "sha512",
        "sha3-256",
        "blake2b512",
      ]) {
        const res = await executeTool("crypto_hash", { data: "x", algorithm });
        expect(res.isError, algorithm).to.be.undefined;
        expect(parse(res).digest).to.equal(
          crypto.createHash(algorithm).update("x").digest("hex"),
        );
      }
    });
  });

  describe("crypto_sign rsa-pss", () => {
    it("produces an RSASSA-PSS signature, not PKCS#1 v1.5", async () => {
      const key = await newKey("rsa");
      const res = await call("crypto_sign", {
        data: "x",
        keyHandle: key.keyHandle,
      });
      expect(res.algorithm).to.equal("rsa-pss");
      const sig = Buffer.from(res.signature, "hex");
      const pss = crypto.verify(
        "sha256",
        Buffer.from("x"),
        {
          key: key.publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        sig,
      );
      expect(pss).to.be.true;
      expect(crypto.verify("sha256", Buffer.from("x"), key.publicKey, sig)).to
        .be.false;
    });
  });

  describe("server version", () => {
    it("reports the version from package.json", async () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
      ) as { version: string };
      const res = await new CryptoMcpServer().handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      });
      const info = (res.result as { serverInfo: { version: string } })
        .serverInfo;
      expect(info.version).to.equal(pkg.version);
    });
  });
});
