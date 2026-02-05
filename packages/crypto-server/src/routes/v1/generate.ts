/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for key pair generation in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import {
  IHeadersGenerate,
  KEY_TYPES,
  CURVE_TYPES,
  FORMAT_TYPES,
  KeyType,
  CurveType,
  FormatType
} from '../../@types/types';
import {
  validateRequiredString,
  validateOptionalNumber,
  validateEmail,
  validateEnum,
  sendValidationError,
  validateApiKey,
  ValidationError
} from '../../utils/validation';

/**
 * Registers a GET route `/v1/generate` for key pair generation.
 *
 * The route expects headers containing:
 * - `name`: Name of the entity.
 * - `email`: Email of the entity.
 * - `type`: Type of the key (ecc or rsa).
 * - `passphrase`: Passphrase for the key.
 * - `rsaBits`: [optional] Bit size of the RSA key. Defaults to 2048.
 * - `curve`: Curve type for ECC key generation.
 * - `keyExpirationTime`: [optional] Key expiration time in seconds. Defaults to 0 (no expiration).
 * - `format`: Format of the key (armored, binary, object).
 * - `x-api-key`: Optional API key for authentication.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/generate
 * Headers:
 *   - name: "MyEntity"
 *   - email: "myentity@example.com"
 *   - type: "ecc"
 *   - passphrase: "myPassphrase"
 *   - rsaBits: "2048"
 *   - curve: "curve25519"
 *   - keyExpirationTime: "0"
 *   - format: "armored"
 *
 * @returns {Object} The generated key pair (public key and revocation certificate only for security).
 */
export default (app: fastify.FastifyInstance): void => {
  app.get<{
    Headers: IHeadersGenerate;
  }>("/v1/generate", async (request, reply) => {
    try {
      // API Key authentication (optional - controlled by environment variable)
      const apiKeyConfig = process.env.CRYPTO_API_KEY;
      if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
        return reply.status(401).send({ error: 'Unauthorized: Invalid or missing API key' });
      }

      // Input validation
      const errors: ValidationError[] = [];

      const nameResult = validateRequiredString(
        request.headers["name"],
        "name"
      );
      if (!nameResult.valid) {
        errors.push(nameResult.error);
      }

      const emailResult = validateEmail(
        request.headers["email"],
        "email"
      );
      if (!emailResult.valid) {
        errors.push(emailResult.error);
      }

      const typeResult = validateEnum<KeyType>(
        request.headers["type"],
        "type",
        KEY_TYPES
      );
      if (!typeResult.valid) {
        errors.push(typeResult.error);
      }

      const passphraseResult = validateRequiredString(
        request.headers["passphrase"],
        "passphrase"
      );
      if (!passphraseResult.valid) {
        errors.push(passphraseResult.error);
      }

      const curveResult = validateEnum<CurveType>(
        request.headers["curve"],
        "curve",
        CURVE_TYPES
      );
      if (!curveResult.valid) {
        errors.push(curveResult.error);
      }

      const formatResult = validateEnum<FormatType>(
        request.headers["format"],
        "format",
        FORMAT_TYPES
      );
      if (!formatResult.valid) {
        errors.push(formatResult.error);
      }

      const rsaBitsResult = validateOptionalNumber(
        request.headers["rsabits"] as string | undefined,
        2048,
        "rsaBits",
        { min: 2048, max: 4096 }
      );
      if (!rsaBitsResult.valid) {
        errors.push(rsaBitsResult.error);
      }

      const keyExpirationTimeResult = validateOptionalNumber(
        request.headers["keyexpirationtime"] as string | undefined,
        0,
        "keyExpirationTime",
        { min: 0 }
      );
      if (!keyExpirationTimeResult.valid) {
        errors.push(keyExpirationTimeResult.error);
      }

      if (errors.length > 0) {
        return sendValidationError(reply, errors);
      }

      // Type assertions are safe here because we've validated all inputs above
      const name = (nameResult as { valid: true; value: string }).value;
      const email = (emailResult as { valid: true; value: string }).value;

      const generateKeyPair = await generate({
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
      }) as { privateKey: string; publicKey: string; revocationCertificate: string };

      // Security: Only return public key and revocation certificate
      // Private key should be delivered through a secure channel
      reply.send({
        data: {
          publicKey: generateKeyPair.publicKey,
          revocationCertificate: generateKeyPair.revocationCertificate,
          // Note: Private key is intentionally not included in response for security
          // Use a secure key delivery mechanism for production deployments
        },
        warning: 'Private key not included in response for security. Configure secure key delivery for production use.'
      });
    } catch (error) {
      // Log error internally but don't expose details to client
      request.log.error(error, 'Key pair generation failed');
      reply.status(500).send({ error: 'Key pair generation failed' });
    }
  });
};
