/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import prompts from "prompts";
import { writeUtils } from "../../utils/write.utils";
import format from "kleur";

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

const handleModernSign = async () => {
  const response = await prompts([
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
  ]);

  if (!response.algorithm || !response.action || !response.message) return;

  try {
    const { crypto } =
      await import("@sebastienrousseau/crypto-lib/dist/crypto");

    if (response.action === "keygen-sign") {
      const { generateKeyPair } =
        await import("@sebastienrousseau/crypto-lib/dist/keys/keygen");

      // Map signing algorithms to keygen algorithms
      let keyAlgo = response.algorithm;
      if (keyAlgo === "ecdsa-p256") keyAlgo = "p256";
      if (keyAlgo === "ecdsa-p384") keyAlgo = "p384";
      if (keyAlgo === "schnorr") {
        // Schnorr uses secp256k1, generate manually
        const { generateSchnorrKeyPair } =
          await import("@sebastienrousseau/crypto-lib/dist/modern/curves");
        const kp = generateSchnorrKeyPair();
        const sig = crypto.sign("schnorr", kp.privateKey, response.message);
        writeUtils.writeLn(
          format.green(
            JSON.stringify(
              {
                publicKey: kp.publicKey,
                privateKey: kp.privateKey,
                signature: sig,
                algorithm: "schnorr",
              },
              null,
              2,
            ),
          ),
        );
        return;
      }

      const kp = generateKeyPair(keyAlgo as never);
      const sig = crypto.sign(
        response.algorithm as never,
        kp.privateKey,
        response.message,
      );
      writeUtils.writeLn(
        format.green(
          JSON.stringify(
            {
              publicKey: kp.publicKey,
              privateKey: kp.privateKey,
              signature: sig,
              algorithm: response.algorithm,
            },
            null,
            2,
          ),
        ),
      );
    } else if (response.action === "sign") {
      const keyResp = await prompts({
        type: "password",
        name: "privateKey",
        message: "Private key (hex)",
      });
      if (!keyResp.privateKey) return;
      const sig = crypto.sign(
        response.algorithm as never,
        keyResp.privateKey,
        response.message,
      );
      writeUtils.writeLn(
        format.green(
          JSON.stringify(
            { signature: sig, algorithm: response.algorithm },
            null,
            2,
          ),
        ),
      );
    } else {
      const verifyResp = await prompts([
        { type: "text", name: "publicKey", message: "Public key (hex)" },
        { type: "text", name: "signature", message: "Signature (hex)" },
      ]);
      if (!verifyResp.publicKey || !verifyResp.signature) return;
      const valid = crypto.verify(
        response.algorithm as never,
        verifyResp.publicKey,
        response.message,
        verifyResp.signature,
      );
      writeUtils.writeLn(
        format.green(
          JSON.stringify({ valid, algorithm: response.algorithm }, null, 2),
        ),
      );
    }
  } catch (err) {
    writeUtils.writeLn(
      format.red(`Operation failed: ${(err as Error).message}`),
    );
  }
};

export default handleModernSign;
