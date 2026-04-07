import prompts from "prompts";
import { reformat } from "@sebastienrousseau/crypto-lib";
import { readArmored, writeArmored } from "../utils/io.utils";

const handleReformat = async (): Promise<void> => {
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
    { type: "text", name: "name", message: "New user name" },
    { type: "text", name: "email", message: "New user email" },
    {
      type: "number",
      name: "keyExpirationTime",
      message: "New expiration in seconds (0 = never)",
      initial: 0,
    },
    {
      type: "text",
      name: "outDir",
      message: "Output directory",
      initial: "./",
    },
  ]);

  if (!response.privateKeyPath || !response.name || !response.email) {
    console.error("\n🔔 privateKeyPath, name and email are required.\n");
    return;
  }

  const result = await reformat({
    privateKey: {
      armored: await readArmored(response.privateKeyPath),
      passphrase: response.passphrase,
    },
    name: response.name,
    email: response.email,
    keyExpirationTime: response.keyExpirationTime,
  });

  const stem = `reformat-${Date.now()}`;
  await writeArmored(`${response.outDir}/${stem}.pub.asc`, result.publicKey);
  await writeArmored(`${response.outDir}/${stem}.key.asc`, result.privateKey);

  console.log(`✅ Reformatted public key  : ${response.outDir}/${stem}.pub.asc`);
  console.log(`✅ Reformatted private key : ${response.outDir}/${stem}.key.asc`);
};

export default handleReformat;
