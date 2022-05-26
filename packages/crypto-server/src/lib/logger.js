import { createLogger, format, transports } from "winston";
import { v4 as uuidv4 } from "uuid";
const correlationId = uuidv4();

const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.json(),
  ),
  transports: [
    new transports.Console({
      level: "info",
      format: format.combine(
        format.colorize(),
        format.printf(
          (info) =>
            `${correlationId} | ${info.timestamp} | ${info.level}: ${info.message}`,
        ),
      ),
    }),
  ],
});

export default logger;
