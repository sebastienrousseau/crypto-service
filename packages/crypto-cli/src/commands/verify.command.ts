import verify from "@sebastienrousseau/crypto-lib/dist/lib/verify";
import prompts from "prompts";

const handleVerify = async () => {
  const responseVerify = await prompts([
    {
      type: "text",
      name: "message",
      message: "Provide a message to be verified.",
    },
    {
      type: "text",
      name: "verificationKeys",
      message: "Provide an array of publicKeys or single key, to verify signatures in base64 format",
    },
    {
      type: "select",
      name: "expectSigned",
      message: "Is the message signed?",
      choices: [
        { title: "Yes", value: true },
        { title: "No", value: false },
      ],
    },
    {
      type: "select",
      name: "format",
      message: "Select how to return the data.",
      choices: [
        { title: "Utf8", value: "utf8" },
        { title: "Binary", value: "binary" },
      ],
    },
    {
      type: "text",
      name: "config",
      message: "Provide a custom configuration settings to overwrite those in config",
    },
    {
      type: "confirm",
      name: "detached",
      message: "Provide true or false",
    },
  ]);

  console.log(responseVerify);

  const data = {
    message: responseVerify.message,
    verificationKeys: responseVerify.verificationKeys,
    expectSigned: responseVerify.expectSigned,
    format: responseVerify.format,
    signature: responseVerify.signature,
    date: new Date(),
    config: responseVerify.config,
  };

  if (
    responseVerify.message === "" ||
    responseVerify.verificationKeys === "" ||
    responseVerify.expectSigned === "" ||
    responseVerify.format === "" ||
    responseVerify.signature === "" ||
    responseVerify.date === "" ||
    responseVerify.config === ""
  ) {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
  } else {
    console.log(data);
    await verify(data);
  }
};
export default handleVerify;

// # sourceMappingURL=verify.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/verify.command.ts
