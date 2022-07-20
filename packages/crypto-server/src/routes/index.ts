import * as fastify from "fastify";

import decryptRoute   from "./v1/decrypt";
import encryptRoute   from "./v1/encrypt";
import generateRoute  from "./v1/generate";
import indexRoute     from "./v1/index";
import revokeRoute    from "./v1/revoke";
import verifyRoute    from "./v1/verify";

export default (app: fastify.FastifyInstance) => {
  decryptRoute(app);
  encryptRoute(app);
  generateRoute(app);
  indexRoute(app);
  revokeRoute(app);
  verifyRoute(app);
};
