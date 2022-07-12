import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { IHeadersGenerate } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersGenerate;
  }>("/v1/generate", async (request, reply) => {
    const generateKeyPair = await generate({
      curve: request.headers["curve"],
      date: new Date(),
      email: String(request.headers["email"]),
      format: request.headers["format"],
      keyExpirationTime: Number(request.headers["keyExpirationTime"]),
      name: request.headers["name"],
      passphrase: request.headers["passphrase"],
      rsaBits: Number(request.headers["rsaBits"]),
      type: request.headers["type"],
      userIDs: [{ name: String(request.headers["name"]), email: String(request.headers["email"]) }],
    });
    reply.send({ data: generateKeyPair });
  });
};
