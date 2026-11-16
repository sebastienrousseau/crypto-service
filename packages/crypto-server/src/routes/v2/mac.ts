/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { classifyCryptoError } from "../../utils/route-helpers";
import type { HmacAlgorithm } from "@sebastienrousseau/crypto-lib/modern";
import { dataRoute, fields, flag, hex } from "../../utils/response-schemas";

/** List of HMAC algorithms accepted by the v2 HMAC endpoint. */
const HMAC_ALGORITHMS = ["sha256", "sha384", "sha512", "sha3-256", "sha3-512"];

/** The `algorithm` field of an HMAC result. */
const HMAC_ALGORITHM = { type: "string", enum: HMAC_ALGORITHMS };

/** Registers /v2/hmac. */
function registerHmac(app: FastifyInstance): void {
  app.post(
    "/v2/hmac",
    {
      schema: {
        tags: ["MAC"],
        summary: "Compute an HMAC",
        body: {
          type: "object",
          required: ["algorithm", "key", "data"],
          additionalProperties: false,
          properties: {
            algorithm: { type: "string", enum: HMAC_ALGORITHMS },
            key: { type: "string", minLength: 1 },
            data: { type: "string", minLength: 1 },
          },
        },
        response: dataRoute(
          "The HMAC of the UTF-8 bytes of data, keyed with the hex key (at least 16 bytes).",
          fields({ mac: hex("The tag."), algorithm: HMAC_ALGORITHM }),
        ),
      },
    },
    async (request, reply) => {
      try {
        const { computeHmac } =
          await import("@sebastienrousseau/crypto-lib/modern");
        const body = request.body as {
          algorithm: string;
          key: string;
          data: string;
        };
        const result = computeHmac({
          algorithm: body.algorithm as HmacAlgorithm,
          key: body.key,
          data: body.data,
        });
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "HMAC computation");
      }
    },
  );
}

/** Registers /v2/hmac/verify. */
function registerHmacVerify(app: FastifyInstance): void {
  app.post(
    "/v2/hmac/verify",
    {
      schema: {
        tags: ["MAC"],
        summary: "Verify an HMAC",
        body: {
          type: "object",
          required: ["algorithm", "key", "data", "mac"],
          additionalProperties: false,
          properties: {
            algorithm: { type: "string", enum: HMAC_ALGORITHMS },
            key: { type: "string", minLength: 1 },
            data: { type: "string", minLength: 1 },
            mac: { type: "string", minLength: 1 },
          },
        },
        response: dataRoute(
          "Whether the tag matches, compared in constant time.",
          fields({
            valid: flag("Whether the tag matches."),
            algorithm: HMAC_ALGORITHM,
          }),
        ),
      },
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        const { verifyHmac } =
          await import("@sebastienrousseau/crypto-lib/modern");
        const body = request.body as {
          algorithm: string;
          key: string;
          data: string;
          mac: string;
        };
        const result = verifyHmac({
          algorithm: body.algorithm as HmacAlgorithm,
          key: body.key,
          data: body.data,
          mac: body.mac,
        });
        return reply.send({ data: result });
      } catch (error) {
        return classifyCryptoError(error, request, reply, "HMAC verification");
      }
    },
  );
}

/** Registers the v2 HMAC/KMAC message-authentication endpoint. */
export default (app: FastifyInstance): void => {
  registerHmac(app);
  registerHmacVerify(app);
};
