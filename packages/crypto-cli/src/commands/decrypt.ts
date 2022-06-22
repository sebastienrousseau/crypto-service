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
  async () => {
    const decrypted = await decrypt(data);
    console.log(decrypted);
    return decrypted;
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
