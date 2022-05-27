import Accepts from "@fastify/accepts";
import Etag from "@fastify/etag";
import fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";
import routes from './routes';

// import logger from "./logger/logger";



const app = fastify({
  bodyLimit: 256 * 1024 * 1, // 256KB
  caseSensitive: true,
  connectionTimeout: 0,
  disableRequestLogging: false,
  ignoreTrailingSlash: false,
  keepAliveTimeout: 5000,
  logger: { level: "error" },
  maxParamLength: 100,
  onConstructorPoisoning: "error",
  onProtoPoisoning: "error",
  return503OnClosing: true,
  trustProxy: ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
});




// -----------------------------------------------------------------------------
// CLI ARGS
// -----------------------------------------------------------------------------

/* CLI arguments. */
// const args = process.argv.slice(2);
const PROTOCOL = process.env.PROTOCOL || "http";
const HOST = process.env.HOST || "localhost";
const PORT = process.env.NODE_PORT || 3000;

const consoleOutput = [
  "\n → protocol: " + PROTOCOL,
  "\n → hostname: " + HOST,
  "\n → port: " + PORT,
  "\n",
];

console.info("\n\nEnvironment details: " + consoleOutput);

// ---------------------------------------------------------------------------
// PLUGINS
// ---------------------------------------------------------------------------

// Register the Health plugin
app.register(Accepts);
app.register(Etag);
app.register(fastifyHealthcheck, { healthcheckUrl: "/health" });

/* A plugin that compresses the response. */
app.register(import("@fastify/compress"), {
  global: true,
});

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

/* This is a route handler. It is a function that is called when a request is
  made to the server. */
app.get("/", async () => {
  return { hello: "Hello Crypto Service!" };
});

routes(app);


// ---------------------------------------------------------------------------
// LAUNCH
// ---------------------------------------------------------------------------

/**
 * The function starts the server and listens on the port and host specified in
 * the environment variables
 */
const start = async () => {
  try {
    await app.listen(PORT, HOST).then(() => {
      // logger.info(`Server listening on http://${HOST}:${PORT}/`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
