// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { HASH_ALGORITHMS } from "./definitions";
import { ToolHandler, jsonResult } from "./result";

/** `crypto_sign`: Ed25519, HMAC-SHA256, or RSA (SHA-256) signature. */
export const sign: ToolHandler = async (args) => {
  const data = String(args.data);
  const algorithm = (args.algorithm as string) || "ed25519";
  const privateKey = String(args.privateKey);

  if (algorithm === "hmac-sha256") {
    const signature = crypto
      .createHmac("sha256", privateKey)
      .update(data)
      .digest("hex");
    return jsonResult({ algorithm: "hmac-sha256", signature });
  }

  if (algorithm === "ed25519") {
    const signature = crypto
      .sign(null, Buffer.from(data), privateKey)
      .toString("hex");
    return jsonResult({ algorithm, signature });
  }

  const signer = crypto.createSign("SHA256");
  signer.update(data);
  signer.end();
  return jsonResult({ algorithm, signature: signer.sign(privateKey, "hex") });
};

function verifySignature(
  algorithm: string,
  data: string,
  signature: string,
  publicKey: string,
): boolean {
  if (algorithm === "hmac-sha256") {
    const expected = crypto
      .createHmac("sha256", publicKey)
      .update(data)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  }
  if (algorithm === "ed25519") {
    return crypto.verify(
      null,
      Buffer.from(data),
      publicKey,
      Buffer.from(signature, "hex"),
    );
  }
  const verifier = crypto.createVerify("SHA256");
  verifier.update(data);
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signature, "hex"));
}

/** `crypto_verify`: check a signature produced by `crypto_sign`. */
export const verify: ToolHandler = async (args) => {
  const algorithm = (args.algorithm as string) || "ed25519";
  const valid = verifySignature(
    algorithm,
    String(args.data),
    String(args.signature),
    String(args.publicKey),
  );
  return jsonResult({ algorithm, valid });
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
