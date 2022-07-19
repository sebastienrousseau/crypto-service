import { HOST, PORT } from "./config/constants";
import { init } from "./server";
import logger from "./lib/logger";

const main = async (): Promise<void> => {
  const server = init();
  logger.info("👋 Welcome to the Crypto Server!")
  try {
    await (await server).ready();
    await (await server)
      .listen({ port: Number(PORT), host: HOST })
      .then(() => {
        logger.info(`🚀 Server listening on http://${HOST}:${PORT}/`);
      });
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}
main()
