import session from '@sebastienrousseau/crypto-lib/dist/lib/session';
import prompts from 'prompts';

const handleSession = async () => {
  const responseSession = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Provide an email address',
    },
    {
      type: 'text',
      name: 'name',
      message: 'Provide a first and last name',
    },
    {
      type: 'text',
      name: 'publicKey',
      message: 'Provide a public key in base64 format',
    }
  ]);
  console.log(responseSession);

  const data = {
    email: responseSession.email,
    name: responseSession.name,
    publicKey: responseSession.publicKey,
  };

  if ((
    responseSession.email === '' ||
    responseSession.name === '' ||
    responseSession.publicKey === ''
  )) {
    console.error(`\n🔔 You must provide a value for each of the properties.\n`)
  }
  else {
    console.log(data);
    await session(data);
  }
};
export default handleSession;

// # sourceMappingURL=session.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/session.command.ts

