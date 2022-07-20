import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { IHeadersGenerate } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersGenerate;
  }>("/v1/generate", async (request, reply) => {
    const generateKeyPair =
    await generate({
      date: new Date(),
      name: request.headers["name"],
      email: request.headers["email"],
      userIDs: [{
        name: request.headers["name"],
        email: request.headers["email"]
      }],
      type: request.headers["type"],
      passphrase: request.headers["passphrase"],
      rsaBits: Number(request.headers["rsaBits"] ?? 2048),
      curve: request.headers["curve"],
      keyExpirationTime: Number(request.headers["keyExpirationTime"] ?? 0),
      format: request.headers["format"],
    });
    reply.send({ data: generateKeyPair });
  });
};
