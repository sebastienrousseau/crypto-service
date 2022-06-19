import generate from '@sebastienrousseau/crypto-lib/dist/lib/generate';

const args = process.argv.slice(2);

  const data = {
    curve: args[9],
    date: new Date(),
    email: args[3],
    format: args[15],
    keyExpirationTime: Number(args[13]),
    name: args[1],
    passphrase: args[5],
    rsaBits: Number(args[11]),
    sign: Boolean(args[15]),
    type: args[7],
    userIDs: [{ name: args[1], email: args[3] }],
  };

  const result = generate(data);
  console.log(result);

//# sourceMappingURL=generate.command.js.map
// Language: typescript
