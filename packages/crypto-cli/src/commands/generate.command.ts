import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';

const args = process.argv.slice(2);
//console.log(args);

if (args instanceof Array && args.length) {
  const data = {
    bits: Number(args[11]),
    curve: args[9],
    email: args[3],
    expiration: Number(args[13]),
    format: args[15],
    name: args[1],
    passphrase: args[5],
    sign: Boolean(args[15]),
    type: args[7],
  };

  async function run() {
    const generateKey = await generate(data);
    console.log(generateKey);
  }
  run();
}

