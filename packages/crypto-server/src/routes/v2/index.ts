/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Registers all API v2 routes — modern cryptographic operations.
 */

import * as fastify from "fastify";
import algorithmsRoute from "./algorithms";
import encryptRoute from "./encrypt";
import hashRoute from "./hash";
import kdfRoute from "./kdf";
import pqRoute from "./pq";
import signingRoute from "./signing";

export default (app: fastify.FastifyInstance): void => {
  algorithmsRoute(app);
  encryptRoute(app);
  hashRoute(app);
  kdfRoute(app);
  pqRoute(app);
  signingRoute(app);
};
