// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { HASH_ALGORITHMS } from "./definitions";
import { ToolHandler, jsonResult } from "./result";

/** RSASSA-PSS with SHA-256, MGF1-SHA-256 and a digest-length salt. */
function pssKey(key: string) {
  return {
    key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  };
}

/** `crypto_sign`: Ed25519, HMAC-SHA256, or RSASSA-PSS (SHA-256). */
export const sign: ToolHandler = async (args) => {
  const data = String(args.data);
  const algorithm = String(args.algorithm);
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

  const signature = crypto
    .sign("sha256", Buffer.from(data), pssKey(privateKey))
    .toString("hex");
  return jsonResult({ algorithm, signature });
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
  return crypto.verify(
    "sha256",
    Buffer.from(data),
    pssKey(publicKey),
    Buffer.from(signature, "hex"),
  );
}

/** `crypto_verify`: check a signature produced by `crypto_sign`. */
export const verify: ToolHandler = async (args) => {
  const algorithm = String(args.algorithm);
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
