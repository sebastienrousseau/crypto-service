// import session from '@sebastienrousseau/crypto-lib/dist/lib/session';

import { CommandModule } from 'yargs';
import Colors from '../utils/colors';

// const args = process.argv.slice(2);

const command = 'session [options]'
const describe = 'Generate a new session key.'
const builder = yargs => {
  yargs
  .positional('options', {
    describe: 'Options for revoking a key.',
    type: 'string',
    demandOption: true,
  })
}

const handler = argv => {
  const details = argv.options

  if (!(details)) {
    return Colors.printError(`\n🔔 You must provide details for generating a new session key.\n`)
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
