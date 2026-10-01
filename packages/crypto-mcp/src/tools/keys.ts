// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { mlKemKeygen } from "@sebastienrousseau/crypto-lib";
import { EC_CURVES, RSA_MODULUS_LENGTHS } from "./definitions";
import { ToolArgs, ToolHandler, errorResult, jsonResult } from "./result";

const PEM = {
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
} as const;

function generateEd25519(): Record<string, unknown> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", PEM);
  return { type: "ed25519", quantumSafe: false, publicKey, privateKey };
}

function generateRsa(args: ToolArgs): Record<string, unknown> {
  const modulusLength = Number(args.modulusLength) || 2048;
  if (!RSA_MODULUS_LENGTHS.includes(modulusLength)) {
    throw new Error(
      `Unsupported RSA modulus length: ${modulusLength} (allowed: ${RSA_MODULUS_LENGTHS.join(", ")})`,
    );
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength,
    ...PEM,
  });
  return {
    type: "rsa",
    bits: modulusLength,
    quantumSafe: false,
    publicKey,
    privateKey,
  };
}

function generateEcc(args: ToolArgs): Record<string, unknown> {
  const namedCurve = (args.curve as string) || "prime256v1";
  if (!EC_CURVES.includes(namedCurve)) {
    throw new Error(
      `Unsupported curve: ${namedCurve} (allowed: ${EC_CURVES.join(", ")})`,
    );
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve,
    ...PEM,
  });
  return {
    type: "ecc",
    curve: namedCurve,
    quantumSafe: false,
    publicKey,
    privateKey,
  };
}

/** Real ML-KEM-768 (FIPS 203) keypair from crypto-lib, hex-encoded. */
function generateMlKem768(): Record<string, unknown> {
  const { publicKey, secretKey } = mlKemKeygen(768);
  return {
    type: "ml-kem-768",
    standard: "NIST FIPS 203",
    securityCategory: 3,
    quantumSafe: true,
    encoding: "hex",
    publicKey,
    privateKey: secretKey,
  };
}

const GENERATORS: Record<string, (args: ToolArgs) => Record<string, unknown>> =
  {
    ed25519: generateEd25519,
    rsa: generateRsa,
    ecc: generateEcc,
    "ml-kem-768": generateMlKem768,
  };

/** `crypto_generate_key`: generate a classical or post-quantum keypair. */
export const generateKey: ToolHandler = async (args) => {
  const type = String(args.type);
  const generator = Object.hasOwn(GENERATORS, type)
    ? GENERATORS[type]
    : undefined;
  if (!generator) return errorResult(`Unsupported key type: ${type}`);
  return jsonResult(generator(args));
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
  const keyData = args.keyData ? String(args.keyData).trim() : "";
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
