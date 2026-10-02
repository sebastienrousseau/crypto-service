// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { mlKemKeygen } from "@sebastienrousseau/crypto-lib";
import { EC_CURVES, RSA_MODULUS_LENGTHS } from "./definitions";
import { KeyMaterial, keyStore, symmetricKey } from "./keystore";
import { ToolArgs, ToolHandler, errorResult, jsonResult } from "./result";

/** Export a public KeyObject as an SPKI PEM string. */
export function publicPem(key: crypto.KeyObject): string {
  return key.export({ type: "spki", format: "pem" }) as string;
}

/** Key material for an asymmetric pair, with its public key as SPKI PEM. */
export function asymmetric(
  kind: KeyMaterial["kind"],
  pair: { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject },
  info: Record<string, unknown>,
): KeyMaterial {
  return {
    kind,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    info: { ...info, quantumSafe: false, publicKey: publicPem(pair.publicKey) },
  };
}

function generateEd25519(): KeyMaterial {
  return asymmetric("ed25519", crypto.generateKeyPairSync("ed25519"), {});
}

function generateRsa(args: ToolArgs): KeyMaterial {
  const modulusLength = Number(args.modulusLength ?? 2048);
  if (!RSA_MODULUS_LENGTHS.includes(modulusLength)) {
    throw new Error(
      `Unsupported RSA modulus length: ${modulusLength} (allowed: ${RSA_MODULUS_LENGTHS.join(", ")})`,
    );
  }
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength });
  return asymmetric("rsa", pair, { bits: modulusLength });
}

function generateEcc(args: ToolArgs): KeyMaterial {
  const namedCurve = String(args.curve ?? "prime256v1");
  if (!EC_CURVES.includes(namedCurve)) {
    throw new Error(
      `Unsupported curve: ${namedCurve} (allowed: ${EC_CURVES.join(", ")})`,
    );
  }
  const pair = crypto.generateKeyPairSync("ec", { namedCurve });
  return asymmetric("ecc", pair, { curve: namedCurve });
}

/** Real ML-KEM-768 (FIPS 203) keypair from crypto-lib. */
function generateMlKem768(): KeyMaterial {
  const { publicKey, secretKey } = mlKemKeygen(768);
  return {
    kind: "ml-kem-768",
    secret: Buffer.from(secretKey, "hex"),
    info: {
      standard: "NIST FIPS 203",
      securityCategory: 3,
      quantumSafe: true,
      encoding: "hex",
      publicKey,
    },
  };
}

function generateSymmetric(): KeyMaterial {
  return symmetricKey(crypto.randomBytes(32), "generated");
}

function generateHmac(): KeyMaterial {
  return {
    kind: "hmac-sha256",
    secret: crypto.randomBytes(32),
    info: { bits: 256, usage: "crypto_sign, crypto_verify" },
  };
}

const GENERATORS: Record<string, (args: ToolArgs) => KeyMaterial> = {
  ed25519: generateEd25519,
  rsa: generateRsa,
  ecc: generateEcc,
  "ml-kem-768": generateMlKem768,
  "symmetric-256": generateSymmetric,
  "hmac-sha256": generateHmac,
};

/**
 * `crypto_generate_key`: generate a key inside the server and return its
 * handle with public metadata only; the secret never leaves the process.
 */
export const generateKey: ToolHandler = async (args) => {
  const type = String(args.type);
  const generator = Object.hasOwn(GENERATORS, type)
    ? GENERATORS[type]
    : undefined;
  if (!generator) return errorResult(`Unsupported key type: ${type}`);
  return jsonResult(keyStore.describe(keyStore.add(generator(args))));
};

/** `crypto_key_list`: handles and public metadata of every held key. */
export const listKeys: ToolHandler = async () =>
  jsonResult({ keys: keyStore.list(), capacity: keyStore.capacity });

/** `crypto_key_destroy`: wipe a key and invalidate its handle. */
export const destroyKey: ToolHandler = async (args) => {
  const keyHandle = String(args.keyHandle);
  if (!keyStore.remove(keyHandle)) {
    return errorResult("Unknown key handle: nothing was destroyed");
  }
  return jsonResult({ keyHandle, destroyed: true });
};

function classifyKey(keyData: string): string {
  if (keyData.includes("-----BEGIN PGP")) return "OpenPGP Key Block";
  if (keyData.includes("RSA PRIVATE KEY") || keyData.includes("RSA PUBLIC KEY"))
    return "RSA";
  if (keyData.includes("EC PRIVATE KEY") || keyData.includes("EC PUBLIC KEY"))
    return "ECC";
  if (keyData.includes("PUBLIC KEY")) return "SPKI Public Key";
  if (keyData.includes("PRIVATE KEY")) return "PKCS#8 Private Key";
  return "unknown";
}

function keyFormat(keyData: string): string {
  if (keyData.includes("-----BEGIN PGP")) return "OpenPGP";
  return keyData.includes("-----BEGIN") ? "PEM" : "Raw";
}

/** `crypto_inspect_key`: classify a PEM / armored key and fingerprint it. */
export const inspectKey: ToolHandler = async (args) => {
  const keyData = String(args.keyData).trim();
  const fingerprint = crypto
    .createHash("sha256")
    .update(keyData)
    .digest("hex")
    .slice(0, 32);
  return jsonResult({
    format: keyFormat(keyData),
    type: classifyKey(keyData),
    fingerprint: `0x${fingerprint}`,
    length: keyData.length,
  });
};
