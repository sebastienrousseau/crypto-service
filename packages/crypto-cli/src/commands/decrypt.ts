// import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';

import { CommandModule } from 'yargs';
import Colors from '../utils/colors';

// const args = process.argv.slice(2);

const command = 'decrypt [options]'
const describe = 'Decrypts a message.'

const builder = (yargs: any) => {
  yargs
  .positional('options', {
    describe: 'Options for the decryption.',
    type: 'string',
    demandOption: true,
  })
}

const handler = (argv: any) => {
  const details = argv.options

  if (!(details)) {
    return Colors.printError(`\n🔔 You must provide details for decryption.\n`)
  }
}

  export default {
    command,
    describe,
    builder,
    handler,
  } as CommandModule

// const args = process.argv.slice(2);

//   const data = {
//     passphrase: args[1],
//     encryptedMessage: args[3],
//     publicKey: args[5],
//   };

//   async() => {
//     const decrypted = await decrypt(data);
//     console.log(decrypted);
//   }
//   export default decrypt;

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
