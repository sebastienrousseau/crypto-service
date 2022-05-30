import * as fastify from 'fastify';
import revoke from '@sebastienrousseau/crypto-lib/dist/lib/revoke';
import { IHeadersBody } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersBody;
  }>("/v1/revoke", async (request, reply) => {
    const encryptedData = await revoke({
      passphrase: request.headers["passphrase"],
    });
    reply.send({ data: encryptedData });
  });
};
