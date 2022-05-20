import Accepts from "@fastify/accepts";
import decrypt from "@sebastienrousseau/crypto-core/src/lib/decrypt.js";
import encrypt from "@sebastienrousseau/crypto-core/src/lib/encrypt.js";
import Etag from "@fastify/etag";
import Fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";
import generate from "@sebastienrousseau/crypto-core/src/lib/generate.js";
import helmet from "@fastify/helmet";

/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);

const PRODUCTION = process.env.NODE_ENV === "production";
const DEVELOPMENT = !PRODUCTION;
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || "localhost";

const CryptoServer = async() => {
  /* Creating a new instance of the fastify server. */
  const app = Fastify({
    connectionTimeout: 0,
    keepAliveTimeout: 5000,
    maxParamLength: 100,
    bodyLimit: 256 * 1024 * 1, // 256KB
    caseSensitive: true,
    ignoreTrailingSlash: false,
    disableRequestLogging: PRODUCTION,
    return503OnClosing: true,
    logger: {
      // level: PRODUCTION ? 'error' : 'info',
      // level: 'info',
      level: "error",
    },
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
    trustProxy: ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
  });

  // Body content-type parsing
  // https://www.fastify.io/docs/latest/ContentTypeParser/
  app.addContentTypeParser("*", function(request, payload, done) {
    // pipe-it directly, we don't care for it
    done();
  });

  // Helmet config
  // Defaults are commented out
  app.register(helmet, {
    contentSecurityPolicy: false,
    dnsPrefetchControl: false,
    expectCt: false,
    // frameguard: {
    //   action: 'sameorigin',
    // },
    hidePoweredBy: false,
    hsts:
      PRODUCTION && !argv.test ?
        {
          maxAge: 365 * 24 * 60 * 60,
          includeSubDomains: false, // * no because we have non-ssl subdomains (e.g. legacy.lwjgl.org)
          preload: false, // ! includeSubDomains must be true for preloading to be approved
        } :
        false,
    ieNoOpen: false,
    // noSniff
    permittedCrossDomainPolicies: false,
    referrerPolicy: {
      policy: "no-referrer-when-downgrade",
    },
    // xssFilter:
  });

  await app.register(import("@fastify/compress"), {
    global: true
  });
  console.log(process.argv);

  // ---------------------------------------------------------------------------
  // ROUTES
  // ---------------------------------------------------------------------------

  /* This is a route handler. It is a function that is called when a request is made
  to the server. */
  app.get("/v1/generate", async(request, reply) => {
    console.log(request.headers);
    let generateKeyPair = await generate({ ...request.headers });
    reply
      .send({ "data": generateKeyPair });
  });

  app.get("/v1/encrypt", async(request, reply) => {
    console.log(request.headers);
    let encryptedData = await encrypt({ ...request.headers });
    reply
      .send({ "data": encryptedData });
  });

  app.get("/v1/decrypt", async(request, reply) => {
    let decryptedData = await decrypt({ ...request.headers });
    reply
      .send({ "data": decryptedData });
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  // // This will never fire, since we capture all requests above
  // app.setNotFoundHandler((request, reply) => {
  //   reply.header('Cache-Control', 'public, max-age=30, s-maxage=0');
  //   reply.code(404);
  // });

  app.setErrorHandler((error, request, reply) => {
    // Log error
    app.log.error(error);

    reply.header("Cache-Control", "public, max-age=5, s-maxage=0");
    reply.code(500);

    const accept = request.accepts();
    switch (accept.type(["html", "json"])) {
      case "html":
        // HTML
        reply.view("500.pug", { error });
        break;
      case "json": {
        // JSON
        if (error instanceof Error) {
          if (DEVELOPMENT) {
            const errorResponse = {};

            Object.getOwnPropertyNames(error).forEach(key => {
              errorResponse[key] = error[key];
            });

            reply.send({ error: errorResponse });
          } else {
            // Only keep message in production because Error() may contain sensitive information
            reply.send({ error: { message: error.message } });
          }
        } else {
          reply.send({ error });
        }
        break;
      }
      default:
        // default to plain-text.
        // keep only message
        reply.type("text/plain").send(error.message);
    }
  });

  // ---------------------------------------------------------------------------
  // PLUGINS
  // ---------------------------------------------------------------------------

  app.register(Etag);
  app.register(Accepts);
  app.register(helmet, { global: true });

  app.register(fastifyHealthcheck, {
    healthcheckURL: "/health",
  });

  /* Telling the server to listen on port 3000. */
  const start = async() => {
    try {
      await app.listen(PORT, HOST);
      console.log("Server running at http://localhost:3000/");
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
