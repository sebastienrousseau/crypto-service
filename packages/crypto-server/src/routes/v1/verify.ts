import * as fastify from 'fastify';
import verify from '@sebastienrousseau/crypto-lib/dist/lib/verify';
import { IHeadersVerify } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersVerify;
  }>("/v1/verify", async (request, reply) => {
    const verifyData =
    await verify({
    // [{
      message: String(request.headers["message"]),
      publicKey: String(request.headers["public-key"]),
    // }];
    });
    reply.send({ data: verifyData });
  });
};
