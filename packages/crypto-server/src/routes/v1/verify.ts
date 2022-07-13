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
      verificationKeys: String(request.headers["verification-keys"]),
      expectSigned: Boolean(request.headers["expectSigned"]),
      format: String(request.headers["format"]),
      signature: String(request.headers["signature"]),
      date: new Date(request.headers["date"]),
      config: String(request.headers["config"]),
    // }];
    });
    reply.send({ data: verifyData });
  });
};
