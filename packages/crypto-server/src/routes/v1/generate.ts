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
        name: String(request.headers["name"] ?? "Jane Doe"),
        email: String(request.headers["email"] ?? "jane@doe.com"),
        userIDs: [{
          name: String(request.headers["name"] ?? "Jane Doe"),
          email: String(request.headers["email"] ?? "jane@doe.com")
        }],
        type: String(request.headers["type"] ?? "rsa"),
        passphrase: String(request.headers["passphrase"] ?? "123456789abcdef"),
        rsaBits: Number(request.headers["rsaBits"] ?? 2048),
        curve: String(request.headers["curve"]),
        keyExpirationTime: Number(request.headers["keyExpirationTime"] ?? 0),
        subkeys: Number(request.headers["subkeys"]),
        format: String(request.headers["format"]),
        config: String(request.headers["config"]),
      });
    // console.log(generateKeyPair);
    reply.send({ data: generateKeyPair });
  });
};
