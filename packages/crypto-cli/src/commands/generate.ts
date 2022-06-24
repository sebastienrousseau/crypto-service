import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';

import { CommandModule } from 'yargs';

const args = process.argv.slice(2);

const command = 'generate [options]'
const describe = 'Generates a new OpenPGP key pair.'

const data = {
  date: new Date(),
  name: args[2],
  email: args[4],
  userIDs: [{ name: args[2], email: args[4] }],
  passphrase: args[6],
  type: String(args[8]),
  curve: args[10],
  rsaBits: Number(args[12]),
  keyExpirationTime: Number(args[14]),
  format: args[16],
};

const handler = () => {
  if ((data.passphrase === undefined || data.type === undefined || data.userIDs === undefined)) {
    console.error(`\n🔔 You must provide details for encryption.\n`)
    process.exit(1);
  }
  else {
    async () => {
      const generated = await generate(data);
      return generated;
    }
  }
}
// console.log("Date: " + new Date().toISOString());
// console.log("name: " + args[2]);
// console.log("email: " + args[4]);
// console.log("passphrase: " + args[6]);
// console.log("type: " + String(args[8]));
// console.log("curve: " + args[10]);
// console.log("rsaBits: " + args[12]);
// console.log("keyExpirationTime: " + args[14]);
// console.log("format: " + args[16]);

export default {
  command,
  describe,
  handler,
} as CommandModule

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/decrypt.command.js

