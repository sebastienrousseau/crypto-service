#!/usr/bin/env node

// import * as chalk from "chalk";
import { Command } from 'commander'
// import generate from '../commands/generate.command';
// import encrypt from '../commands/encrypt.command';
import { CliUtils } from "../utils/utils";

const writeLn = CliUtils.writeLn;

const args = process.argv.slice(2);
// let data = args;
console.log(args);


const CryptoCLI = async() => {
  const program = new Command();

  program
    .name('crypto-cli')
    .version('0.0.1', '-v, --version')
    .description("The Crypto CLI is a powerful, full featured command-line interface to perform common cryptographic operations such as key generation, data encryption, digital signing, and signature verification which are invoked from the command prompt or terminal.")
    .usage('[options]')

  program.on("--help", () => {
    writeLn("\n  Examples:");
    writeLn("");
    writeLn("    encrypt");
    writeLn("", true);
  });

  program.parse(process.argv);

  if (!program.args.length) program.help();

  if (program.args[0] === "encrypt") {
    // encrypt(data);

  } else if (program.args[0] === "generate") {
    // generate(data);
  }

}
export default CryptoCLI;

//

// program
//   .name('crypto-cli')
//   .version('0.0.1', '-v, --version')
//   .description("The Crypto CLI is a powerful, full featured command-line interface to perform common cryptographic operations such as key generation, data encryption, digital signing, and signature verification which are invoked from the command prompt or terminal.")
//   .usage('[options]')

// program.on("--help", () => {
//   writeLn("\n  Examples:");
//   writeLn("");
//   writeLn("    encrypt");
//   writeLn("", true);
// });

// program
//   .command('--generate')
//   .description('generate a new key')
//   .option('--curve <curve>', 'curve')
//   .option('--email <email>', 'email')
//   .option('--format <format>', 'format')
//   .option('--expiration <expiration>', 'expiration')
//   .option('--name <name>', 'name')
//   .option('--passphrase <passphrase>', 'passphrase')
//   .option('--bits <bits>', 'bits')
//   .option('--type <type>', 'type')
//   .action(async () => {
//     await generate({
//       date: new Date(),
//       name: args[2],
//       email: args[4],
//       passphrase: args[6],
//       type: args[8],
//       curve: args[10],
//       rsaBits: Number(args[12]),
//       keyExpirationTime: Number(args[14]),
//       format: args[16],
//       userIDs: [{ name: args[2], email: args[4] }],
//     });
//   });

//   program
//   .command('--encrypt')
//   .description('encrypt a message')
//   .option('--passphrase <passphrase>', 'passphrase')
//   .option('--message <message>', 'message')
//   .option('--publicKey <publicKey>', 'publicKey')
//   .action(async () => {
//     await encrypt({
//       passphrase: args[2],
//       message:args[4],
//       publicKey:args[6],
//     });
//   });

//   program
//   .command('--decrypt')
//   .description('encrypt a plain text password')
//   .option('--passphrase <passphrase>', 'passphrase')
//   .option('--message <message>', 'message')
//   .option('--publicKey <publicKey>', 'publicKey')
//   .action(async () => {
//     await encrypt({
//       passphrase: args[2],
//       message:args[4],
//       publicKey:args[6],
//     });
//   });

// program.parse(process.argv);

// if (!program.args.length) program.help();
// };

// if (args) {
//   let data = args;
//   data.type = args[1];
//   CryptoCLI(data);
// }

