import figlet from "figlet";
import format from "kleur";
import { constants } from "../constants/index";

/**
 * Display a styled ASCII-art welcome banner in the terminal.
 * @param data - Text to render; falls back to CLI_TITLE when empty.
 */
export const welcome = async (data: string) => {
  if (!data || !data.length) {
    data = constants.CLI_TITLE;
  }
  console.log("\n");
  console.log(format.cyan(figlet.textSync(data)));
  console.log("\n");
  return welcome;
};
