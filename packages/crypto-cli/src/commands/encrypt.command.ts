import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';

const args = process.argv.slice(2);
console.log(args);

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    message: args[3],
    publicKey: args[5],
  };

  const publicKeyArmored = Buffer.from(data.publicKey.toString(), "base64").toString("utf-8");

  async function run(): Promise<void> {
    const encryptMessage = await encrypt(data);
    console.log(encryptMessage);
  }
  run();
}

