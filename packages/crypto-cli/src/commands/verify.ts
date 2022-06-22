// import verify from '@sebastienrousseau/crypto-lib/dist/lib/verify';

import { CommandModule } from 'yargs';


// const args = process.argv.slice(2);

const command = 'verify [options]'
const describe = 'Verifies signatures of cleartext signed message.'
const builder = yargs => {
  yargs
  .positional('options', {
    describe: 'Options for verifying signatures of cleartext signed message',
    type: 'string',
    demandOption: true,
  })
}

const handler = argv => {
  const details = argv.options

  if (!(details)) {
    return console.error(`\n🔔 You must provide details for verifying signatures of cleartext signed message.\n`)
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
