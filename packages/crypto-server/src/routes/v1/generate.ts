import * as fastify from 'fastify';
import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { IHeadersGenerate } from '../../@types/types';

export default (app: fastify.FastifyInstance) => {
  app.get<{
    Headers: IHeadersGenerate;
  }>("/v1/generate", async (request, reply) => {
    const generateKeyPair =
      await generate({
        curve: String(request.headers["curve"]),
        date: new Date(),
        email: String(request.headers["email"] ?? "jane@doe.com"),
        format: String(request.headers["format"] ?? "armored"),
        keyExpirationTime: Number(request.headers["keyExpirationTime"] ?? 0),
        name: String(request.headers["name"] ?? "Jane Doe"),
        passphrase: String(request.headers["passphrase"] ?? "123456789abcdef"),
        rsaBits: Number(request.headers["rsaBits"] ?? 2048),
        type: String(request.headers["type"] ?? "rsa"),
        userIDs: [{
          name: String(request.headers["name"] ?? "Jane Doe"),
          email: String(request.headers["email"] ?? "jane@doe.com")
        }],
      });
    // console.log(generateKeyPair);
    reply.send({ data: generateKeyPair });
  });
};
