import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';

import { CommandModule } from 'yargs';

const args = process.argv.slice(2);

const command = 'encrypt [options]'
const describe = 'Encrypts a message.'

const data = {
  passphrase: args[2],
  message: args[4],
  publicKey: args[6],
};

const handler = () => {
  if ((data.passphrase === undefined || data.message === undefined || data.publicKey === undefined)) {
    console.error(`\n🔔 You must provide details for encryption.\n`)
    process.exit(1);
  }
  else {
    async () => {
      const encrypted = await encrypt(data);
      return encrypted;
    }
  }
}

export default {
  command,
  describe,
  handler,
} as CommandModule

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
