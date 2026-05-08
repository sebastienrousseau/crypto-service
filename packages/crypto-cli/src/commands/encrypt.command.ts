import encrypt from "@sebastienrousseau/crypto-lib/dist/lib/encrypt";
import prompts from "prompts";

/**
 * Interactively encrypt a message using PGP via CLI prompts.
 *
 * @example
 * ```ts
 * await handleEncrypt();
 * ```
 */
const handleEncrypt = async () => {
  const responseEncrypt = await prompts([
    {
      type: "text",
      name: "message",
      message: "Provide a message to encrypt",
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
  // console.log(responseEncrypt); // Removed for security

  const data = {
    passphrase: responseEncrypt.passphrase,
    message: responseEncrypt.message,
    publicKey: responseEncrypt.publicKey,
  };

  if (
    responseEncrypt.passphrase === "" ||
    responseEncrypt.message === "" ||
    responseEncrypt.publicKey === ""
  ) {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
  } else {
    // console.log(data);
    await encrypt(data);
  }
};
export default handleEncrypt;

// # sourceMappingURL=encrypt.command.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/encrypt.command.ts
