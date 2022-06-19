import * as fastify from 'fastify';
import revoke from '@sebastienrousseau/crypto-lib/dist/lib/revoke';
import { IHeadersRevoke } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersRevoke;
  }>("/v1/revoke", async (request, reply) => {
    const encryptedData = await revoke({
      passphrase: request.headers["passphrase"],
      flag: request.headers["flag"],
      reason: request.headers["reason"],
    });
    reply.send({ data: encryptedData });
  });
};
