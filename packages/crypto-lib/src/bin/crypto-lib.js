/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);

/**
 * It's a function that takes in a data object, and if the data object has a type
 * property, it imports a module and runs it
 * @param data - This is the data that is passed to the function.
 */
const CryptoLib = async(data) => {
  if (data.type) {
    let cryptoFunction = "../lib/generate.js";
    const run = async() => {
      cryptoFunction = await import(cryptoFunction);
      cryptoFunction;
    };
    run();
  }
};
/* Calling the function with the arguments. */
CryptoLib({
  bits: args[11],
  curve: args[9],
  email: args[3],
  expiration: args[13],
  format: args[15],
  name: args[1],
  passphrase: args[5],
  sign: args[15],
  type: args[7],
});
export default CryptoLib;
