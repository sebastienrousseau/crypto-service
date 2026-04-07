import figlet from "figlet";
import format from "kleur";
import { constants } from "../constants/index";

export const welcome = (data?: string): void => {
  const title = data && data.length > 0 ? data : constants.CLI_TITLE;
  console.log("\n");
  console.log(format.cyan(figlet.textSync(title)));
  console.log("\n");
};
