import { FastifyServerOptions } from "fastify";
import { FastifyCompressOptions } from "@fastify/compress";
import * as pack from "../../package.json";

/* Environment variables. */
export const LIB_VERSION = JSON.stringify(pack.version);
export const HOST =  process.env.HOST ?? "localhost";
export const PORT =  process.env.PORT ?? 3000;
export const PROTOCOL =  process.env.PROTOCOL ?? "http";

/* Console output. */
export const consoleOutput = [
  "\n → protocol: " + PROTOCOL,
  "\n → hostname: " + HOST,
  "\n → port: " + PORT,
  "\n → version: " + LIB_VERSION,
  "\n",
];


export const fastifyOptions: FastifyServerOptions = {
  bodyLimit: 256 * 1024 * 1, // 256KB
  caseSensitive: true,
  connectionTimeout: 0,
  disableRequestLogging: true,
  ignoreTrailingSlash: false,
  keepAliveTimeout: 5000,
  logger: true,
  maxParamLength: 100,
  onConstructorPoisoning: "error",
  onProtoPoisoning: "error",
  return503OnClosing: true,
  trustProxy: true,
};

export const compressOptions: FastifyCompressOptions = {
  global: true,
  threshold: 2048, // default 1024
  zlibOptions: {
    level: 9, // default is typically 6, max is 9, min is 0
  }
};

/* Register rate-limit plugin. */
  // set up rate limiter: maximum of five requests per minute
export const rateLimitOptions = {
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

    errorResponseBuilder(req, context) {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `${req.raw.ip} Only ${context.max} requests are allowed per ${context.after}. Try again soon.`,
        date: Date.now(),
        expiresIn: context.ttl, // milliseconds
      }
    },
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
  }

export const healthCheckOptions = {
  healthcheckUrl: "/health",
    // healthcheckUrlDisable: true,
    // healthcheckUrlAlwaysFail: true,
    // exposeUptime: true,
    // underPressureOptions: {}
    exposeUptime: true
};
