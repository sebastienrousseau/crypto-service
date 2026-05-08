/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks POST `/v1/generate` — generate an OpenPGP key pair.
 *
 * @deprecated The v1 API (OpenPGP-based) is deprecated and will be removed in v1.0.0.
 * Use POST /v2/keys/generate instead.
 */

import type { FastifyInstance } from "fastify";
import generate from "@sebastienrousseau/crypto-lib/dist/lib/generate";
import {
  IBodyGenerate,
  KEY_TYPES,
  CURVE_TYPES,
  FORMAT_TYPES,
  KeyType,
  CurveType,
  FormatType,
} from "../../@types/types";
import {
  validateRequiredString,
  validateOptionalNumber,
  validateEmail,
  validateEnum,
} from "../../utils/validation";
import {
  rejectUnauthorized,
  collectValidation,
} from "../../utils/route-helpers";

const generateSchema = {
  tags: ["Key Management"],
  summary: "Generate a key pair",
  description:
    "Generates an OpenPGP key pair (RSA or ECC). The private key is NOT returned for security.",
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            publicKey: { type: "string" },
            revocationCertificate: { type: "string" },
          },
        },
        warning: { type: "string" },
      },
    },
    400: {
      type: "object",
      properties: { error: { type: "string" }, details: { type: "array" } },
    },
    401: { type: "object", properties: { error: { type: "string" } } },
  },
  body: {
    type: "object",
    required: ["name", "email", "type", "passphrase", "curve", "format"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 256 },
      email: { type: "string", minLength: 3, maxLength: 256 },
      type: { type: "string", enum: [...KEY_TYPES] },
      passphrase: { type: "string", minLength: 1, maxLength: 1024 },
      curve: { type: "string", enum: [...CURVE_TYPES] },
      format: { type: "string", enum: [...FORMAT_TYPES] },
      rsaBits: { type: "number", minimum: 2048, maximum: 4096 },
      keyExpirationTime: { type: "number", minimum: 0 },
    },
  },
} as const;

/** @deprecated Registers the v1 PGP key-generation route. Use v2 endpoints instead. */
export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyGenerate }>(
    "/v1/generate",
    { schema: generateSchema },
    async (request, reply) => {
      try {
        if (rejectUnauthorized(request, reply)) return;

        const body = request.body as IBodyGenerate;
        const v = collectValidation(
          {
            name: validateRequiredString(body.name, "name"),
            email: validateEmail(body.email, "email"),
            type: validateEnum<KeyType>(body.type, "type", KEY_TYPES),
            passphrase: validateRequiredString(body.passphrase, "passphrase"),
            curve: validateEnum<CurveType>(body.curve, "curve", CURVE_TYPES),
            format: validateEnum<FormatType>(
              body.format,
              "format",
              FORMAT_TYPES,
            ),
            rsaBits: validateOptionalNumber(body.rsaBits, 2048, "rsaBits", {
              min: 2048,
              max: 4096,
            }),
            keyExpirationTime: validateOptionalNumber(
              body.keyExpirationTime,
              0,
              "keyExpirationTime",
              { min: 0 },
            ),
          },
          reply,
        );
        if (!v) return;

        const generated = (await generate({
          date: new Date(),
          name: v.name,
          email: v.email,
          userIDs: [{ name: v.name, email: v.email }],
          type: v.type as KeyType,
          passphrase: v.passphrase,
          rsaBits: v.rsaBits as number,
          curve: v.curve as CurveType,
          keyExpirationTime: v.keyExpirationTime as number,
          format: v.format as FormatType,
        })) as {
          privateKey: string;
          publicKey: string;
          revocationCertificate: string;
        };

        // Private key is intentionally NOT returned over the wire.
        return reply.send({
          data: {
            publicKey: generated.publicKey,
            revocationCertificate: generated.revocationCertificate,
          },
          warning:
            "Private key not included in response for security. Configure secure key delivery for production use.",
        });
      } catch (error) {
        request.log.error(error, "Key pair generation failed");
        return reply.status(500).send({ error: "Key pair generation failed" });
      }
    },
  );
};
