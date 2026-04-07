import prompts from "prompts";
import { sign } from "@sebastienrousseau/crypto-lib";
import { readArmored, writeArmored } from "../utils/io.utils";

const handleSign = async (): Promise<void> => {
  const response = await prompts([
    { type: "text", name: "message", message: "Message to sign" },
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
      type: "confirm",
      name: "detached",
      message: "Detached signature?",
      initial: false,
    },
    {
      type: "text",
      name: "outPath",
      message: "Output path",
      initial: "./signed.asc",
    },
  ]);

  if (!response.message || !response.privateKeyPath) {
    console.error("\n🔔 message and privateKeyPath are required.\n");
    return;
  }

  const result = await sign({
    message: response.message,
    signingKey: {
      armored: await readArmored(response.privateKeyPath),
      passphrase: response.passphrase,
    },
    detached: response.detached,
  });

  await writeArmored(response.outPath, result);
  console.log(`✅ ${response.detached ? "Detached signature" : "Signed message"} written to ${response.outPath}`);
};

export default handleSign;
