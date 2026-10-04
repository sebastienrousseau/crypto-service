/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import {
  KEY_ID_SCHEMA,
  publicView,
  resolveKey,
  storeKey,
} from "../../utils/keys";

/** crypto-lib HPKE module, loaded on first use. */
const loadHpke = async () =>
  await import("@sebastienrousseau/crypto-lib/modern");

interface KeygenBody {
  kem: "x25519" | "p256" | "x25519-ml-kem-768";
}

interface SealBody {
  recipientPublicKey: string;
  plaintext: string;
  kem?: "x25519" | "p256" | "x25519-ml-kem-768";
  aead?: "chacha20-poly1305" | "aes-128-gcm";
  info?: string;
  aad?: string;
  psk?: string;
  pskId?: string;
}

interface OpenBody {
  keyId: string;
  encapsulatedKey: string;
  ciphertext: string;
  aead?: "chacha20-poly1305" | "aes-128-gcm";
  info?: string;
  aad?: string;
  psk?: string;
  pskId?: string;
}

/** Convert string plaintext to hex if not already hex-encoded. */
function ensureHex(text: string): string {
  const isHex = /^[0-9a-fA-F]*$/.test(text) && text.length % 2 === 0;
  return isHex ? text : Buffer.from(text, "utf8").toString("hex");
}

const KEYGEN_SCHEMA = {
  tags: ["HPKE"],
  summary:
    "Generate a server-held HPKE key pair (classical or post-quantum hybrid)",
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      kem: {
        type: "string",
        enum: ["x25519", "p256", "x25519-ml-kem-768"],
        default: "x25519-ml-kem-768",
      },
    },
  },
} as const;

const SEAL_SCHEMA = {
  tags: ["HPKE"],
  summary: "Encrypt (seal) a message using HPKE (RFC 9180)",
  body: {
    type: "object",
    required: ["recipientPublicKey", "plaintext"],
    additionalProperties: false,
    properties: {
      recipientPublicKey: { type: "string", minLength: 1 },
      plaintext: { type: "string", minLength: 1 },
      kem: { type: "string", enum: ["x25519", "p256", "x25519-ml-kem-768"] },
      aead: { type: "string", enum: ["chacha20-poly1305", "aes-128-gcm"] },
      info: { type: "string" },
      aad: { type: "string" },
      psk: { type: "string" },
      pskId: { type: "string" },
    },
  },
} as const;

const OPEN_SCHEMA = {
  tags: ["HPKE"],
  summary: "Decrypt (open) an HPKE ciphertext with a server-held key",
  body: {
    type: "object",
    required: ["keyId", "encapsulatedKey", "ciphertext"],
    additionalProperties: false,
    properties: {
      keyId: KEY_ID_SCHEMA,
      encapsulatedKey: { type: "string", minLength: 1 },
      ciphertext: { type: "string", minLength: 1 },
      aead: { type: "string", enum: ["chacha20-poly1305", "aes-128-gcm"] },
      info: { type: "string" },
      aad: { type: "string" },
      psk: { type: "string" },
      pskId: { type: "string" },
    },
  },
} as const;

/** `POST /v2/hpke/keygen`: generate a server-held HPKE key pair. */
function registerKeygen(app: FastifyInstance): void {
  app.post(
    "/v2/hpke/keygen",
    { schema: KEYGEN_SCHEMA },
    async (request, reply) => {
      const { hpkeGenerateKeyPair } = await loadHpke();
      const { kem } = request.body as KeygenBody;
      const kp = hpkeGenerateKeyPair(kem);
      const stored = await storeKey(
        request,
        kem,
        { publicKey: kp.publicKey },
        { privateKey: kp.privateKey },
      );
      return reply.send({ data: publicView(stored) });
    },
  );
}

/** `POST /v2/hpke/seal`: encrypt (seal) using HPKE. */
function registerSeal(app: FastifyInstance): void {
  app.post("/v2/hpke/seal", { schema: SEAL_SCHEMA }, async (request, reply) => {
    try {
      const { hpkeSeal } = await loadHpke();
      const b = request.body as SealBody;
      const hexPlaintext = ensureHex(b.plaintext);
      const res = hpkeSeal({
        recipientPublicKey: b.recipientPublicKey,
        plaintext: hexPlaintext,
        suite: {
          kem: b.kem ?? "x25519-ml-kem-768",
          aead: b.aead ?? "chacha20-poly1305",
        },
        ...(b.info ? { info: ensureHex(b.info) } : {}),
        ...(b.aad ? { aad: ensureHex(b.aad) } : {}),
        ...(b.psk && b.pskId ? { psk: { psk: b.psk, pskId: b.pskId } } : {}),
      });
      return reply.send({ data: res });
    } catch (error) {
      return classifyCryptoError(error, request, reply, "Encryption");
    }
  });
}

/** `POST /v2/hpke/open`: decrypt (open) an HPKE ciphertext using server-held key. */
function registerOpen(app: FastifyInstance): void {
  app.post(
    "/v2/hpke/open",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: OPEN_SCHEMA,
    },
    async (request, reply) => {
      const b = request.body as OpenBody;
      const key = await resolveKey(request, b.keyId, [
        "x25519-ml-kem-768",
        "x25519",
        "p256",
      ]);
      try {
        const { hpkeOpen } = await loadHpke();
        const res = hpkeOpen({
          recipientPrivateKey: key.privateParts["privateKey"],
          encapsulatedKey: b.encapsulatedKey,
          ciphertext: b.ciphertext,
          suite: {
            kem: key.algorithm as "x25519" | "p256" | "x25519-ml-kem-768",
            aead: b.aead ?? "chacha20-poly1305",
          },
          ...(b.info ? { info: ensureHex(b.info) } : {}),
          ...(b.aad ? { aad: ensureHex(b.aad) } : {}),
          ...(b.psk && b.pskId ? { psk: { psk: b.psk, pskId: b.pskId } } : {}),
        });
        const utf8 = Buffer.from(res.plaintext, "hex").toString("utf8");
        return reply.send({ data: { plaintext: utf8, hex: res.plaintext } });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "Decryption");
      }
    },
  );
}

/** Registers all HPKE routes. */
export default function hpkeRoute(app: FastifyInstance): void {
  registerKeygen(app);
  registerSeal(app);
  registerOpen(app);
}
