// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { mlKemEncap, mlKemDecap } from "@sebastienrousseau/crypto-lib";
import { CryptoMcpServer, executeTool } from "../src";

const parse = (res: { content: Array<{ text: string }> }) =>
  JSON.parse(res.content[0].text);

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
  describe("crypto_kms_wrap / crypto_kms_unwrap", () => {
    it("does not let a keyId holder derive the KEK", async () => {
      const dek = crypto.randomBytes(32).toString("hex");
      const keyId = "public-key-label";
      const wrap = parse(
        await executeTool("crypto_kms_wrap", { provider: "local", keyId, dek }),
      );
      let recovered: string | undefined;
      try {
        recovered = unwrapWithKeyIdOnly(keyId, wrap.wrappedKey);
      } catch {
        recovered = undefined;
      }
      expect(recovered).to.not.equal(dek);
    });

    it("round-trips a DEK through the local provider", async () => {
      const dek = crypto.randomBytes(32).toString("hex");
      const wrap = await executeTool("crypto_kms_wrap", {
        provider: "local",
        keyId: "roundtrip",
        dek,
      });
      expect(wrap.isError).to.be.undefined;
      const unwrap = await executeTool("crypto_kms_unwrap", {
        provider: "local",
        keyId: "roundtrip",
        wrappedKey: parse(wrap).wrappedKey,
      });
      expect(unwrap.isError).to.be.undefined;
      expect(parse(unwrap).dek).to.equal(dek);
    });

    it("reuses one KEK per label across several wraps", async () => {
      const deks = [1, 2].map(() => crypto.randomBytes(32).toString("hex"));
      const wrapped: string[] = [];
      for (const dek of deks) {
        const res = await executeTool("crypto_kms_wrap", {
          keyId: "shared-label",
          dek,
        });
        wrapped.push(parse(res).wrappedKey);
      }
      for (const [i, wrappedKey] of wrapped.entries()) {
        const res = await executeTool("crypto_kms_unwrap", {
          keyId: "shared-label",
          wrappedKey,
        });
        expect(parse(res).dek).to.equal(deks[i]);
      }
    });

    it("rejects providers that are not configured", async () => {
      const dek = crypto.randomBytes(32).toString("hex");
      for (const provider of ["aws", "gcp", "azure", "vault", "bogus"]) {
        const wrap = await executeTool("crypto_kms_wrap", {
          provider,
          keyId: "k",
          dek,
        });
        expect(wrap.isError, provider).to.be.true;
        expect(wrap.content[0].text).to.include("not configured");
        const unwrap = await executeTool("crypto_kms_unwrap", {
          provider,
          keyId: "k",
          wrappedKey: "00",
        });
        expect(unwrap.isError, provider).to.be.true;
        expect(unwrap.content[0].text).to.include("not configured");
      }
    });

    it("refuses to unwrap under a key label that never wrapped", async () => {
      const dek = crypto.randomBytes(32).toString("hex");
      const wrap = parse(
        await executeTool("crypto_kms_wrap", { keyId: "label-a", dek }),
      );
      const unwrap = await executeTool("crypto_kms_unwrap", {
        keyId: "label-never-used",
        wrappedKey: wrap.wrappedKey,
      });
      expect(unwrap.isError).to.be.true;
      expect(unwrap.content[0].text).to.include("Unknown key");
    });

    it("rejects a DEK that is not 32 hex-encoded bytes", async () => {
      for (const dek of ["", "abcd", "zz".repeat(32), undefined]) {
        const wrap = await executeTool("crypto_kms_wrap", { dek });
        expect(wrap.isError, String(dek)).to.be.true;
      }
    });
  });

  describe("crypto_generate_key", () => {
    it("returns a real ML-KEM-768 keypair usable for encapsulation", async () => {
      const res = await executeTool("crypto_generate_key", {
        type: "ml-kem-768",
      });
      expect(res.isError).to.be.undefined;
      const key = parse(res);
      expect(key.publicKey).to.match(/^[0-9a-f]{2368}$/);
      expect(key.privateKey).to.match(/^[0-9a-f]{4800}$/);
      const enc = mlKemEncap(768, key.publicKey);
      const dec = mlKemDecap(768, key.privateKey, enc.ciphertext);
      expect(dec.sharedSecret).to.equal(enc.sharedSecret);
    });

    it("rejects RSA modulus lengths outside the documented set", async () => {
      for (const modulusLength of [512, 1024, 2047]) {
        const res = await executeTool("crypto_generate_key", {
          type: "rsa",
          modulusLength,
        });
        expect(res.isError, String(modulusLength)).to.be.true;
      }
      const ok = await executeTool("crypto_generate_key", {
        type: "rsa",
        modulusLength: 3072,
      });
      expect(parse(ok).bits).to.equal(3072);
    });

    it("rejects curves outside the documented set", async () => {
      const res = await executeTool("crypto_generate_key", {
        type: "ecc",
        curve: "secp112r1",
      });
      expect(res.isError).to.be.true;
      const ok = await executeTool("crypto_generate_key", {
        type: "ecc",
        curve: "secp384r1",
      });
      expect(parse(ok).curve).to.equal("secp384r1");
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
        expect(res.content[0].text).to.include("Unsupported hash algorithm");
      }
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

  describe("symmetric key handling", () => {
    const badKeys = [
      "my-secret-passphrase",
      "00".repeat(16),
      "00".repeat(33),
      "00".repeat(31) + "zz",
    ];

    it("crypto_encrypt rejects keys that are not 32 hex-encoded bytes", async () => {
      for (const key of badKeys) {
        const res = await executeTool("crypto_encrypt", {
          plaintext: "p",
          key,
        });
        expect(res.isError, key).to.be.true;
        expect(res.content[0].text).to.include("64 hex characters");
      }
    });

    it("crypto_decrypt rejects keys that are not 32 hex-encoded bytes", async () => {
      const enc = parse(
        await executeTool("crypto_encrypt", { plaintext: "p" }),
      );
      for (const key of badKeys) {
        const res = await executeTool("crypto_decrypt", { ...enc, key });
        expect(res.isError, key).to.be.true;
        expect(res.content[0].text).to.include("64 hex characters");
      }
    });
  });

  describe("crypto_sign rsa-pss", () => {
    it("produces an RSASSA-PSS signature, not PKCS#1 v1.5", async () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      const res = await executeTool("crypto_sign", {
        data: "x",
        algorithm: "rsa-pss",
        privateKey,
      });
      const sig = Buffer.from(parse(res).signature, "hex");
      const pss = crypto.verify(
        "sha256",
        Buffer.from("x"),
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        sig,
      );
      expect(pss).to.be.true;
      expect(crypto.verify("sha256", Buffer.from("x"), publicKey, sig)).to.be
        .false;
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
