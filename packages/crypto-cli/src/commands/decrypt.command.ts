import decrypt from '@sebastienrousseau/crypto-lib/dist/lib/decrypt';

const args = process.argv.slice(2);

  const data = {
    passphrase: args[1],
    encryptedMessage: args[3],
    publicKey: args[5],
  };

  async() => {
    const decrypted = await decrypt(data);
    console.log(decrypted);
  }
  export default decrypt;

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
