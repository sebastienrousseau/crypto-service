/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for key revocation in the Fastify application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import revoke from '@sebastienrousseau/crypto-lib/dist/lib/revoke';
import { IHeadersRevoke, REVOCATION_FLAGS, RevocationFlag } from '../../@types/types';
import {
  validateRequiredString,
  validateRequiredNumber,
  sendValidationError,
  validateApiKey,
  ValidationError
} from '../../utils/validation';

/**
 * Registers a GET route `/v1/revoke` for key revocation.
 *
 * The route expects headers containing:
 * - `passphrase`: The passphrase for key revocation.
 * - `flag`: Flag to indicate the revocation reason (0-3).
 * - `reason`: Reason for the key revocation.
 * - `x-api-key`: Optional API key for authentication.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /v1/revoke
 * Headers:
 *   - passphrase: "myPassphrase"
 *   - flag: "1"
 *   - reason: "Key compromise"
 *
 * @returns {Object} The revocation data.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get<{
    Headers: IHeadersRevoke;
  }>("/v1/revoke", async (request, reply) => {
    try {
      // API Key authentication (optional - controlled by environment variable)
      const apiKeyConfig = process.env.CRYPTO_API_KEY;
      if (!validateApiKey(request.headers["x-api-key"], apiKeyConfig)) {
        return reply.status(401).send({ error: 'Unauthorized: Invalid or missing API key' });
      }

      // Input validation
      const errors: ValidationError[] = [];

      const passphraseResult = validateRequiredString(
        request.headers["passphrase"],
        "passphrase"
      );
      if (!passphraseResult.valid) {
        errors.push(passphraseResult.error);
      }

      const flagResult = validateRequiredNumber(
        request.headers["flag"] as string | undefined,
        "flag",
        { min: 0, max: 3 }
      );
      if (!flagResult.valid) {
        errors.push(flagResult.error);
      } else if (!REVOCATION_FLAGS.includes(flagResult.value as RevocationFlag)) {
        errors.push({
          field: "flag",
          message: `flag must be one of: ${REVOCATION_FLAGS.join(', ')}`
        });
      }

      const reasonResult = validateRequiredString(
        request.headers["reason"],
        "reason"
      );
      if (!reasonResult.valid) {
        errors.push(reasonResult.error);
      }

      if (errors.length > 0) {
        return sendValidationError(reply, errors);
      }

      // Type assertions are safe here because we've validated all inputs above
      const revocationData = await revoke({
        passphrase: (passphraseResult as { valid: true; value: string }).value,
        flag: (flagResult as { valid: true; value: number }).value,
        reason: (reasonResult as { valid: true; value: string }).value,
      });

      reply.send({ data: revocationData });
    } catch (error) {
      // Log error internally but don't expose details to client
      request.log.error(error, 'Revocation operation failed');
      reply.status(500).send({ error: 'Revocation failed' });
    }
  });
};
