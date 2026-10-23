// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import crypto from "node:crypto";

/**
 * In-memory model of the Vault Transit endpoints VaultKmsProvider uses,
 * matching behaviour observed on a real Vault 1.20.4 dev server:
 * - `context` is ignored for keys that are not derived; only
 *   `associated_data` is authenticated (a mismatch fails with
 *   "cipher: message authentication failed");
 * - `signature_algorithm` names the RSA padding, so "sha2-256" is
 *   rejected for RSA keys; the hash goes in `hash_algorithm`;
 * - verify answers `valid: false` for a wrong input and 400
 *   "invalid signature: no prefix" for a malformed signature;
 * - `min_encryption_version` above the latest version is rejected;
 * - a key can only be deleted once `deletion_allowed` is set;
 * - reading a missing key is a 404, but sign and verify against a missing
 *   key answer 400 "signing key not found" / "signature verification key
 *   not found", and encrypt creates the key (Transit's upsert default).
 * Installed as `globalThis.fetch`.
 */

interface Key {
  type: "aes256-gcm96" | "ed25519" | "rsa-2048";
  versions: Array<{ secret: Buffer; pair?: crypto.KeyPairKeyObjectResult }>;
  minEncryptionVersion: number;
  deletionAllowed: boolean;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const err = (message: string, status = 400) =>
  json({ errors: [message] }, status);

export class FakeVault {
  readonly keys = new Map<string, Key>();
  private original: typeof globalThis.fetch | undefined;

  install(): void {
    this.original = globalThis.fetch;
    globalThis.fetch = (async (url: unknown, init?: RequestInit) =>
      this.handle(new URL(String(url)), init)) as typeof globalThis.fetch;
  }

  uninstall(): void {
    if (this.original) globalThis.fetch = this.original;
  }

  /** Encrypt the way the pre-0.0.36 provider did: no associated data. */
  encryptUnbound(name: string, plaintext: Uint8Array): string {
    return this.seal(
      this.keys.get(name)!,
      Buffer.from(plaintext),
      Buffer.alloc(0),
    );
  }

