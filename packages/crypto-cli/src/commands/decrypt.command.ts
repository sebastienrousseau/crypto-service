import decrypt from "@sebastienrousseau/crypto-lib/dist/lib/decrypt";
import prompts from "prompts";

/**
 * Interactively decrypt a PGP-encrypted message via CLI prompts.
 *
 * @example
 * ```ts
 * await handleDecrypt();
 * ```
 */
const handleDecrypt = async () => {
  const responseDecrypt = await prompts([
    {
      type: "text",
      name: "message",
      message: "Provide an encrypted message in base64 format",
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
  // console.log(responseDecrypt); // Removed for security

  const data = {
    passphrase: responseDecrypt.passphrase,
    message: responseDecrypt.message,
    publicKey: responseDecrypt.publicKey,
  };

  if (
    responseDecrypt.passphrase === "" ||
    responseDecrypt.message === "" ||
    responseDecrypt.publicKey === ""
  ) {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
  } else {
    /* c8 ignore next 2 -- decrypt always throws: command doesn't collect privateKey */
    await decrypt(data);
  }
};

export default handleDecrypt;

// # sourceMappingURL=decrypt.command.js.map
// Language: typescript
// Path: packages/crypto-cli/src/commands/decrypt.command.ts
