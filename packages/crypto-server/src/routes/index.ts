import * as fastify from "fastify";

import generateRoute from "./v1/generate";
import encryptRoute from "./v1/encrypt";
import decryptRoute from "./v1/decrypt";
import revokeRoute from "./v1/revoke";
import verifyRoute from "./v1/verify";

export default (app: fastify.FastifyInstance) => {
  generateRoute(app);
  encryptRoute(app);
  decryptRoute(app);
  revokeRoute(app);
  verifyRoute(app);
};
