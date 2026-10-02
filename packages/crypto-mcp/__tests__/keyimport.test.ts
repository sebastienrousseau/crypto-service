// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { executeTool } from "../src";
import { KEY_DIR_ENV, MAX_KEY_FILE_BYTES } from "../src/tools/definitions";
import { call, callError } from "./helpers";

const IMPORT = "crypto_key_import";

/** A PKCS#8 PEM private key and its SPKI PEM public key. */
function pemPair(
  type: "ed25519" | "rsa" | "ec" | "x25519",
  options: object = {},
): { privatePem: string; publicPem: string } {
  const pair = crypto.generateKeyPairSync(type as "ed25519", options);
  return {
    privatePem: pair.privateKey.export({
      type: "pkcs8",
      format: "pem",
    }) as string,
    publicPem: pair.publicKey.export({ type: "spki", format: "pem" }) as string,
  };
}

describe("crypto_key_import", () => {
  let root: string;
  let keyDir: string;
  let outside: string;
  const savedDir = process.env[KEY_DIR_ENV];

  /** Write a file below the key directory. */
  const put = (name: string, data: string | Buffer) =>
    fs.writeFileSync(path.join(keyDir, name), data);

  /** Import a file and return its error text, which must leak nothing. */
  async function refused(args: object, leaked?: string): Promise<string> {
    const text = await callError(IMPORT, args);
    expect(text).to.not.include(root);
    if (leaked) expect(text).to.not.include(leaked);
    return text;
  }

  before(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mcp-imp-")));
    keyDir = path.join(root, "keys");
    outside = path.join(root, "outside");
    fs.mkdirSync(path.join(keyDir, "sub"), { recursive: true });
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "key.bin"), crypto.randomBytes(32));
    // Junctions are directory links Windows creates without the symlink
    // privilege; on other platforms the type is ignored and a symlink made.
    fs.symlinkSync(outside, path.join(keyDir, "escape"), "junction");
    fs.symlinkSync(
      path.join(keyDir, "sub"),
      path.join(keyDir, "inner"),
      "junction",
    );
  });

  beforeEach(() => {
    process.env[KEY_DIR_ENV] = keyDir;
  });

  after(() => {
    if (savedDir === undefined) delete process.env[KEY_DIR_ENV];
    else process.env[KEY_DIR_ENV] = savedDir;
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe("raw 32-byte keys", () => {
    it("imports hex and decrypts data encrypted outside the server", async () => {
      const secret = crypto.randomBytes(32);
      put("aes.hex", `${secret.toString("hex").toUpperCase()}\r\n`);
      const key = await call(IMPORT, { path: "aes.hex" });
      expect(key.type).to.equal("symmetric-256");
      expect(key.source).to.equal("crypto_key_import");

      for (const algorithm of ["aes-256-gcm", "chacha20-poly1305"] as const) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(algorithm, secret, iv, {
          authTagLength: 16,
        });
        const ciphertext = Buffer.concat([
          cipher.update("made outside", "utf8"),
          cipher.final(),
        ]);
        const res = await call("crypto_decrypt", {
          algorithm,
          keyHandle: key.keyHandle,
          ciphertext: ciphertext.toString("hex"),
          iv: iv.toString("hex"),
          authTag: cipher.getAuthTag().toString("hex"),
        });
        expect(res.plaintext).to.equal("made outside");
      }
      const wrap = await call("crypto_kms_wrap", {
        provider: "local",
        keyId: "imported",
        keyHandle: key.keyHandle,
      });
      expect(wrap.status).to.equal("wrapped");
    });

    it("imports lower-case hex in a subdirectory", async () => {
      put(path.join("sub", "low.hex"), crypto.randomBytes(32).toString("hex"));
      const key = await call(IMPORT, { path: "sub/low.hex" });
      expect(key.type).to.equal("symmetric-256");
    });

    it("imports a binary file as an HMAC key", async () => {
      const secret = crypto.randomBytes(32);
      put("mac.bin", secret);
      const key = await call(IMPORT, { path: "mac.bin", kind: "hmac-sha256" });
      expect(key.type).to.equal("hmac-sha256");
      const res = await call("crypto_sign", {
        data: "d",
        keyHandle: key.keyHandle,
      });
      const expected = crypto.createHmac("sha256", secret).update("d");
      expect(res.signature).to.equal(expected.digest("hex"));
    });

    it("follows a link that stays inside the directory", async () => {
      put(path.join("sub", "linked.bin"), crypto.randomBytes(32));
      const key = await call(IMPORT, { path: "inner/linked.bin" });
      expect(key.type).to.equal("symmetric-256");
    });

    it("never returns the key bytes", async () => {
      const secret = crypto.randomBytes(32);
      put("leak.hex", secret.toString("hex"));
      const res = await executeTool(IMPORT, { path: "leak.hex" });
      const text = res.content[0].text;
      expect(text).to.not.include(secret.toString("hex"));
      expect(text).to.not.include(secret.toString("base64"));
    });
  });

  describe("PKCS#8 private keys", () => {
    const cases: Array<{
      name: string;
      type: "ed25519" | "rsa" | "ec";
      options: object;
      kind: string;
      algorithm: string;
    }> = [
      {
        name: "Ed25519",
        type: "ed25519",
        options: {},
        kind: "ed25519",
        algorithm: "ed25519",
      },
      {
        name: "RSA-2048",
        type: "rsa",
        options: { modulusLength: 2048 },
        kind: "rsa",
        algorithm: "rsa-pss",
      },
      {
        name: "P-256",
        type: "ec",
        options: { namedCurve: "prime256v1" },
        kind: "ecc",
        algorithm: "ecdsa-sha256",
      },
      {
        name: "P-384",
        type: "ec",
        options: { namedCurve: "secp384r1" },
        kind: "ecc",
        algorithm: "ecdsa-sha384",
      },
      {
        name: "secp256k1",
        type: "ec",
        options: { namedCurve: "secp256k1" },
        kind: "ecc",
        algorithm: "ecdsa-sha256",
      },
    ];
    for (const c of cases) {
      it(`imports ${c.name} and signs with it`, async () => {
        const { privatePem, publicPem } = pemPair(c.type, c.options);
        put(`${c.name}.pem`, privatePem);
        const key = await call(IMPORT, { path: `${c.name}.pem` });
        expect(key.type).to.equal(c.kind);
        expect(key.publicKey).to.equal(publicPem);
        const res = await executeTool("crypto_sign", {
          data: "d",
          keyHandle: key.keyHandle,
        });
        expect(res.content[0].text).to.not.include("PRIVATE KEY");
        const signed = JSON.parse(res.content[0].text);
        expect(signed.algorithm).to.equal(c.algorithm);
        const check = await call("crypto_verify", {
          data: "d",
          signature: signed.signature,
          publicKey: publicPem,
        });
        expect(check.valid).to.be.true;
      });
    }
  });

  describe("refusals", () => {
    it("is disabled while the key directory is unset", async () => {
      delete process.env[KEY_DIR_ENV];
      expect(await refused({ path: "aes.hex" })).to.include(
        `Key import is disabled: set ${KEY_DIR_ENV}`,
      );
    });

    it("refuses a key directory that does not exist", async () => {
      process.env[KEY_DIR_ENV] = path.join(root, "missing");
      expect(await refused({ path: "aes.hex" })).to.include(
        `${KEY_DIR_ENV} does not exist`,
      );
    });

    it("refuses control characters, absolute paths and '..'", async () => {
      expect(await refused({ path: "a\u0000b" })).to.include(
        "control characters",
      );
      const absolute = path.join(outside, "key.bin");
      expect(await refused({ path: absolute })).to.include("must be relative");
      for (const p of [
        "../outside/key.bin",
        "sub/../../outside/key.bin",
        "sub\\..\\x",
      ]) {
        expect(await refused({ path: p }), p).to.include("'..' segments");
      }
    });

    it("refuses a link that leads outside the directory", async () => {
      expect(await refused({ path: "escape/key.bin" })).to.include(
        `path resolves outside ${KEY_DIR_ENV}`,
      );
    });

    it("refuses missing files and directories", async () => {
      expect(await refused({ path: "nope.pem" })).to.include("not found");
      expect(await refused({ path: "sub" })).to.include("not a regular file");
      expect(await refused({ path: "." })).to.include("outside");
    });

    it("refuses files over the size limit", async () => {
      put("big.bin", Buffer.alloc(MAX_KEY_FILE_BYTES + 1, 0x41));
      expect(await refused({ path: "big.bin" })).to.include("larger than");
    });

    it("refuses unrecognised content without echoing it", async () => {
      const files: Record<string, string> = {
        "short.txt": "not-a-key!",
        "empty.txt": "",
        "spaces.txt": "\n\n",
        "high.hex": "z".repeat(64),
        "low.hex": "0!".repeat(32),
      };
      for (const [name, data] of Object.entries(files)) {
        put(name, data);
        const text = await refused({ path: name }, data || undefined);
        expect(text, name).to.include("Unrecognised key file");
      }
    });

    it("refuses encrypted, public, PKCS#1 and malformed PEM files", async () => {
      const encrypted = crypto.generateKeyPairSync("ed25519", {
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
          cipher: "aes-256-cbc",
          passphrase: "test-only",
        },
        publicKeyEncoding: { type: "spki", format: "pem" },
      });
      const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
      const files: Record<string, [string, string]> = {
        "enc.pem": [encrypted.privateKey, "Encrypted PKCS#8"],
        "pub.pem": [encrypted.publicKey, "Public keys are not imported"],
        "pkcs1.pem": [
          rsa.privateKey.export({ type: "pkcs1", format: "pem" }) as string,
          "Unsupported PEM block",
        ],
        "bad.pem": [
          "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n",
          "not a valid PKCS#8",
        ],
      };
      for (const [name, [data, message]] of Object.entries(files)) {
        put(name, data);
        const text = await refused({ path: name }, data.split("\n")[1]);
        expect(text, name).to.include(message);
      }
    });

    it("refuses unsupported key types and sizes", async () => {
      const files: Record<string, [string, string]> = {
        "x25519.pem": [
          pemPair("x25519").privatePem,
          "Unsupported private key type: x25519",
        ],
        "rsa1024.pem": [
          pemPair("rsa", { modulusLength: 1024 }).privatePem,
          "Unsupported RSA modulus length",
        ],
        "p521.pem": [
          pemPair("ec", { namedCurve: "secp521r1" }).privatePem,
          "Unsupported EC curve",
        ],
      };
      for (const [name, [data, message]] of Object.entries(files)) {
        put(name, data);
        expect(await refused({ path: name }), name).to.include(message);
      }
    });

    it("refuses kind for a PEM key", async () => {
      put("kind.pem", pemPair("ed25519").privatePem);
      expect(
        await refused({ path: "kind.pem", kind: "hmac-sha256" }),
      ).to.include("kind applies only to raw keys");
    });

    it("validates its arguments", async () => {
      const cases: Array<[object, string]> = [
        [{ path: "a".repeat(513) }, "at most 512"],
        [{ path: "" }, "at least 1"],
        [{ path: "k", kind: "rsa" }, "must be one of"],
        [{ path: "k", key: "00" }, "unknown property"],
      ];
      for (const [args, message] of cases) {
        expect(await refused(args)).to.include(message);
      }
    });
  });
});
