import * as fastify from 'fastify';
import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';
import { IHeadersEncrypt } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersEncrypt;
  }>("/v1/encrypt", async (request, reply) => {
    const encryptedData = await encrypt({
      passphrase: request.headers["passphrase"],
      message: request.headers["message"],
      publicKey: request.headers["publicKey"],
    });
    reply.send({ data: encryptedData });
  });
};
