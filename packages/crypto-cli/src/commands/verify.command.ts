import verify from '@sebastienrousseau/crypto-lib/dist/lib/verify';
import prompts from 'prompts';

const handleVerify = async () => {
  const responseVerify = await prompts([
    {
      type: 'text',
      name: 'message',
      message: 'Provide a message to encrypt',
    },
    {
      type: 'boolean',
      name: 'detached',
      message: 'Provide true or false',
    },
    {
      type: 'text',
      name: 'publicKey',
      message: 'Provide a public key in base64 format',
    }
  ]);


  console.log(responseVerify);

  const data = {
    message: responseVerify.message,
    detached: responseVerify.detached,
    publicKey: responseVerify.publicKey,
  };

  if ((
    responseVerify.message === '' ||
    responseVerify.detached === '' ||
    responseVerify.publicKey === ''
  )) {
    console.error(`\n🔔 You must provide a value for each of the properties.\n`)
  }
  else {
    console.log(data);
    await verify(data);
  }
};
export default handleVerify;

// # sourceMappingURL=verify.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/verify.command.ts
