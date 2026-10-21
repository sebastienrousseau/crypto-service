// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import crypto from "node:crypto";

/**
 * In-memory model of the Cloud KMS REST v1 surface the GCP provider uses
 * for asymmetric keys: keys with numbered versions, version state changes,
 * asymmetricSign (digest or data) and publicKey. Installed as
 * `globalThis.fetch`. A digest sign request is only answered when the
 * test has registered the message it expects (`expectMessage`), so the
 * fake can check the digest really is that message's hash and then sign
 * the message itself with node:crypto.
 */

type Algorithm =
  | "EC_SIGN_P256_SHA256"
  | "EC_SIGN_P384_SHA384"
  | "EC_SIGN_ED25519"
  | "RSA_SIGN_PSS_2048_SHA256"
  | "RSA_SIGN_PKCS1_2048_SHA256"
  | "RSA_SIGN_PSS_3072_SHA512"
  | "PQ_SIGN_ML_DSA_65";

/** Digest each algorithm signs; null when it signs the message itself. */
const DIGEST: Record<Algorithm, "sha256" | "sha384" | "sha512" | null> = {
  EC_SIGN_P256_SHA256: "sha256",
  EC_SIGN_P384_SHA384: "sha384",
  EC_SIGN_ED25519: null,
  RSA_SIGN_PSS_2048_SHA256: "sha256",
  RSA_SIGN_PKCS1_2048_SHA256: "sha256",
  RSA_SIGN_PSS_3072_SHA512: "sha512",
  PQ_SIGN_ML_DSA_65: null,
};

interface Version {
  n: number;
  state: "ENABLED" | "DISABLED" | "DESTROY_SCHEDULED";
  algorithm: Algorithm;
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
}

interface Key {
  purpose: "ASYMMETRIC_SIGN";
  algorithm: Algorithm;
  versions: Version[];
}

const PREFIX = "projects/p/locations/l/keyRings/r/cryptoKeys/";

