#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Commands } from './commands/index'

// const args = process.argv.slice(2);
// console.log(args);

const argv_all = yargs(hideBin(process.argv));

const argv = argv_all
  .usage('🔐 Crypto Command Line Interface (CLI)\n')
  .usage('The Crypto Lib Command Line Interface (CLI) is a unified tool to perform common cryptographic operations such as key generation, data encryption, digital signing, and signature verification which are invoked from the command prompt or terminal.\n')
  .usage('Usage: $0 <command> [options]')
  .command(Commands.handleGenerate)
  .command(Commands.handleEncrypt)
  .command(Commands.handleDecrypt)
  .command(Commands.handleReformat)
  .command(Commands.handleRevoke)
  .command(Commands.handleSession)
  .command(Commands.handleSign)
  .command(Commands.handleVerify)
  .demandCommand(1, '❗ You need at least one command before moving on')
  .help('help').alias('help', 'h')
  .version('version', '0.0.1').alias('version', 'v')
  .epilogue('🔎 For more information, find the documentation at https://cryptocli.io')
  .argv;

  export { argv };

// # sourceMappingURL=index.js.map
// Language: typescript
