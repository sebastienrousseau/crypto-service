import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';

import { CommandModule } from 'yargs';

const args = process.argv.slice(2);

const command = 'decrypt [options]'
const describe = 'Decrypts a message.'

const data = {
  passphrase: args[2],
  encryptedMessage: args[4],
  publicKey: args[6],
};

const handler = () => {
  if ((data.passphrase === undefined || data.encryptedMessage === undefined || data.publicKey === undefined)) {
    console.error(`\n🔔 You must provide details for decryption.\n`)
    process.exit(1);
  }
  else {
    async () => {
      const decrypted = await decrypt(data);
      return decrypted;
    }
  }
}
// console.log("Args 2: " + args[2]);
// console.log("Args 4: " + args[4]);
// console.log("Args 6: " + args[6]);

export default {
  command,
  describe,
  handler,
} as CommandModule

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/decrypt.command.js
