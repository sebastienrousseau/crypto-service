import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';

const args = process.argv.slice(2);

const data = {
  passphrase: args[1],
  message: args[3],
  publicKey: args[5],
};

async() => {
  const encrypted = await encrypt(data);
  console.log(encrypted);
}
export default encrypt;

// # sourceMappingURL=encrypt.command.js.map
// typescript
