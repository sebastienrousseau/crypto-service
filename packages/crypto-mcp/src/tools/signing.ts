// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import {
  MlDsaLevel,
  mlDsaSign,
  mlDsaVerify,
} from "@sebastienrousseau/crypto-lib";
import { EC_CURVES, HASH_ALGORITHMS } from "./definitions";
import { KeyKind, keyStore } from "./keystore";
import { ToolArgs, ToolHandler, jsonResult } from "./result";

/** Key kinds that can sign. */
const SIGNING_KINDS: readonly KeyKind[] = [
  "ed25519",
  "rsa",
  "ecc",
  "ml-dsa-44",
  "ml-dsa-65",
  "ml-dsa-87",
  "hmac-sha256",
];

/** How an asymmetric key signs: algorithm name, digest, padding. */
interface Scheme {
  algorithm: string;
  digest: string | null;
  pss: boolean;
}

function ecdsaScheme(key: crypto.KeyObject): Scheme {
  const curve = String(key.asymmetricKeyDetails?.namedCurve);
  if (!EC_CURVES.includes(curve)) {
    throw new Error(`Unsupported EC curve: ${curve}`);
  }
  const digest = curve === "secp384r1" ? "sha384" : "sha256";
  return { algorithm: `ecdsa-${digest}`, digest, pss: false };
}

/**
 * The signature scheme for an asymmetric key: Ed25519, RSASSA-PSS
 * (SHA-256, MGF1-SHA-256, digest-length salt), or ECDSA with SHA-256
 * (SHA-384 on P-384), DER-encoded.
 */
function schemeFor(key: crypto.KeyObject): Scheme {
  switch (key.asymmetricKeyType) {
    case "ed25519":
      return { algorithm: "ed25519", digest: null, pss: false };
    case "rsa":
      return { algorithm: "rsa-pss", digest: "sha256", pss: true };
    case "ec":
      return ecdsaScheme(key);
    default:
      throw new Error(`Unsupported key type: ${key.asymmetricKeyType}`);
  }
}

function keyInput(key: crypto.KeyObject, scheme: Scheme) {
  if (!scheme.pss) return key;
  return {
    key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  };
}

function hmac(secret: Buffer, data: Buffer): Buffer {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

/** `crypto_sign`: sign with the key a handle refers to. */
export const sign: ToolHandler = async (args) => {
  const key = keyStore.use(String(args.keyHandle), SIGNING_KINDS);
  const data = Buffer.from(String(args.data), "utf8");
  if (key.kind === "hmac-sha256") {
    const signature = hmac(key.secret as Buffer, data).toString("hex");
    return jsonResult({ algorithm: "hmac-sha256", signature });
  }
  if (key.kind.startsWith("ml-dsa-")) {
    const level = Number(key.kind.slice(7)) as MlDsaLevel;
    const secretKeyHex = (key.secret as Buffer).toString("hex");
    const { signature, algorithm } = mlDsaSign(level, secretKeyHex, data);
    return jsonResult({ algorithm, signature });
  }
  const privateKey = key.privateKey as crypto.KeyObject;
  const scheme = schemeFor(privateKey);
  const signature = crypto
    .sign(scheme.digest, data, keyInput(privateKey, scheme))
    .toString("hex");
  return jsonResult({ algorithm: scheme.algorithm, signature });
};

function verifyAsymmetric(
  publicKey: crypto.KeyObject,
  data: Buffer,
  signature: Buffer,
): Record<string, unknown> {
  const scheme = schemeFor(publicKey);
  const valid = crypto.verify(
    scheme.digest,
    data,
    keyInput(publicKey, scheme),
    signature,
  );
  return { algorithm: scheme.algorithm, valid };
}

function verifyHmac(
  secret: Buffer,
  data: Buffer,
  signature: Buffer,
): Record<string, unknown> {
  const expected = hmac(secret, data);
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(signature, expected);
  return { algorithm: "hmac-sha256", valid };
}

/** What a signature is checked with: a public key, an HMAC secret, or ML-DSA public key. */
type Verifier =
  | { kind: "asymmetric"; publicKey: crypto.KeyObject }
  | { kind: "hmac"; secret: Buffer }
  | { kind: "ml-dsa"; level: MlDsaLevel; publicKeyHex: string };

const ML_DSA_LEVELS_BY_LEN: Record<number, MlDsaLevel> = {
  2624: 44,
  3904: 65,
  5184: 87,
};

function verifierFromPublic(raw: string): Verifier {
  const pub = raw.trim();
  if (pub.includes("PRIVATE KEY")) {
    throw new Error("publicKey must be a public key, not a private key");
  }
  const mlDsaLevel = /^[0-9a-fA-F]+$/.test(pub)
    ? ML_DSA_LEVELS_BY_LEN[pub.length]
    : undefined;
  if (mlDsaLevel) {
    return { kind: "ml-dsa", level: mlDsaLevel, publicKeyHex: pub };
  }
  return { kind: "asymmetric", publicKey: crypto.createPublicKey(pub) };
}

function verifierFromKey(handle: string): Verifier {
  const key = keyStore.use(handle, SIGNING_KINDS);
  if (key.kind === "hmac-sha256") {
    return { kind: "hmac", secret: key.secret as Buffer };
  }
  if (key.kind.startsWith("ml-dsa-")) {
    const level = Number(key.kind.slice(7)) as MlDsaLevel;
    return { kind: "ml-dsa", level, publicKeyHex: String(key.info.publicKey) };
  }
  return { kind: "asymmetric", publicKey: key.publicKey as crypto.KeyObject };
}

/**
 * The public key to verify against: a PEM or ML-DSA hex string from the caller,
 * or the key a handle refers to. A private key PEM is refused rather than reduced to
 * its public half, so this tool never takes secret material.
 */
function verifierFor(args: ToolArgs): Verifier {
  const hasPub = args.publicKey !== undefined;
  if (hasPub === (args.keyHandle !== undefined)) {
    throw new Error("Pass exactly one of publicKey or keyHandle");
  }
  return hasPub
    ? verifierFromPublic(String(args.publicKey))
    : verifierFromKey(String(args.keyHandle));
}

/** `crypto_verify`: check a signature against a public key or handle. */
export const verify: ToolHandler = async (args) => {
  const verifier = verifierFor(args);
  const data = Buffer.from(String(args.data), "utf8");
  const signatureHex = String(args.signature);
  if (verifier.kind === "ml-dsa") {
    const res = mlDsaVerify(
      verifier.level,
      verifier.publicKeyHex,
      data,
      signatureHex,
    );
    return jsonResult({
      algorithm: `ml-dsa-${verifier.level}`,
      valid: res.valid,
    });
  }
  const signature = Buffer.from(signatureHex, "hex");
  const result =
    verifier.kind === "hmac"
      ? verifyHmac(verifier.secret, data, signature)
      : verifyAsymmetric(verifier.publicKey, data, signature);
  return jsonResult(result);
};

/** `crypto_hash`: digest data with one of the declared algorithms only. */
export const hash: ToolHandler = async (args) => {
  const data = String(args.data);
  const algorithm = (args.algorithm as string) || "sha256";
  if (!HASH_ALGORITHMS.includes(algorithm)) {
    throw new Error(
      `Unsupported hash algorithm: ${algorithm} (allowed: ${HASH_ALGORITHMS.join(", ")})`,
    );
  }
  const digest = crypto.createHash(algorithm).update(data).digest("hex");
  return jsonResult({ algorithm, digest, bytes: digest.length / 2 });
};
