/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for the root endpoint of the Crypto Server application.
 *
 * @deprecated The v1 API (OpenPGP-based) is deprecated and will be removed in v1.0.0.
 * Migrate to the v2 modern API which supports post-quantum cryptography,
 * modern AEAD ciphers, and high-level abstractions.
 */

import * as fastify from "fastify";
import { v4 as uuidv4 } from "uuid";
import { LIB_VERSION } from "../../config/constants";

// Generate a unique identifier for the server instance.
const id = uuidv4();

/**
 * @deprecated Use v2 API instead. This endpoint will be removed in v1.0.0.
 */
export default (app: fastify.FastifyInstance): void => {
  app.get("/", async () => {
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
