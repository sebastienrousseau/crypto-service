// import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';

import { CommandModule } from 'yargs';
import Colors from '../utils/colors';

// const args = process.argv.slice(2);

const command = 'encrypt [options]'
const describe = 'Encrypts a message.'
const builder = (yargs: any) => {
  yargs
  .positional('options', {
    describe: 'Options for the encryption.',
    type: 'string',
    demandOption: true,
  })
}

const handler = (argv: any) => {
  const details = argv.options

  if (!(details)) {
    return Colors.printError(`\n🔔 You must provide details for encryption.\n`)
  }
}

  export default {
    command,
    describe,
    builder,
    handler,
  } as CommandModule

// const args = process.argv.slice(2);

// const data = {
//   passphrase: args[1],
//   message: args[3],
//   publicKey: args[5],
// };

// async() => {
//   const encrypted = await encrypt(data);
//   console.log(encrypted);
// }
// export default encrypt;

// // # sourceMappingURL=encrypt.command.js.map
// // typescript
