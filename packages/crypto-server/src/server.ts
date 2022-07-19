import {
  compressOptions,
  consoleOutput,
  fastifyOptions,
  healthCheckOptions,
  rateLimitOptions,
} from "./config/constants";

import Accepts from "@fastify/accepts";
import Etag from "@fastify/etag";
import fastify from "fastify"
import fastifyCompress from "@fastify/compress";
import fastifyHealthcheck from "fastify-healthcheck";
import fastifyRateLimit from "@fastify/rate-limit";
import logger from "./lib/logger";
import routes from './routes';

async function init() {

  // Create a new fastify instance and register plugins
  const app = fastify(fastifyOptions);

  // Logger middleware for fastify instance (logs to console)
  logger.info("\n\nEnvironment details: " + consoleOutput);

  routes(app);

  // Register plugins.
  await app
    .register(Accepts) // fastify-accepts plugin
    .register(Etag) // fastify-etag plugin
    .register(fastifyCompress, compressOptions) // fastify-compress plugin
    .register(fastifyHealthcheck, healthCheckOptions) // fastify-healthcheck plugin
    .register(fastifyRateLimit, rateLimitOptions) // fastify-rate-limit plugin
    .ready();

  return app
}
export { init };
