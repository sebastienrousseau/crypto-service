/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import decryptRoute from "./v1/decrypt";
import encryptRoute from "./v1/encrypt";
import generateRoute from "./v1/generate";
import indexRoute from "./v1/index";
import reformatRoute from "./v1/reformat";
import revokeRoute from "./v1/revoke";
import sessionRoute from "./v1/session";
import signRoute from "./v1/sign";
import verifyRoute from "./v1/verify";

export default (app: fastify.FastifyInstance): void => {
  decryptRoute(app);
  encryptRoute(app);
  generateRoute(app);
  indexRoute(app);
  reformatRoute(app);
  revokeRoute(app);
  sessionRoute(app);
  signRoute(app);
  verifyRoute(app);
};
