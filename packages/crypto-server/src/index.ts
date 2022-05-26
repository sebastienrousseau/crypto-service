import Accepts from "@fastify/accepts";
import Etag from "@fastify/etag";
import fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";
import logger from "./lib/logger";

import generate from "@sebastienrousseau/crypto-lib/dist/lib/generate";
import encrypt from "@sebastienrousseau/crypto-lib/dist/lib/encrypt";
import decrypt from "@sebastienrousseau/crypto-lib/dist/lib/decrypt";
import revoke from "@sebastienrousseau/crypto-lib/dist/lib/revoke-key";

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
  trustProxy: [
    "127.0.0.0/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
  ],
});

interface IQuerystring {
  username: string;
  password: string;
}

interface IHeaders {
  "type": string;
  "bits": number;
  "name": string;
  "email": string;
  "passphrase": string;
  "curve": string;
  "expiration": boolean;
  "format": string;
  "message": string;
}

// -----------------------------------------------------------------------------
// CLI ARGS
// -----------------------------------------------------------------------------

/* CLI arguments. */
const args = process.argv.slice(2);
const PROTOCOL = process.env.PROTOCOL || "http";
const HOST = process.env.HOST || "localhost";
const PORT = process.env.NODE_PORT || 3000;


const consoleOutput = [
  "\n → protocol: " + PROTOCOL,
  "\n → hostname: " + HOST,
  "\n → port: " + PORT,
  "\n",
];

logger.info("\n\nEnvironment details: " + consoleOutput);


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
app.get("/", async (request, reply) => {
  return { hello: "Hello Crypto Service!"};
});


app.get<{
  Querystring: IQuerystring;
  Headers: IHeaders;
}>(
  "/v1/generate",
  async (request, reply) => {
    const generateKeyPair = await generate(
      {
        type: request.headers["type"],
        bits: request.headers["bits"],
        name: request.headers["name"],
        email: request.headers["email"],
        passphrase: request.headers["passphrase"],
        curve: request.headers["curve"],
        expiration: Number(request.headers["expiration"]),
        format: request.headers["format"],
        sign: Boolean(request.headers["sign"]),
      }
    );
    reply.send({ data: generateKeyPair });
  }
);

app.get<{
  Querystring: IQuerystring;
  Headers: IHeaders;
}>(
  "/v1/encrypt",
  async (request, reply) => {
    const encryptedData = await encrypt(
      {
        message: request.headers["message"],
        passphrase: request.headers["passphrase"],
      }
    );
    reply.send({ data: encryptedData });
  }
);


app.get<{
  Querystring: IQuerystring;
  Headers: IHeaders;
}>(
  "/v1/decrypt",
  async (request, reply) => {
    const encryptedData = await decrypt(
      {
        message: request.headers["message"],
        passphrase: request.headers["passphrase"],
      }
    );
    reply.send({ data: encryptedData });
  }
);

app.get<{
  Querystring: IQuerystring;
  Headers: IHeaders;
}>(
  "/v1/revoke",
  async (request, reply) => {
    const encryptedData = await revoke(
      {
        passphrase: request.headers["passphrase"],
      }
    );
    reply.send({ data: encryptedData });
  }
);

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
        logger.info(`Server listening on http://${HOST}:${PORT}/`);
      });
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };
  start();
