import * as fastify from 'fastify';
import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';
import { IHeadersDecrypt } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersDecrypt;
  }>("/v1/decrypt", async (request, reply) => {
    const encryptedData = await decrypt({
      passphrase: request.headers["passphrase"],
      encryptedMessage: String(request.headers["message"]),
      publicKey: request.headers["publicKey"],
    });
    reply.send({ data: encryptedData });
  });
};
