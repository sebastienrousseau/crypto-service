/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Defines a route for the root endpoint of the Crypto Server application.
 *
 * @deprecated The v1 API (OpenPGP-based) is deprecated and will be removed in v1.0.0.
 * Migrate to the v2 modern API which supports post-quantum cryptography,
 * modern AEAD ciphers, and high-level abstractions.
 */

import * as fastify from "fastify";
import { randomUUID } from "crypto";
import { LIB_VERSION } from "../../config/constants";
import { GET_ERRORS, fields, problems } from "../../utils/response-schemas";

/** Unique identifier for this server instance. */
const id = randomUUID();

const STRING = { type: "string" } as const;

/** Route schema of `GET /`: service metadata, not wrapped in `data`. */
const ROOT_SCHEMA = {
  tags: ["Service"],
  summary: "Service metadata",
  description:
    "Static, non-secret metadata about this server. Not wrapped in data.",
  response: {
    200: fields(
      {
        id: {
          type: "string",
          format: "uuid",
          description: "Identifier of this server instance, new at each start.",
        },
        title: STRING,
        description: STRING,
        details: STRING,
        license: STRING,
        url: STRING,
        version: {
          type: "string",
          description:
            'The library version as a JSON string literal, quotes included: the characters "1.2.3" with their quotes. Parse it as JSON to get the version.',
        },
      },
      "Service metadata.",
    ),
    ...problems(...GET_ERRORS),
  },
} as const;

/**
 * @deprecated Use v2 API instead. This endpoint will be removed in v1.0.0.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get("/", { schema: ROOT_SCHEMA }, async () => {
    return {
      id: id,
      title: "Welcome to Crypto Server",
      description:
        "Crypto Server is a Fastify web server that exposes easy consumable REST APIs to perform low-level cryptographic operations.",
      details:
        "It supports the following cryptographic operations:\n- Digital Signing,\n- Encryption and Decryption,\n- Key Generation,\n- Key Management,\n- Pseudorandom Number Generation,\n- Signature Verification.\n- Development of this server is hosted by GitHub at the following page. Source code is available to everyone under the standard MIT license.",
      license: "MIT",
      url: "https://crypto-server.com",
      version: LIB_VERSION,
    };
  });
};
