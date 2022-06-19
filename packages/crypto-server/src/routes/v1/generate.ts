import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { IHeadersGenerate } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersGenerate;
  }>("/v1/generate", async (request, reply) => {
    const generateKeyPair = await generate({
      curve: request.headers["curve"],
      format: request.headers["format"],
      keyExpirationTime: Number(request.headers["expiration"]),
      passphrase: request.headers["passphrase"],
      rsaBits: Number(request.headers["bits"]),
      type: request.headers["type"],
      userIDs: [{ name: request.headers["name"], email: request.headers["email"] }],
      date: new Date(),
      name: request.headers["name"],
      email: request.headers["email"],
    });
    reply.send({ data: generateKeyPair });
  });
};
