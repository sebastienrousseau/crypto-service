import program from 'commander';

import encryptCommand from "./commands/encrypt.command";
// import { DecryptCommand } from "./commands/decrypt.command";
// import { GenerateCommand } from "./commands/generate.command";

import { CliUtils } from "./utils";

const args = process.argv.slice(2);

const actions = {
  encrypt: () => encryptCommand,
};
const writeLn = CliUtils.writeLn;

  program
    .version("0.0.1")
    .description("A command line interface for encrypting and decrypting messages.")
    .name("crypto-cli")
    .option("-p, --passphrase", "passphrase")
    .option("-m, --message", "message")
    .option("-k, --publicKey", "publicKey")
    .action(async () => {
      const passphrase = program.passphrase;
      const message = program.message;
      const publicKey = program.publicKey;
      const encryptMessage = await actions.encrypt();
      encryptMessage.toString();
    })
    .parse(process.argv);


