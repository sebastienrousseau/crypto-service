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
  if (
    (
      data.passphrase ||
      data.encryptedMessage ||
      data.publicKey)  === undefined
    ) {
      console.error(`\n🔔 You must provide details for decryption.\n`)
      process.exit(1);
    }
    else {
      (async () => {
        const decrypted = await decrypt(data);
        return decrypted;
      })();
    }
}

export default {
  command,
  describe,
  handler,
} as CommandModule

// # sourceMappingURL=decrypt.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/decrypt.ts
