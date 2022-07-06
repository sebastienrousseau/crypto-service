import revoke from "@sebastienrousseau/crypto-lib";
import prompts from "prompts";

const handleRevoke = async () => {
  const responseRevoke = await prompts([
    {
      type: "password",
      name: "passphrase",
      message: "Provide a passphrase",
    },
    {
      type: "number",
      name: "flag",
      message: "Provide a flag (optional)",
    },
    {
      type: "text",
      name: "reason",
      message: "Provide a reason for revocation (optional)",
    },
  ]);
  console.log(responseRevoke);

  const data = {
    date: new Date(),
    passphrase: responseRevoke.passphrase,
    flag: responseRevoke.flag,
    reason: responseRevoke.reason,
  };

  if (responseRevoke.passphrase === "") {
    console.error(
      "\n🔔 You must provide a value for each of the properties.\n",
    );
  } else {
    // console.log(data);
    await revoke.revoke(data);
  }
};
export default handleRevoke;

// # sourceMappingURL=revoke.command.js.map
// Language: typescript
// path: packages/crypto-cli/src/commands/revoke.command.ts
