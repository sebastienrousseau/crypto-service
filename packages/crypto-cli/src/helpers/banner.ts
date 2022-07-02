import figlet from "figlet";
import format from 'kleur';

export function welcome(): () => typeof welcome {
  console.clear();
  console.log("\n");
  console.log(format.cyan(figlet.textSync("Crypto CLI")));
  console.log("\n");
  return welcome;
}
