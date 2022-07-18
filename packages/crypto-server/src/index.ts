import endpointsConfig from "./config/endpoints.config";
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
const HOST = endpointsConfig.HOST || "localhost";
const PORT = endpointsConfig.PORT || 3000;
const PROTOCOL = endpointsConfig.PROTOCOL || "http";

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
app.register(fastifyHealthcheck, {
  healthcheckUrl: "/health",
  // healthcheckUrlDisable: true,
  // healthcheckUrlAlwaysFail: true,
  // exposeUptime: true,
  // underPressureOptions: {}
  exposeUptime: true
});

/* Register rate-limit plugin. */
app.register(import('@fastify/rate-limit'), {
  global: true, // default true
  max: 1, // default 1000
  // ban: 2, // default null
  timeWindow: '1 minute', // default 1000 * 60
  // hook: 'preHandler', // default 'onRequest'
  // cache: 10000, // default 5000
  // allowList: ['127.0.0.1'], // default []
  // redis: new Redis({ host: '127.0.0.1' }), // default null
  nameSpace: 'crypto-server-rate-limit-', // default is 'fastify-rate-limit-'
  // continueExceeding: true, // default false
  // skipOnError: true, // default false
  // keyGenerator: function (request) { /* ... */ }, // default (request) => request.raw.ip
  // errorResponseBuilder: function (request, context) { /* ... */},
  // enableDraftSpec: true, // default false. Uses IEFT draft header standard
  // addHeadersOnExceeding: { // default show all the response headers when rate limit is not reached
  //   'x-ratelimit-limit': true,
  //   'x-ratelimit-remaining': true,
  //   'x-ratelimit-reset': true
  // },
  addHeaders: { // default show all the response headers when rate limit is reached
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true
  }
});

/* A plugin that compresses the response. */
app.register(import("@fastify/compress"), {
  global: true,
});

app.get("/", async () => {
  return { hello: "👋 Welcome to the Crypto Service Suite!" };
});


/**
 * The function starts the server and listens on the port and host specified in
 * the environment variables
 */

const start = async () => {
  routes(app);
  try {
    await app.listen({ port: Number(PORT), host: HOST }).then(() => {
      logger.info(`Server listening on http://${HOST}:${PORT}/`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
