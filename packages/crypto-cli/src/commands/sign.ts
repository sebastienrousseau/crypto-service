// import sign from '@sebastienrousseau/crypto-lib/dist/lib/sign';

import { CommandModule } from 'yargs';
import Colors from '../utils/colors';

// const args = process.argv.slice(2);

const command = 'sign [options]'
const describe = 'Signs a message.'
const builder = yargs => {
  yargs
  .positional('options', {
    describe: 'Options for signing a message.',
    type: 'string',
    demandOption: true,
  })
}

const handler = argv => {
  const details = argv.options

  if (!(details)) {
    return Colors.printError(`\n🔔 You must provide details for signing a message.\n`)
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
