/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";
import type { crypto as CryptoApi } from "@sebastienrousseau/crypto-lib";

/** Supported signature algorithms for modern signing and verification. */
const ALGORITHMS = [
  "ed25519",
  "ed448",
  "ecdsa-p256",
  "ecdsa-p384",
  "schnorr",
  "ml-dsa-44",
  "ml-dsa-65",
  "ml-dsa-87",
];

/** The questions handleModernSign asks, in order. */
const QUESTIONS: prompts.PromptObject[] = [
  {
    type: "select",
    name: "algorithm",
    message: "Select signing algorithm",
    choices: ALGORITHMS.map((a) => ({ title: a, value: a })),
  },
  {
    type: "select",
    name: "action",
    message: "Action",
    choices: [
      { title: "Generate key pair + sign", value: "keygen-sign" },
      { title: "Sign with existing key", value: "sign" },
      { title: "Verify signature", value: "verify" },
    ],
  },
  {
    type: "text",
    name: "message",
    message: "Message to sign/verify",
  },
];

/** Signing algorithms whose keygen algorithm has a different name. */
const KEYGEN_ALGORITHM: Record<string, string> = {
  "ecdsa-p256": "p256",
  "ecdsa-p384": "p384",
};

/** Write a value as indented JSON in green. */
function printJson(value: unknown): void {
  writeUtils.writeLn(format.green(JSON.stringify(value, null, 2)));
}

/** Generate a key pair for the algorithm, sign the message, print both. */
async function keygenAndSign(
  crypto: typeof CryptoApi,
  algorithm: string,
  message: string,
): Promise<void> {
  if (algorithm === "schnorr") {
    // Schnorr uses secp256k1, generate manually
    const { generateSchnorrKeyPair } =
      await import("@sebastienrousseau/crypto-lib/modern");
    const kp = generateSchnorrKeyPair();
    const sig = crypto.sign("schnorr", kp.privateKey, message);
    printJson({
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      signature: sig,
      algorithm: "schnorr",
    });
    return;
  }
  const { generateKeyPair } =
    await import("@sebastienrousseau/crypto-lib/keys");
  // Map signing algorithms to keygen algorithms
  const keyAlgo = KEYGEN_ALGORITHM[algorithm] ?? algorithm;
  const kp = generateKeyPair(keyAlgo as never);
  const sig = crypto.sign(algorithm as never, kp.privateKey, message);
  printJson({
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
    signature: sig,
    algorithm,
  });
}

/** Prompt for a private key and sign the message with it. */
async function signWithKey(
  crypto: typeof CryptoApi,
  algorithm: string,
  message: string,
): Promise<void> {
  const keyResp = await prompts({
    type: "password",
    name: "privateKey",
    message: "Private key (hex)",
  });
  if (!keyResp.privateKey) return;
  const sig = crypto.sign(algorithm as never, keyResp.privateKey, message);
  printJson({ signature: sig, algorithm });
}

/** Prompt for a public key and signature and verify the message. */
async function verifySignature(
  crypto: typeof CryptoApi,
  algorithm: string,
  message: string,
): Promise<void> {
  const verifyResp = await prompts([
    { type: "text", name: "publicKey", message: "Public key (hex)" },
    { type: "text", name: "signature", message: "Signature (hex)" },
  ]);
  if (!verifyResp.publicKey || !verifyResp.signature) return;
  const valid = crypto.verify(
    algorithm as never,
    verifyResp.publicKey,
    message,
    verifyResp.signature,
  );
  printJson({ valid, algorithm });
}

/**
 * Interactively sign or verify messages using modern signature schemes
 * (Ed25519, Ed448, ECDSA, Schnorr, ML-DSA).
 *
 * @example
 * ```ts
 * await handleModernSign();
 * ```
 */
const handleModernSign = async () => {
  const response = await prompts(QUESTIONS);

  if (!response.algorithm || !response.action || !response.message) return;

  try {
    const { crypto } = await import("@sebastienrousseau/crypto-lib");
    let run = verifySignature;
    if (response.action === "keygen-sign") run = keygenAndSign;
    else if (response.action === "sign") run = signWithKey;
    await run(crypto, response.algorithm, response.message);
  } catch (err) {
    writeUtils.writeLn(
      format.red(`Operation failed: ${(err as Error).message}`),
    );
  }
};

/** Default export of the handleModernSign command handler. */
export default handleModernSign;
