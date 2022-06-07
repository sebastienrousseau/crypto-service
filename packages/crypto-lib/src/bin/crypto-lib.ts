/* Taking the arguments from the command line and putting them into an array. */
const args = process.argv.slice(2);
// console.log(args);

/**
 * The function imports a module based on a condition
 * @param {KeyGenerationDataType} data - This is the data that is passed to the
 * function.
 */
const cryptoLib = async (data: {
  bits?: string;
  curve?: string;
  email?: string;
  expiration?: string;
  format?: string;
  name?: string;
  passphrase?: string;
  sign?: string;
  type?: string;
}) => {
  if (data.type) {
    let cryptoFunction = "../lib/generate";
    const run = async () => {
      cryptoFunction = await import(cryptoFunction);
      cryptoFunction;
    };
    run();
  }
};

/* Checking if the arguments passed to the function are an array and if the
array has a length. */
if (args instanceof Array && args.length) {
  const data = {
    bits: args[11],
    curve: args[9],
    email: args[3],
    expiration: args[13],
    format: args[15],
    name: args[1],
    passphrase: args[5],
    sign: args[15],
    type: args[7],
  };
  cryptoLib(data);
}
/* It's exporting the function cryptoLib. */
export default cryptoLib;
