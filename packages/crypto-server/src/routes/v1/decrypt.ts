import * as fastify from 'fastify';
import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';
import { IHeadersBody } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersBody;
  }>("/v1/decrypt", async (request, reply) => {
    const encryptedData = await decrypt({
      message: request.headers["message"],
      passphrase: request.headers["passphrase"],
    });
    reply.send({ data: encryptedData });
  });
};