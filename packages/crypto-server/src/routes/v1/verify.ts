import {
  rateLimitOptions,
} from "../../config/constants";
import * as fastify from 'fastify';
import verify from '@sebastienrousseau/crypto-lib/dist/lib/verify';
import fastifyRateLimit from "@fastify/rate-limit";
import { IHeadersVerify } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.register(fastifyRateLimit, rateLimitOptions); // fastify-rate-limit plugin
  app.get<{
    Headers: IHeadersVerify;
  }>("/v1/verify", async (request, reply) => {
    const verifyData =
    await verify({
    // [{
      date: new Date(request.headers["date"]),
      message: request.headers["message"],
      verificationKeys: request.headers["verification-keys"],
    // }];
    });
    reply.send({ data: verifyData });
  });
};
