// import revoke from '@sebastienrousseau/crypto-lib/dist/lib/revoke';

import { CommandModule } from 'yargs';
import Colors from '../utils/colors';

// const args = process.argv.slice(2);

const command = 'revoke [options]'
const describe = 'Revokes a key.'
const builder = (yargs: any) => {
  yargs
  .positional('options', {
    describe: 'Options for revoking a key.',
    type: 'string',
    demandOption: true,
  })
}

const handler = (argv: any) => {
  const details = argv.options

  if (!(details)) {
    return Colors.printError(`\n🔔 You must provide details for revoking a key.\n`)
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
