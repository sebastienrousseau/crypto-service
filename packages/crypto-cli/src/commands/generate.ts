// import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';
import { CommandModule } from 'yargs';


// const args = process.argv.slice(2);

const command = 'generate [options]'
const describe = 'Generates a new OpenPGP key pair.'
const builder = yargs => {
  yargs
  .positional('options', {
    describe: 'Options for the OpenPGP key pair generation.',
    type: 'string',
    demandOption: true,
  })
}

const handler = argv => {
  const details = argv.options

  if (!(details)) {
    return console.error(`\n🔔 You must provide details for the OpenPGP key pair generation.\n`)
  }
}

  export default {
    command,
    describe,
    builder,
    handler,
  } as CommandModule

// const data = {
//   curve: args[9],
//   date: new Date(),
//   email: args[3],
//   format: args[15],
//   keyExpirationTime: Number(args[13]),
//   name: args[1],
//   passphrase: args[5],
//   rsaBits: Number(args[11]),
//   sign: Boolean(args[15]),
//   type: args[7],
//   userIDs: [{ name: args[1], email: args[3] }],
// };

// async () => {
//   const key = await generate(data);
//   console.log(key);
// }
// export default generate;

//# sourceMappingURL=generate.command.js.map
// Language: typescript
