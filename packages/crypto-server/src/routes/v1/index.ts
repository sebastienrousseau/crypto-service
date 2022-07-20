import * as fastify from 'fastify';
import { v4 as uuidv4 } from "uuid";
import { LIB_VERSION } from '../../config/constants';
const id = uuidv4();

export default (app: fastify.FastifyInstance) => {

  app.get("/", async () => {
    return {
      id: id,
      title: "👋 Welcome to Crypto Server!",
      description: "Crypto Server is a Fastify web server that exposes easy consumable REST APIs to perform low-level cryptographic operations.",
      details: "It supports the following cryptographic operations:\n- Digital Signing,\n- Encryption and Decryption,\n- Key Generation,\n- Key Management,\n- Pseudorandom Number Generation,\n- Signature Verification.\n- Development of this server is hosted by GitHub at the following page. Source code is available to everyone under the standard MIT license.",
      license: "MIT",
      url: "https://crypto-server.com",
      version: LIB_VERSION,
    };
  });
};
