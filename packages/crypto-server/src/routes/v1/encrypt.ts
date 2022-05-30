import * as fastify from 'fastify';
import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';
import { IHeadersBody } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersBody;
  }>("/v1/encrypt", async (request, reply) => {
    const encryptedData = await encrypt({
      message: request.headers["message"],
      passphrase: request.headers["passphrase"],
    });
    reply.send({ data: encryptedData });
  });
};
