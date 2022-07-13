import generate from "@sebastienrousseau/crypto-lib/dist/lib/generate";
import prompts from "prompts";

const handleGenerate = async () => {
  const responseGenerate = await prompts([
    {
      type: "text",
      name: "curve",
      message: 'Curve name (e.g. "curve25519")',
    },
    {
      type: "text",
      name: "email",
      message: "Provide an email address",
    },
    {
      type: "text",
      name: "format",
      message: 'Provide a format (e.g. "armored")',
    },
    {
      type: "text",
      name: "expiration",
      message: 'Provide a key expiration time (e.g. "1y")',
    },
    {
      type: "text",
      name: "name",
      message: "Provide a first and last name",
    },
    {
      type: "password",
      name: "passphrase",
      message: "Provide a passphrase",
    },
    {
      type: "number",
      name: "rsaBits",
      message: 'Provide a number of bits for RSA keys (e.g. "2048")',
    },
    {
      type: "text",
      name: "type",
      message: 'Provide a key type (e.g. "rsa or ecc")',
    },
  ]);

  console.log(responseGenerate);

  const data = {
    date: new Date(),
    name: responseGenerate.name,
    email: responseGenerate.email,
    userIDs: [{ name: responseGenerate.name, email: responseGenerate.email }],
    type: responseGenerate.type,
    passphrase: responseGenerate.passphrase,
    rsaBits: responseGenerate.rsaBits,
    curve: responseGenerate.curve,
    keyExpirationTime: responseGenerate.expiration,
    subkeys: responseGenerate.subkeys,
    format: responseGenerate.format,
    config: responseGenerate.config,
  };
  // console.log(data);
  await generate(data);
};

export default handleGenerate;

// # sourceMappingURL=generate.command.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/generate.command.js
