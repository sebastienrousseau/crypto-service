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
      message: request.headers["message"],
      verificationKeys: request.headers["verificationKeys"],
      expectSigned: Boolean(request.headers["expectSigned"]),
      format: request.headers["format"],
      signature: request.headers["signature"],
      date: new Date(request.headers["date"]),
      config: request.headers["config"],
    // }];
    });
    reply.send({ data: verifyData });
  });
};
