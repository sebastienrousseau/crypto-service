import figlet from "figlet";
import format from 'kleur';

export function welcome(message: string = ""): void {
  console.clear();
  console.log("\n");
  console.log(format.cyan(figlet.textSync("Crypto CLI")));
  console.log("\n");
  if (message) {
    console.log(message);
  }
}