  private newVersion(type: Key["type"]) {
    if (type === "ed25519") {
      return {
        secret: Buffer.alloc(0),
        pair: crypto.generateKeyPairSync("ed25519"),
      };
    }
    if (type === "rsa-2048") {
      return {
        secret: Buffer.alloc(0),
        pair: crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }),
      };
    }
    return { secret: crypto.randomBytes(32) };
  }

  private seal(key: Key, pt: Buffer, aad: Buffer): string {
    const v = key.versions.length;
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv(
      "aes-256-gcm",
      key.versions[v - 1]!.secret,
      iv,
    );
    c.setAAD(aad);
    const ct = Buffer.concat([iv, c.update(pt), c.final(), c.getAuthTag()]);
    return `vault:v${v}:${ct.toString("base64")}`;
  }

  private open(key: Key, ciphertext: string, aad: Buffer): Buffer | undefined {
    const m = /^vault:v(\d+):(.+)$/.exec(ciphertext);
    const version = m ? key.versions[Number(m[1]) - 1] : undefined;
    if (!m || !version) return undefined;
    const raw = Buffer.from(m[2]!, "base64");
    const d = crypto.createDecipheriv(
      "aes-256-gcm",
      version.secret,
      raw.subarray(0, 12),
    );
    d.setAAD(aad);
    d.setAuthTag(raw.subarray(raw.length - 16));
    try {
      return Buffer.concat([
        d.update(raw.subarray(12, raw.length - 16)),
        d.final(),
      ]);
    } catch {
      return undefined;
    }
  }

  private details(name: string, key: Key) {
    const signing = key.type !== "aes256-gcm96";
    return {
      name,
      type: key.type,
      latest_version: key.versions.length,
      min_encryption_version: key.minEncryptionVersion,
      deletion_allowed: key.deletionAllowed,
      supports_signing: signing,
      supports_encryption: !signing || key.type === "rsa-2048",
      supports_decryption: !signing || key.type === "rsa-2048",
    };
  }

  private sign(key: Key, body: Record<string, string>): Response {
    if (
      key.type === "rsa-2048" &&
      body["signature_algorithm"] !== undefined &&
      !["pss", "pkcs1v15"].includes(body["signature_algorithm"])
    ) {
      return err(
        `1 error occurred:\n\t* unsupported rsa signature algorithm ${body["signature_algorithm"]}\n\n`,
      );
    }
    const v = key.versions.length;
    const input = Buffer.from(body["input"] ?? "", "base64");
    const priv = key.versions[v - 1]!.pair!.privateKey;
    const sig =
      key.type === "ed25519"
        ? crypto.sign(null, input, priv)
        : crypto.sign("sha256", input, {
            key: priv,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          });
    return json({
      data: {
        signature: `vault:v${v}:${sig.toString("base64")}`,
        key_version: v,
      },
    });
  }

  private verify(key: Key, body: Record<string, string>): Response {
    const m = /^vault:v(\d+):(.+)$/.exec(body["signature"] ?? "");
    if (!m) return err("invalid signature: no prefix");
    const version = key.versions[Number(m[1]) - 1];
    if (!version) return err("invalid key version");
    const input = Buffer.from(body["input"] ?? "", "base64");
    const sig = Buffer.from(m[2]!, "base64");
    const pub = version.pair!.publicKey;
    const valid =
      key.type === "ed25519"
        ? crypto.verify(null, input, pub, sig)
        : crypto.verify(
            "sha256",
            input,
            {
              key: pub,
              padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            },
            sig,
          );
    return json({ data: { valid } });
  }

  private async handle(url: URL, init?: RequestInit): Promise<Response> {
    const m = /^\/v1\/transit\/([^/]+)\/([^/]+)(\/[a-z]+)?$/.exec(url.pathname);
    if (!m) return json({ errors: [] }, 404);
    const [, op, name, sub] = m as unknown as [
      string,
      string,
      string,
      string | undefined,
    ];
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const key = this.keys.get(name);

    if (op === "keys" && !sub && method === "POST") {
      const type = (body.type ?? "aes256-gcm96") as Key["type"];
      this.keys.set(name, {
        type,
        versions: [this.newVersion(type)],
        minEncryptionVersion: 0,
        deletionAllowed: false,
      });
      return new Response(null, { status: 204 });
    }
    if (!key && op === "sign") return err("signing key not found");
    if (!key && op === "verify") {
      return err("signature verification key not found");
    }
    if (!key && op === "encrypt") {
      this.keys.set(name, {
        type: "aes256-gcm96",
        versions: [this.newVersion("aes256-gcm96")],
        minEncryptionVersion: 0,
        deletionAllowed: false,
      });
      return this.handle(url, init);
    }
    if (!key) return json({ errors: [] }, 404);
    if (op === "keys" && !sub && method === "GET") {
      return json({ data: this.details(name, key) });
    }
    if (op === "keys" && !sub && method === "DELETE") {
      if (!key.deletionAllowed)
        return err("deletion is not allowed for this key");
      this.keys.delete(name);
      return new Response(null, { status: 204 });
    }
    if (op === "keys" && sub === "/config") {
      if (body.min_encryption_version !== undefined) {
        if (body.min_encryption_version > key.versions.length) {
          return err(
            `cannot set min encryption version of ${body.min_encryption_version}, latest key version is ${key.versions.length}`,
          );
        }
        key.minEncryptionVersion = body.min_encryption_version;
      }
      if (body.deletion_allowed !== undefined)
        key.deletionAllowed = body.deletion_allowed;
      return json({ data: this.details(name, key) });
    }
    if (op === "keys" && sub === "/rotate") {
      key.versions.push(this.newVersion(key.type));
      return json({ data: this.details(name, key) });
    }
    const aad = Buffer.from(body.associated_data ?? "", "base64");
    if (op === "encrypt") {
      return json({
        data: {
          ciphertext: this.seal(
            key,
            Buffer.from(body.plaintext, "base64"),
            aad,
          ),
        },
      });
    }
    if (op === "decrypt") {
      const pt = this.open(key, body.ciphertext, aad);
      if (!pt) return err("cipher: message authentication failed");
      return json({ data: { plaintext: pt.toString("base64") } });
    }
    if (op === "sign") return this.sign(key, body);
    if (op === "verify") return this.verify(key, body);
    return json({ errors: [] }, 404);
  }
}
