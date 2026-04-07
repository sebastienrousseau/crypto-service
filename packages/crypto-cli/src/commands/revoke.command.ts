import prompts from "prompts";
import { revoke } from "@sebastienrousseau/crypto-lib";
import { readArmored, writeArmored } from "../utils/io.utils";

const handleRevoke = async (): Promise<void> => {
  const response = await prompts([
    {
      type: "text",
      name: "privateKeyPath",
      message: "Path to your armored private key (.asc)",
    },
    {
      type: "password",
      name: "passphrase",
      message: "Passphrase for the private key",
    },
    {
      type: "number",
      name: "flag",
      message:
        "Reason flag (0=none, 1=superseded, 2=compromised, 3=retired, 32=user ID invalid)",
      initial: 0,
    },
    { type: "text", name: "reason", message: "Reason (free text, optional)" },
    {
      type: "text",
      name: "outDir",
      message: "Output directory for the revoked key files",
      initial: "./",
    },
  ]);

  if (!response.privateKeyPath) {
    console.error("\n🔔 privateKeyPath is required.\n");
    return;
  }

  const result = await revoke({
    privateKey: {
      armored: await readArmored(response.privateKeyPath),
      passphrase: response.passphrase,
    },
    reason: { flag: response.flag, string: response.reason },
  });

  const stem = `revoked-${Date.now()}`;
  await writeArmored(`${response.outDir}/${stem}.pub.asc`, result.publicKey);
  await writeArmored(`${response.outDir}/${stem}.key.asc`, result.privateKey);

  console.log(`✅ Revoked public key  : ${response.outDir}/${stem}.pub.asc`);
  console.log(`✅ Revoked private key : ${response.outDir}/${stem}.key.asc`);
};

export default handleRevoke;
