import figlet from "figlet";
import format from "kleur";

export const welcome = async () => {
  console.clear();
  console.log("\n");
  console.log(format.cyan(figlet.textSync("Crypto CLI")));
  console.log("\n");
  return welcome;
};
