/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { SUPPORTED_ALGORITHMS } from "@sebastienrousseau/crypto-lib/modern";
import { GET_ERRORS, ok, problems } from "../../utils/response-schemas";

/** Algorithm identifiers of one category. */
const IDS = { type: "array", items: { type: "string" } } as const;

/** Algorithm identifiers by category (encryption, hashing, kdf, ...). */
const CATALOGUE = {
  type: "object",
  description: "Algorithm identifiers, by category.",
  required: Object.keys(SUPPORTED_ALGORITHMS),
  properties: Object.fromEntries(
    Object.keys(SUPPORTED_ALGORITHMS).map((category) => [category, IDS]),
  ),
  additionalProperties: IDS,
};

/** Registers the v2 algorithm-listing endpoint. */
export default (app: FastifyInstance): void => {
  app.get(
    "/v2/algorithms",
    {
      schema: {
        tags: ["Algorithms"],
        summary: "List supported algorithms",
        description:
          "Returns all cryptographic algorithms supported by the v2 API.",
        response: {
          ...ok("Supported algorithms.", CATALOGUE),
          ...problems(...GET_ERRORS),
        },
      },
    },
    async () => {
      return { data: SUPPORTED_ALGORITHMS };
    },
  );
};
