/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);
console.log(args);

/**
 * The function imports a module based on a condition
 * @param {KeyGenerationDataType} data - This is the data that is passed to the
 * function.
 */

import { generate } from "../lib/generate";

const data = {
  curve: args[9],
  format: args[15],
  keyExpirationTime: Number(args[13]),
  passphrase: args[5],
  rsaBits: Number(args[11]),
  type: args[7],
  userIDs: [{ name: args[1], email: args[3] }],
  date: new Date(),
  name: args[1],
  email: args[3],
};

const CryptoLib = async () => {
  if (data.type) {
    const generateKey = await generate(data);
    generateKey;
  }
};
// /* Checking if the arguments passed to the function are an array and if the
// array has a length. */
// if (args instanceof Array && args.length) {
//   const data = {
//     curve: args[9],
//     date: new Date(),
//     email: args[3],
//     format: args[15],
//     keyExpirationTime: Number(args[13]),
//     name: args[1],
//     passphrase: args[5],
//     rsaBits: Number(args[11]),
//     type: args[7],
//     userIDs: [{ name: args[1], email: args[3] }],
//   };
//   CryptoLib();
// }
/* It's exporting the function cryptoLib. */
export default CryptoLib;
