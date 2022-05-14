// Initializing Variables
const args = process.argv.slice(2);

const CryptoService = async(data) => {
  if (data.type) {
    let cryptoFunction = "../lib/"+ data.type + ".js";
    const run = async() => {
      cryptoFunction = await import (cryptoFunction);
      cryptoFunction;
    };
    run();
  }
};
CryptoService({
  type: args[1],
  length: args[3],
  iteration: args[5],
  separator: args[7]
});
export default CryptoService;

