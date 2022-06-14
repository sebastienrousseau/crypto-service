import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';

const args = process.argv.slice(2);

if (args instanceof Array && args.length) {
  const data = {
    passphrase: args[1],
    encryptedMessage: args[3],
    publicKey: args[5],
  };

  // const publicKeyArmored = Buffer.from(data.publicKey.toString(), "base64").toString("utf-8");

  // async function run(): Promise<void> {
  //   const decryptMessage = await decrypt(data);
  //   // console.log(decryptMessage);
  // }
  // run();
}

//# sourceMappingURL=decrypt.command.js.map
// Language: typescript
