/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Registers all API v2 routes — modern cryptographic operations.
 */

import type { FastifyInstance } from "fastify";
import algorithmsRoute from "./algorithms";
import encryptRoute from "./encrypt";
import hashRoute from "./hash";
import kdfRoute from "./kdf";
import macRoute from "./mac";
import passwordRoute from "./password";
import pqRoute from "./pq";
import pqSignRoute from "./pq-sign";
import pqHashSignRoute from "./pq-hash-sign";
import signingRoute from "./signing";
import secretboxRoute from "./secretbox";
import sealedboxRoute from "./sealedbox";
import passwordEncryptRoute from "./password-encrypt";
import keyWrapRoute from "./key-wrap";
import keysRoute from "./keys";
import multiRecipientRoute from "./multi-recipient";

export default (app: FastifyInstance): void => {
  algorithmsRoute(app);
  encryptRoute(app);
  hashRoute(app);
  kdfRoute(app);
  macRoute(app);
  passwordRoute(app);
  pqRoute(app);
  pqSignRoute(app);
  pqHashSignRoute(app);
  signingRoute(app);
  secretboxRoute(app);
  sealedboxRoute(app);
  passwordEncryptRoute(app);
  keyWrapRoute(app);
  keysRoute(app);
  multiRecipientRoute(app);
};
