/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import * as fastify from "fastify";
import { randomUUID } from "node:crypto";
import { LIB_VERSION } from "../../config/constants";

// Generate a unique identifier for the server instance.
const id = randomUUID();

export default (app: fastify.FastifyInstance): void => {
  app.get("/", async () => {
    return {
      id,
      title: "👋 Welcome to Crypto Server!",
      description:
        "Crypto Server is a Fastify web server that exposes consumable REST APIs to perform cryptographic operations.",
      details:
        "Operations: Digital Signing, Encryption/Decryption, Key Generation, Key Management, Signature Verification.",
      license: "MIT",
      url: "https://crypto-server.com",
      version: LIB_VERSION,
    };
  });
};
