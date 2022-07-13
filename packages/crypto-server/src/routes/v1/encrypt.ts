import * as fastify from 'fastify';
import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';
import { IHeadersEncrypt } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersEncrypt;
  }>("/v1/encrypt", async (request, reply) => {
    const encryptData =
    await encrypt({
    // [{
      passphrase: String(request.headers["passphrase"]),
      message: String(request.headers["message"]),
      publicKey: String(request.headers["public-key"]),
    // }];
    });
    reply.send({ data: encryptData });
  });
};
