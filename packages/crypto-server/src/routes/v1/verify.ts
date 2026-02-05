/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for signature verification in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import verify from '@sebastienrousseau/crypto-lib/dist/lib/verify';
import fastifyRateLimit from "@fastify/rate-limit";
import { IHeadersVerify } from '../../@types/types';
import { rateLimitOptions } from "../../config/constants";
import {
  validateBase64,
  validateDateString,
  sendValidationError,
  validateApiKey,
  ValidationError
} from '../../utils/validation';

/**
 * Registers a GET route `/v1/verify` for signature verification.
 *
 * The route expects headers containing:
 * - `date`: The date associated with the message (ISO format).
 * - `message`: The message to verify (base64 encoded).
 * - `verification-keys`: The keys to use for verification (base64 encoded).
 * - `x-api-key`: Optional API key for authentication.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/verify
 * Headers:
 *   - date: "2023-10-09T08:07:06Z"
 *   - message: "myMessage"
 *   - verification-keys: "myVerificationKeys"
 *
 * @returns {Object} The verification data.
 */
export default (app: fastify.FastifyInstance): void => {

  app
    .register(fastifyRateLimit, rateLimitOptions) // fastify-rate-limit plugin
    .get<{
      Headers: IHeadersVerify;
    }>("/v1/verify", async (request, reply) => {
      try {
        // API Key authentication (optional - controlled by environment variable)
        const apiKeyConfig = process.env.CRYPTO_API_KEY;
        if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
          return reply.status(401).send({ error: 'Unauthorized: Invalid or missing API key' });
        }

        // Input validation
        const errors: ValidationError[] = [];

        const dateResult = validateDateString(
          request.headers["date"],
          "date"
        );
        if (!dateResult.valid) {
          errors.push(dateResult.error);
        }

        const messageResult = validateBase64(
          request.headers["message"],
          "message"
        );
        if (!messageResult.valid) {
          errors.push(messageResult.error);
        }

        const verificationKeysResult = validateBase64(
          request.headers["verification-keys"],
          "verification-keys"
        );
        if (!verificationKeysResult.valid) {
          errors.push(verificationKeysResult.error);
        }

        if (errors.length > 0) {
          return sendValidationError(reply, errors);
        }

        // Type assertions are safe here because we've validated all inputs above
        const verifyData = await verify({
          date: (dateResult as { valid: true; value: Date }).value,
          message: (messageResult as { valid: true; value: string }).value,
          verificationKeys: (verificationKeysResult as { valid: true; value: string }).value,
        });

        reply.send({ data: verifyData });
      } catch (error) {
        // Log error internally but don't expose details to client
        request.log.error(error, 'Verification operation failed');
        reply.status(500).send({ error: 'Verification failed' });
      }
    });
};
