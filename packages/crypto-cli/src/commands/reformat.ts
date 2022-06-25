import reformat from '@sebastienrousseau/crypto-lib/dist/lib/reformat';

import { CommandModule } from 'yargs';

const args = process.argv.slice(2);

const command = 'reformat [options]'
const describe = 'Reformats signature packets.'

const data = {
  date: new Date(),
  email: args[2],
  expiration: Number(args[4]),
  name: args[6],
  passphrase: args[8],
  publicKey: args[10],
};

const handler = () => {
  if ((
    data.email ||
    data.expiration ||
    data.name ||
    data.passphrase ||
    data.publicKey) === undefined) {
    console.error(`\n🔔 You must provide details for reformatting.\n`)
    process.exit(1);
  }
  else {
    async () => {
      const reformatted = await reformat(data);
      return reformatted;
    }
  }
}

export default {
  command,
  describe,
  handler,
} as CommandModule


// # sourceMappingURL=reformat.js.map
// typescript
// path: packages/crypto-cli/src/commands/reformat.ts
