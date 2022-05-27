import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { generateHeaders } from '../../types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: generateHeaders;
  }>("/v1/generate", async (request, reply) => {
    const generateKeyPair = await generate({
      type: request.headers["type"],
      bits: Number(request.headers["bits"]),
      name: request.headers["name"],
      email: request.headers["email"],
      passphrase: request.headers["passphrase"],
      curve: request.headers["curve"],
      expiration: Number(request.headers["expiration"]),
      format: request.headers["format"],
      sign: Boolean(request.headers["sign"]),
    });
    reply.send({ data: generateKeyPair });
  });
};
