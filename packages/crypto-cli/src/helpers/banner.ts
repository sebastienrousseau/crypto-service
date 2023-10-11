import figlet from "figlet";
import format from "kleur";
import { constants } from "../constants/index";

export const welcome = async (data: string) => {
  if (!data || !data.length) {
    data = constants.CLI_TITLE;
  }
  console.log("\n");
  console.log(format.cyan(figlet.textSync(data)));
  console.log("\n");
  return welcome;
};
