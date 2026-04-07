/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { generate, type GenerateInput } from "@sebastienrousseau/crypto-lib";
import type { GenerateBody } from "../../@types/types";

// Mirrored from openpgp's `EllipticCurveName`. Pinning the schema to a closed
// enum gives a 400 + clear error early instead of waiting for openpgp's
// runtime check, and lets the request log a useful validation message.
const SUPPORTED_CURVES = [
  "curve25519",
  "ed25519",
  "p256",
  "p384",
  "p521",
  "secp256k1",
  "brainpoolP256r1",
  "brainpoolP384r1",
  "brainpoolP512r1",
] as const;

const bodySchema = {
  type: "object",
  required: ["name", "email"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 128 },
    email: { type: "string", format: "email", maxLength: 256 },
    passphrase: { type: "string", maxLength: 1024 },
    type: { type: "string", enum: ["rsa", "ecc"] },
    rsaBits: { type: "integer", minimum: 2048, maximum: 8192 },
    curve: { type: "string", enum: SUPPORTED_CURVES },
    keyExpirationTime: { type: "integer", minimum: 0 },
  },
} as const;

export default (app: fastify.FastifyInstance): void => {
  app.post<{ Body: GenerateBody }>(
    "/v1/generate",
    {
      schema: { body: bodySchema },
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      try {
        // Build the lib input without explicit `undefined` properties so it
        // satisfies `exactOptionalPropertyTypes`.
        const args: GenerateInput = {
          name: request.body.name,
          email: request.body.email,
        };
        if (request.body.passphrase !== undefined)
          args.passphrase = request.body.passphrase;
        if (request.body.type !== undefined) args.type = request.body.type;
        if (request.body.rsaBits !== undefined)
          args.rsaBits = request.body.rsaBits;
        if (request.body.curve !== undefined) {
          // Cast: openpgp validates the curve name at runtime; the JSON
          // schema also caps the length so this is a safe trust boundary.
          args.curve = request.body.curve as NonNullable<GenerateInput["curve"]>;
        }
        if (request.body.keyExpirationTime !== undefined)
          args.keyExpirationTime = request.body.keyExpirationTime;

        const data = await generate(args);
        return reply.header("Cache-Control", "no-store").send({ data });
      } catch (err) {
        request.log.error({ err }, "generate failed");
        return reply.status(400).send({ error: "generate_failed" });
      }
    },
  );
};
