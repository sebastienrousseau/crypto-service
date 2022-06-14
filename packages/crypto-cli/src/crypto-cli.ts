// import * as fs from "fs";
// import * as path from "path";
// import * as program from "commander";
// // import { Program } from "./program";

// // eslint-disable-next-line
// const packageJson = require("./package.json");

// export class Main {
//   constructor() {
//     program
//       .version(packageJson.version)
//       .description(packageJson.description)
//       .option("-i, --input <file>", "input file")
//       .option("-o, --output <file>", "output file")
//       .option("-p, --password <password>", "password")
//       .option("-e, --encrypt", "encrypt")
//       .option("-d, --decrypt", "decrypt")
//       .parse(process.argv);

//     const inputFile = program.input;
//     const outputFile = program.output;
//     const password = program.password;
//     const encrypt = program.encrypt;
//     const decrypt = program.decrypt;

//     if (encrypt && decrypt) {
//       console.error("You can only encrypt or decrypt, not both.");
//       process.exit(1);
//     }

//     if (!encrypt && !decrypt) {
//       console.error("You must specify either --encrypt or --decrypt.");
//       process.exit(1);
//     }

//     if (!inputFile) {
//       console.error("You must specify an input file.");
//       process.exit(1);
//     }

//     if (!outputFile) {
//       console.error("You must specify an output file.");
//       process.exit(1);
//     }

//     if (!password) {
//       console.error("You must specify a password.");
//       process.exit(1);
//     }

//     const inputFilePath = path.resolve(inputFile);
//     const outputFilePath = path.resolve(outputFile);

//     const inputFileExists = fs.existsSync(inputFilePath);
//     const outputFileExists = fs.existsSync(outputFilePath);

//     if (!inputFileExists) {
//       console.error(`The input file ${inputFilePath} does not exist.`);
//       process.exit(1);
//     }

//     if (outputFileExists) {
//       console.error(`The output file ${outputFilePath} already exists.`);
//       process.exit(1);
//     }
//   }

//   async run() {
//     await this.init();
//     program.parse(process.argv);
//     if (process.argv.slice(2).length === 0) {
//       program.outputHelp();
//     }
//   }

//   private async init() {
//     //
//   }
// }
//   const main = new Main();
// main.run();
