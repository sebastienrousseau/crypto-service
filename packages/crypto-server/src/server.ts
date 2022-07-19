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
import fastifyHealthcheck from "fastify-healthcheck";
import logger from "./lib/logger";
import routes from './routes';

async function build() {

  // Create a new fastify instance and register plugins
  const app = fastify(fastifyOptions);

  // Logger middleware for fastify instance (logs to console)
  logger.info("\n\nEnvironment details: " + consoleOutput);

  // Register plugins.
  app.register(Accepts); // fastify-accepts plugin
  app.register(Etag); // fastify-etag plugin
  app.register(fastifyHealthcheck, healthCheckOptions); // fastify-healthcheck plugin
  app.register(import("@fastify/rate-limit"), rateLimitOptions); // fastify-rate-limit plugin
  app.register(import("@fastify/compress"), compressOptions); // fastify-compress plugin

  routes(app);

  return app
}
export { build };
