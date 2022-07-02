import decrypt from '@sebastienrousseau/crypto-lib';
import prompts from 'prompts';

const handleDecrypt = async () => {
  const responseDecrypt = await prompts([
    {
      type: 'text',
      name: 'message',
      message: 'Provide an encrypted message in base64 format',
    },
    {
      type: 'password',
      name: 'passphrase',
      message: 'Provide a passphrase',
    },
    {
      type: 'text',
      name: 'publicKey',
      message: 'Provide a public key in base64 format',
    }
  ]);
  console.log(responseDecrypt);

  const data = {
    passphrase: responseDecrypt.passphrase,
    encryptedMessage: responseDecrypt.message,
    publicKey: responseDecrypt.publicKey
  };

  if ((responseDecrypt.passphrase === '' || responseDecrypt.encryptedMessage === '' || responseDecrypt.publicKey === '')) {
    console.error(`\n🔔 You must provide a value for each of the properties.\n`)
  }
  else {
    console.log(data);
    await decrypt.decrypt(data);
  }
};

export default handleDecrypt;

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/decrypt.command.ts
