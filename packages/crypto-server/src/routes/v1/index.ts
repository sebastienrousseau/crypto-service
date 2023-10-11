/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Defines a route for the root endpoint of the Crypto Server application.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import * as fastify from 'fastify';
import { v4 as uuidv4 } from "uuid";
import { LIB_VERSION } from '../../config/constants';

// Generate a unique identifier for the server instance.
const id = uuidv4();

/**
 * Registers a GET route `/` that provides general information about the Crypto Server.
 *
 * @param app {fastify.FastifyInstance} - The Fastify instance to register the route.
 *
 * @example
 * GET /
 *
 * @returns {Object} General information about the Crypto Server.
 */
export default (app: fastify.FastifyInstance): void => {

  app.get("/", async () => {
    return {
      id: id,
      title: "👋 Welcome to Crypto Server!",
      description: "Crypto Server is a Fastify web server that exposes easy consumable REST APIs to perform low-level cryptographic operations.",
      details: "It supports the following cryptographic operations:\n- Digital Signing,\n- Encryption and Decryption,\n- Key Generation,\n- Key Management,\n- Pseudorandom Number Generation,\n- Signature Verification.\n- Development of this server is hosted by GitHub at the following page. Source code is available to everyone under the standard MIT license.",
      license: "MIT",
      url: "https://crypto-server.com",
      version: LIB_VERSION,
    };
  });
};
