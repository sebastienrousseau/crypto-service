import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';

import { CommandModule } from 'yargs';

const args = process.argv.slice(2);

const command = 'generate [options]'
const describe = 'Generates a new OpenPGP key pair.'

const data = {
  date: new Date(),
  type: args[8],
  rsaBits: Number(args[12]),
  userIDs: [{ name: args[2], email: args[4] }],
  name: args[2],
  email: args[4],
  passphrase: args[6],
  curve: args[10],
  keyExpirationTime: Number(args[14]),
  format: args[16],
};

const handler = () => {
  if
    ((
      data.name === undefined ||
      data.email === undefined ||
      data.passphrase === undefined ||
      data.type === undefined ||
      data.keyExpirationTime === undefined ||
      data.format === undefined
    )) {
    console.error(`\n🔔 The required input was not given.\n`)
    process.exit(1);
  } else {
    async () => {
      const generated = await generate(data);
      return generated;
    };
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
