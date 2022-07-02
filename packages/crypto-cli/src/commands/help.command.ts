import prompts from 'prompts';

const handleHelp = async () => {
  const responseHelp = await prompts([
    {
      type: 'select',
      name: 'Selection',
      message: 'Let us help you on the Crypto Command Line Interface (CLI). Please select a command to learn more about.\n',
      choices: [
        {
          title: 'Decrypt',
          description: '🔍 Select this option to get help on the decrypt command.',
          value: '1'
        },
        { title: 'Encrypt',
          description: '🔍 Select this option to get help on the encrypt command.',
          value: '2'
        },
        { title: 'Generate',
          description: '🔍 Select this option to get help on the generate command.',
          value: '3'
        },
        { title: 'Reformat',
          description: '🔍 Select this option to get help on the reformat command.',
          value: '4'
        },
        { title: 'Revoke',
          description: '🔍 Select this option to get help on the revoke command.',
          value: '5'
        },
        { title: 'Session',
          description: '🔍 Select this option to get help on the session command.',
          value: '6'
        },
        { title: 'Sign',
          description: '🔍 Select this option to get help on the sign command.',
          value: '7'
        },
        { title: 'Verify',
          description: '🔍 Select this option to get help on the verify command.',
          value: '8'
        }
      ],
    },
  ]);

  switch (responseHelp.Selection) {
    case '1': {
      console.log('Decrypting a message...');
      break;
    }
    case '2': {
      console.log('Encrypting a message...');
      break;
    }
    case '3': {
      console.log('Generating a key pair...');
      break;
    }
    case '4': {
      console.log('Reformatting a key...');
      break;
    }
    case '5': {
      console.log('Revoking a key...');
      break;
    }
    case '6': {
      console.log('Creating a session...');
      break;
    }
    case '7': {
      console.log('Signing a message...');
      break;
    }
    case '8': {
      console.log('Verifying a message...');
      break;
    }
    default: {
      console.log('Invalid option selected.');
      break;
    }
  }
};
export default handleHelp;

// # sourceMappingURL=verify.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/verify.command.ts