function generate(algorithm: Algorithm) {
  if (algorithm === "EC_SIGN_ED25519") {
    return crypto.generateKeyPairSync("ed25519");
  }
  if (algorithm === "EC_SIGN_P256_SHA256") {
    return crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  }
  if (algorithm === "EC_SIGN_P384_SHA384") {
    return crypto.generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  }
  if (algorithm === "PQ_SIGN_ML_DSA_65") {
    // Any key will do: the provider must refuse the algorithm first.
    return crypto.generateKeyPairSync("ed25519");
  }
  const modulusLength = algorithm === "RSA_SIGN_PSS_3072_SHA512" ? 3072 : 2048;
  return crypto.generateKeyPairSync("rsa", { modulusLength });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export class FakeCloudKms {
  readonly keys = new Map<string, Key>();
  /** Every request URL (path and query) seen, for assertions. */
  readonly calls: string[] = [];
  /** Page size for cryptoKeyVersions listing, small to exercise paging. */
  pageSize = 2;
  private expected: Uint8Array[] = [];
  private original: typeof globalThis.fetch | undefined;

  addKey(id: string, algorithm: Algorithm, versions = 1): void {
    const key: Key = { purpose: "ASYMMETRIC_SIGN", algorithm, versions: [] };
    this.keys.set(id, key);
    for (let i = 0; i < versions; i++) this.addVersion(key);
  }

  /** Register a message the provider is about to sign as a digest. */
  expectMessage(message: Uint8Array): void {
    this.expected.push(message);
  }

  install(): void {
    this.original = globalThis.fetch;
    globalThis.fetch = (async (url: unknown, init?: RequestInit) =>
      this.handle(new URL(String(url)), init)) as typeof globalThis.fetch;
  }

  uninstall(): void {
    if (this.original) globalThis.fetch = this.original;
  }

  private addVersion(key: Key): Version {
    const { privateKey, publicKey } = generate(key.algorithm);
    const v: Version = {
      n: key.versions.length + 1,
      state: "ENABLED",
      algorithm: key.algorithm,
      privateKey,
      publicKey,
    };
    key.versions.push(v);
    return v;
  }

  private versionName(id: string, v: Version): string {
    return `${PREFIX}${id}/cryptoKeyVersions/${v.n}`;
  }

  private versionJson(id: string, v: Version) {
    return {
      name: this.versionName(id, v),
      state: v.state,
      algorithm: v.algorithm,
    };
  }

  private async handle(url: URL, init?: RequestInit): Promise<Response> {
    const path = url.pathname.replace(/^\/v1\//, "");
    this.calls.push(`${init?.method ?? "GET"} ${path}${url.search}`);
    const m =
      /^projects\/p\/locations\/l\/keyRings\/r\/cryptoKeys\/([^/:]+)(.*)$/.exec(
        path,
      );
    const key = m ? this.keys.get(m[1]!) : undefined;
    if (!m || !key) return json({ error: { message: "not found" } }, 404);
    const id = m[1]!;
    const rest = m[2]!;
    const body = init?.body ? JSON.parse(String(init.body)) : {};

    if (rest === "") {
      return json({
        name: `${PREFIX}${id}`,
        purpose: key.purpose,
        versionTemplate: { algorithm: key.algorithm },
      });
    }
    if (rest === "/cryptoKeyVersions" && (init?.method ?? "GET") === "GET") {
      const start = Number(url.searchParams.get("pageToken") ?? "0");
      const page = key.versions.slice(start, start + this.pageSize);
      const next = start + this.pageSize;
      return json({
        cryptoKeyVersions: page.map((v) => this.versionJson(id, v)),
        ...(next < key.versions.length ? { nextPageToken: String(next) } : {}),
      });
    }
    if (rest === "/cryptoKeyVersions" && init?.method === "POST") {
      return json(this.versionJson(id, this.addVersion(key)));
    }
    const vm = /^\/cryptoKeyVersions\/(\d+)(.*)$/.exec(rest);
    const v = vm ? key.versions[Number(vm[1]) - 1] : undefined;
    if (!vm || !v)
      return json({ error: { message: "version not found" } }, 404);
    const action = vm[2]!;

    if (action === ":asymmetricSign") return this.sign(id, v, body);
    if (action === "/publicKey") {
      if (v.state !== "ENABLED") {
        return json({ error: { message: "version is not enabled" } }, 400);
      }
      return json({
        pem: v.publicKey.export({ type: "spki", format: "pem" }),
        algorithm: v.algorithm,
        name: this.versionName(id, v),
      });
    }
    if (action === "" && init?.method === "PATCH") {
      v.state = body.state;
      return json(this.versionJson(id, v));
    }
    if (action === ":destroy" && init?.method === "POST") {
      v.state = "DESTROY_SCHEDULED";
      return json(this.versionJson(id, v));
    }
    return json({ error: { message: `unexpected call ${action}` } }, 400);
  }

  private sign(
    id: string,
    v: Version,
    body: { data?: string; digest?: Record<string, string> },
  ): Response {
    if (v.state !== "ENABLED") {
      return json({ error: { message: "version is disabled" } }, 400);
    }
    const digestAlg = DIGEST[v.algorithm];
    let signature: Buffer;
    if (digestAlg === null) {
      if (!body.data || body.digest) {
        return json({ error: { message: "data required" } }, 400);
      }
      signature = crypto.sign(
        null,
        Buffer.from(body.data, "base64"),
        v.privateKey,
      );
    } else {
      const digest = body.digest?.[digestAlg];
      if (!digest || body.data) {
        return json(
          { error: { message: `${digestAlg} digest required` } },
          400,
        );
      }
      const message = this.expected.find(
        (m) =>
          crypto.createHash(digestAlg).update(m).digest("base64") === digest,
      );
      if (!message) {
        return json(
          { error: { message: "digest of an unexpected message" } },
          400,
        );
      }
      const pss = v.algorithm.startsWith("RSA_SIGN_PSS_");
      const pkcs1 = v.algorithm.startsWith("RSA_SIGN_PKCS1_");
      signature = crypto.sign(
        digestAlg,
        message,
        pss
          ? {
              key: v.privateKey,
              padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
              saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
            }
          : pkcs1
            ? { key: v.privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }
            : v.privateKey,
      );
    }
    return json({
      signature: signature.toString("base64"),
      name: this.versionName(id, v),
    });
  }
}
