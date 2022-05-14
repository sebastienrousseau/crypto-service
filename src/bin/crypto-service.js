// Initializing Variables
const args = process.argv.slice(2);

const CryptoService = async(data) => {
  if (data.type) {
    let cryptoFunction = "../lib/generate.js";
    const run = async() => {
      cryptoFunction = await import (cryptoFunction);
      cryptoFunction;
    };
    run();
  }
};
CryptoService({
  curve: args[1],
  email: args[3],
  expiration: args[5],
  format: args[7],
  name: args[9],
  passphrase: args[11],
  sign: args[13],
  size: args[15],
  type: args[17]
});
export default CryptoService;

