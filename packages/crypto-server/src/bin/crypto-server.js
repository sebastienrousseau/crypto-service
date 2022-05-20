import Accepts from "@fastify/accepts";
import decrypt from "@sebastienrousseau/crypto-core/src/lib/decrypt.js";
import encrypt from "@sebastienrousseau/crypto-core/src/lib/encrypt.js";
import Etag from "@fastify/etag";
import Fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";
import generate from "@sebastienrousseau/crypto-core/src/lib/generate.js";
import helmet from "@fastify/helmet";
import logger from "../lib/logger.js";
import getIp from "../lib/network.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const config = require("../config/config.json");


// -----------------------------------------------------------------------------
// CLI ARGS
// -----------------------------------------------------------------------------

/* CLI arguments. */
const args = process.argv.slice(2);
const PROTOCOL = process.env.PROTOCOL || "http";
const HOST = process.env.HOST || "localhost";
const PORT = process.env.NODE_PORT || config.app.port;
const IP = getIp();

let consoleOutput = [
  "\n → protocol: " + PROTOCOL,
  "\n → hostname: " + HOST,
  "\n → port: " + PORT,
  "\n → ip: " + IP,
  "\n"
];

logger.info("\n\nEnvironment details: " + consoleOutput);

/**
 * Create a new instance of the fastify server.
 */
const CryptoServer = async() => {
  /* Creating a new instance of the fastify server. */
  const app = Fastify({
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

  // Body content-type parsing
  app.addContentTypeParser("*", function(request, payload, done) {
    // pipe-it directly, we don't care for it
    done();
  });

  // logger.info(process.argv);

  // ---------------------------------------------------------------------------
  // ROUTES
  // ---------------------------------------------------------------------------

  /* This is a route handler. It is a function that is called when a request is
  made to the server. */
  app.get("/v1/generate", async(request, reply) => {
    logger.info(request.headers);
    let generateKeyPair = await generate({ ...request.headers });
    reply
      .send({ "data": generateKeyPair });
  });

  app.get("/v1/encrypt", async(request, reply) => {
    logger.info(request.headers);
    let encryptedData = await encrypt({ ...request.headers });
    reply
      .send({ "data": encryptedData });
  });

  app.get("/v1/decrypt", async(request, reply) => {
    logger.info(request.headers);
    let decryptedData = await decrypt({ ...request.headers });
    reply
      .send({ "data": decryptedData });
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  app.setErrorHandler((error, request, reply) => {
    // Log error
    logger.error(error);

    reply.header("Cache-Control", "public, max-age=5, s-maxage=0");
    reply.code(500);

    const accept = request.accepts();
    const errorResponse = {};

    Object.getOwnPropertyNames(error).forEach(key => { errorResponse[key] = error[key]; });
    reply.send({ error: errorResponse });


    // ---------------------------------------------------------------------------
    // PLUGINS
    // ---------------------------------------------------------------------------

    // Register the Health plugin
    app.register(Accepts);
    app.register(Etag);
    app.register(fastifyHealthcheck, { healthcheckUrl: `/${config.healthCheck.path}` });

    // Helmet config
    app.register(helmet, {
      contentSecurityPolicy: false,
      dnsPrefetchControl: false,
      expectCt: false,
      frameguard: {
        action: "sameorigin",
      },
      hidePoweredBy: false,
      hsts:
      {
        maxAge: 365 * 24 * 60 * 60,
        includeSubDomains: false,
        preload: false, // ! includeSubDomains must be true for preloading to be approved
      },
      ieNoOpen: false,
      // noSniff
      noCache: true,
      permittedCrossDomainPolicies: false,
      policy: "same-origin",
      referrerPolicy: {
        policy: "no-referrer-when-downgrade",
      },
      // xssFilter:
    });

    /* A plugin that compresses the response. */
    app.register(import("@fastify/compress"), {
      global: true
    });
  });

  // ---------------------------------------------------------------------------
  // LAUNCH
  // ---------------------------------------------------------------------------

  /**
     * The function starts the server and listens on the port and host specified in
     * the environment variables
     */
  const start = async() => {
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
};

/* Calling the function with the arguments. */
CryptoServer({
  curve: args[1],
  email: args[3],
  expiration: args[5],
  format: args[7],
  name: args[9],
  passphrase: args[11],
  sign: args[13],
  size: args[15],
  type: args[17],
});
export default CryptoServer;
