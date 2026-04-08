/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file POST `/v1/generate` — generate an OpenPGP key pair.
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
  sendValidationError,
  validateApiKey,
  ValidationError,
} from "../../utils/validation";

const generateSchema = {
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

export default (app: FastifyInstance): void => {
  app.post<{ Body: IBodyGenerate }>(
    "/v1/generate",
    { schema: generateSchema },
    async (request, reply) => {
      try {
        const apiKeyConfig = process.env["CRYPTO_API_KEY"];
        if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
          return reply.status(401).send({ error: "Unauthorized: Invalid or missing API key" });
        }

        const body = request.body as IBodyGenerate;
        const errors: ValidationError[] = [];

        const nameResult = validateRequiredString(body.name, "name");
        if (!nameResult.valid) errors.push(nameResult.error);

        const emailResult = validateEmail(body.email, "email");
        if (!emailResult.valid) errors.push(emailResult.error);

        const typeResult = validateEnum<KeyType>(body.type, "type", KEY_TYPES);
        if (!typeResult.valid) errors.push(typeResult.error);

        const passphraseResult = validateRequiredString(body.passphrase, "passphrase");
        if (!passphraseResult.valid) errors.push(passphraseResult.error);

        const curveResult = validateEnum<CurveType>(body.curve, "curve", CURVE_TYPES);
        if (!curveResult.valid) errors.push(curveResult.error);

        const formatResult = validateEnum<FormatType>(body.format, "format", FORMAT_TYPES);
        if (!formatResult.valid) errors.push(formatResult.error);

        const rsaBitsResult = validateOptionalNumber(
          body.rsaBits,
          2048,
          "rsaBits",
          { min: 2048, max: 4096 },
        );
        if (!rsaBitsResult.valid) errors.push(rsaBitsResult.error);

        const keyExpirationTimeResult = validateOptionalNumber(
          body.keyExpirationTime,
          0,
          "keyExpirationTime",
          { min: 0 },
        );
        if (!keyExpirationTimeResult.valid) errors.push(keyExpirationTimeResult.error);

        if (errors.length > 0) {
          return sendValidationError(reply, errors);
        }

        const name = (nameResult as { valid: true; value: string }).value;
        const email = (emailResult as { valid: true; value: string }).value;

        const generated = (await generate({
          date: new Date(),
          name,
          email,
          userIDs: [{ name, email }],
          type: (typeResult as { valid: true; value: KeyType }).value,
          passphrase: (passphraseResult as { valid: true; value: string }).value,
          rsaBits: (rsaBitsResult as { valid: true; value: number }).value,
          curve: (curveResult as { valid: true; value: CurveType }).value,
          keyExpirationTime: (keyExpirationTimeResult as { valid: true; value: number }).value,
          format: (formatResult as { valid: true; value: FormatType }).value,
        })) as { privateKey: string; publicKey: string; revocationCertificate: string };

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
