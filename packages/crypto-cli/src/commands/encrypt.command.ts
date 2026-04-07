import prompts from "prompts";
import { encrypt } from "@sebastienrousseau/crypto-lib";
import { readArmored, writeArmored } from "../utils/io.utils";

const handleEncrypt = async (): Promise<void> => {
  const response = await prompts([
    { type: "text", name: "message", message: "Message to encrypt" },
    {
      type: "text",
      name: "publicKeyPath",
      message: "Path to recipient's armored public key (.asc)",
    },
    {
      type: "confirm",
      name: "alsoSign",
      message: "Also sign the message?",
      initial: false,
    },
    {
      type: (prev: boolean) => (prev ? "text" : null),
      name: "privateKeyPath",
      message: "Path to your armored private key (.asc)",
    },
    {
      type: (_prev, values) => (values.alsoSign ? "password" : null),
      name: "passphrase",
      message: "Passphrase for the private key",
    },
    {
      type: "text",
      name: "outPath",
      message: "Output path for the ciphertext",
      initial: "./encrypted.asc",
    },
  ]);

  if (!response.message || !response.publicKeyPath) {
    console.error("\n🔔 message and publicKeyPath are required.\n");
    return;
  }

  const encryptionKey = await readArmored(response.publicKeyPath);

  const encryptArgs: Parameters<typeof encrypt>[0] = {
    message: response.message,
    encryptionKey,
  };
  if (response.alsoSign) {
    encryptArgs.signingKey = {
      armored: await readArmored(response.privateKeyPath),
      passphrase: response.passphrase,
    };
  }

  const ciphertext = await encrypt(encryptArgs);

  await writeArmored(response.outPath, ciphertext);
  console.log(`✅ Ciphertext written to ${response.outPath}`);
};

export default handleEncrypt;
