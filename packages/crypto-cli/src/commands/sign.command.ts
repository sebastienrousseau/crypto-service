import sign from "@sebastienrousseau/crypto-lib/dist/lib/sign";
import prompts from "prompts";

const handleSign = async () => {
  const responseSign = await prompts([
    {
      type: "password",
      name: "passphrase",
      message: "Provide a passphrase",
    },
    {
      type: "text",
      name: "message",
      message: "Provide a message to encrypt",
    },
    {
      type: "confirm",
      name: "detached",
      message: "Provide true or false",
    },
    {
      type: "text",
      name: "publicKey",
      message: "Provide a public key in base64 format",
    },
  ]);

  console.log(responseSign);

  const data = {
    date: new Date(),
    passphrase: responseSign.passphrase,
    message: responseSign.message,
    detached: responseSign.detached,
    publicKey: responseSign.publicKey,
  };

  if (
    responseSign.passphrase === "" ||
    responseSign.message === "" ||
    responseSign.detached === "" ||
    responseSign.publicKey === ""
  ) {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
  } else {
    // console.log(data);
    await sign(data);
  }
};
export default handleSign;

// # sourceMappingURL=sign.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/sign.command.ts
