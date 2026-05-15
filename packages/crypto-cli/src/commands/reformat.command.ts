import reformat from "@sebastienrousseau/crypto-lib/dist/lib/reformat";
import prompts from "prompts";

/**
 * Interactively reformat OpenPGP key signature packets via CLI prompts.
 *
 * @example
 * ```ts
 * await handleReformat();
 * ```
 */
const handleReformat = async () => {
  const responseReformat = await prompts([
    {
      type: "text",
      name: "email",
      message: "Provide an email address",
    },
    {
      type: "text",
      name: "expiration",
      message: "Provide an expiration date",
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
      type: "text",
      name: "publicKey",
      message: "Provide a public key in base64 format",
    },
  ]);
  // Security: Do not log sensitive data like passphrase
  // console.log(responseReformat);

  const data = {
    date: new Date(),
    email: responseReformat.email,
    expiration: responseReformat.expiration,
    name: responseReformat.name,
    passphrase: responseReformat.passphrase,
    publicKey: responseReformat.publicKey,
  };

  if (
    responseReformat.email === "" ||
    responseReformat.expiration === "" ||
    responseReformat.name === "" ||
    responseReformat.passphrase === "" ||
    responseReformat.publicKey === ""
  ) {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
  } else {
    // console.log(data);
    await reformat(data);
  }
};
/** Default export of the handleReformat command handler. */
export default handleReformat;

// # sourceMappingURL=reformat.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/reformat.command.ts
