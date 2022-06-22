// import reformat from '@sebastienrousseau/crypto-lib/dist/lib/reformat';

import { CommandModule } from 'yargs';


// const args = process.argv.slice(2);

const command = 'reformat [options]'
const describe = 'Reformats signature packets.'
const builder = yargs => {
  yargs
  .positional('options', {
    describe: 'Options for reformatting signature packets.',
    type: 'string',
    demandOption: true,
  })
}

const handler = argv => {
  const details = argv.options

  if (!(details)) {
    return console.error(`\n🔔 You must provide details for reformatting signature packets.\n`)
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
