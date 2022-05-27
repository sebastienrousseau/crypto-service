import * as fastify from 'fastify';
import revoke from '@sebastienrousseau/crypto-lib/dist/lib/revoke';
import { encryptionHeaders } from '../../types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: encryptionHeaders;
  }>("/v1/revoke", async (request, reply) => {
    const encryptedData = await revoke({
      passphrase: request.headers["passphrase"],
    });
    reply.send({ data: encryptedData });
  });
};
