/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import type { FastifyInstance } from "fastify";
import { SUPPORTED_ALGORITHMS } from "@sebastienrousseau/crypto-lib/dist/modern";

export default (app: FastifyInstance): void => {
  app.get(
    "/v2/algorithms",
    {
      schema: {
        tags: ["Algorithms"],
        summary: "List supported algorithms",
        description:
          "Returns all cryptographic algorithms supported by the v2 API.",
      },
    },
    async () => {
      return { data: SUPPORTED_ALGORITHMS };
    },
  );
};
