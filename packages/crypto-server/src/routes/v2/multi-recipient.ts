/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import {
  base64,
  dataRoute,
  fields,
  hex,
  literal,
} from "../../utils/response-schemas";

/** One recipient's wrapped content key. */
const WRAPPED_FOR = {
  type: "object",
  required: ["type", "wrappedKey", "ephemeralPublicKey"],
  properties: {
    type: {
      type: "string",
      enum: ["x25519", "x25519-ml-kem-768"],
      description:
        "x25519 for a classical recipient, x25519-ml-kem-768 for a pq one.",
    },
    wrappedKey: base64("The content key, wrapped for this recipient."),
    ephemeralPublicKey: hex("The sender's ephemeral X25519 public key."),
    mlKemCiphertext: hex("The ML-KEM-768 ciphertext (pq recipients only)."),
  },
} as const;

/** What `POST /v2/multi-recipient/encrypt` answers. */
const ENCRYPT_RESPONSE = dataRoute(
  "The ciphertext and one wrapped key per recipient, in request order.",
  fields({
    ciphertext: base64(
      "The content, sealed with XChaCha20-Poly1305 under a random key.",
    ),
    recipients: { type: "array", items: WRAPPED_FOR },
    algorithm: literal("multi-recipient-secretbox", "Envelope algorithm."),
  }),
);

/** A recipient as the route accepts it. */
interface RouteRecipient {
  type: "classical" | "pq";
  publicKey: string;
  mlKemPublicKey?: string;
}

/** Map a route recipient to the crypto-lib recipient type. */
function toLibRecipient(r: RouteRecipient) {
  if (r.type === "classical") {
    return { type: "x25519" as const, publicKey: r.publicKey };
  }
  return {
    type: "x25519-ml-kem-768" as const,
    x25519PublicKey: r.publicKey,
    mlKemPublicKey: r.mlKemPublicKey!,
  };
}

/** Registers v2 multi-recipient encryption/decryption endpoints. */
export default (app: FastifyInstance): void => {
  app.post(
    "/v2/multi-recipient/encrypt",
    {
      schema: {
        tags: ["Multi-Recipient"],
        summary: "Encrypt for multiple recipients (hybrid key wrapping)",
        body: {
          type: "object",
          required: ["plaintext", "recipients"],
          additionalProperties: false,
          properties: {
            plaintext: { type: "string", minLength: 1 },
            recipients: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["type", "publicKey"],
                properties: {
                  type: {
                    type: "string",
                    enum: ["classical", "pq"],
                  },
                  publicKey: { type: "string", minLength: 1 },
                  mlKemPublicKey: { type: "string" },
                },
              },
            },
          },
        },
        response: ENCRYPT_RESPONSE,
      },
    },
    async (request, reply) => {
      try {
        const { multiEncrypt } =
          await import("@sebastienrousseau/crypto-lib/high-level");
        const { plaintext, recipients } = request.body as {
          plaintext: string;
          recipients: RouteRecipient[];
        };
        // Map route types to library types
        const libRecipients = recipients.map(toLibRecipient);
        return reply.send({ data: multiEncrypt(libRecipients, plaintext) });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Encryption");
      }
    },
  );
};
