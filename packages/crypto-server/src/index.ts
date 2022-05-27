import Accepts from "@fastify/accepts";
import Etag from "@fastify/etag";
import fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";
import logger from "./lib/logger";
import routes from './routes';

const app = fastify({
  bodyLimit: 256 * 1024 * 1, // 256KB
  caseSensitive: true,
  connectionTimeout: 0,
  disableRequestLogging: false,
  ignoreTrailingSlash: false,
  keepAliveTimeout: 5000,
  logger: true,
  maxParamLength: 100,
  onConstructorPoisoning: "error",
  onProtoPoisoning: "error",
  return503OnClosing: true,
  trustProxy: true,
});

/* Environment variables. */
const PROTOCOL = process.env.PROTOCOL || "http";
const HOST = process.env.HOST || "localhost";
const PORT = process.env.NODE_PORT || 3000;

/* Console output. */
const consoleOutput = [
  "\n → protocol: " + PROTOCOL,
  "\n → hostname: " + HOST,
  "\n → port: " + PORT,
  "\n",
];
logger.info("\n\nEnvironment details: " + consoleOutput);

/* Register the Health plugin */
app.register(Accepts);
app.register(Etag);
app.register(fastifyHealthcheck, { healthcheckUrl: "/health" });

/* A plugin that compresses the response. */
app.register(import("@fastify/compress"), {
  global: true,
});

app.get("/", async () => {
  return { hello: "Hello Crypto Server!" };
});

routes(app);

/**
 * The function starts the server and listens on the port and host specified in
 * the environment variables
 */
const start = async () => {
  try {
    await app.listen(PORT, HOST).then(() => {
      logger.info(`Server listening on http://${HOST}:${PORT}/`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
