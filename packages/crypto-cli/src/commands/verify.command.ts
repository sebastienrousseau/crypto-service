import verify from "@sebastienrousseau/crypto-lib/dist/lib/verify";
import prompts from "prompts";

/**
 * Interactively verify a PGP-signed message via CLI prompts.
 *
 * @example
 * ```ts
 * await handleVerify();
 * ```
 */
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
      message:
        "Provide an array of publicKeys or single key, to verify signatures in base64 format",
    },
    {
      type: "text",
      name: "date",
      message:
        "Provide an ISO Date string formatted date to verify message. If not provided, current date will be used. (YYYY-MM-DDTHH:mm:ss.sssZ)",
    },
  ]);

  // Security: Do not log user input
  // console.log(responseVerify);

  const data = {
    message: responseVerify.message,
    verificationKeys: responseVerify.verificationKeys,
    date: new Date(),
  };

  if (
    responseVerify.message === "" ||
    responseVerify.verificationKeys === "" ||
    responseVerify.date === ""
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
