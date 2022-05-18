/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);

/**
 * It's a function that takes in a data object, and if the data object has a type
 * property, it imports a module and runs it
 * @param data - This is the data that is passed to the function.
 */
const CryptoCore = async(data) => {
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
CryptoCore({
  curve: args[1],
  email: args[3],
  expiration: args[5],
  format: args[7],
  name: args[9],
  passphrase: args[11],
  sign: args[13],
  size: args[15],
  type: args[17],
});
export default CryptoCore;
