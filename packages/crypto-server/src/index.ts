/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Entrypoint for initializing and starting the Crypto Server.
 * @author The Crypto Service Suite
 * @copyright 2022-2023 The Crypto Service Suite. All rights reserved.
 * @license Apache-2.0 OR MIT
 */

import { HOST, PORT } from "./config/constants";
import { init } from "./server";
import logger from "./lib/logger";

/**
 * Initializes and starts the Crypto Server.
 *
 * The server listens on the host and port defined in the configuration constants.
 * Logs are emitted at various stages to provide feedback about the server's status.
 *
 * @returns {Promise<void>} - A promise that resolves when the server is started.
 *
 * @throws Will throw an error if server initialization or start fails.
 */
const main = async (): Promise<void> => {
  try {
    logger.info("👋 Welcome to the Crypto Server!");

    const server = await init();
    await server.ready();

    await server.listen({ port: Number(PORT), host: HOST });
    logger.info(`🚀 Server listening on http://${HOST}:${PORT}/`);
  } catch (err) {
    if (err instanceof Error) {
        logger.error(`Server failed to start: ${err.message}`);
    } else {
        logger.error('Server failed to start: An unexpected error occurred.');
    }
    process.exit(1);
}
};

// Start the server
main();
