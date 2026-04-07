import prompts from "prompts";
import { decrypt } from "@sebastienrousseau/crypto-lib";
import { readArmored, writeArmored } from "../utils/io.utils";

const handleDecrypt = async (): Promise<void> => {
  const response = await prompts([
    {
      type: "text",
      name: "messagePath",
      message: "Path to the armored encrypted message",
    },
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
      type: "text",
      name: "verifyKeyPath",
      message:
        "(optional) path to a sender public key to verify embedded signatures",
      initial: "",
    },
    {
      type: "text",
      name: "outPath",
      message: "Output path for the plaintext",
      initial: "./decrypted.txt",
    },
  ]);

  if (!response.messagePath || !response.privateKeyPath) {
    console.error("\n🔔 messagePath and privateKeyPath are required.\n");
    return;
  }

  const encryptedMessage = await readArmored(response.messagePath);
  const decryptionKey = {
    armored: await readArmored(response.privateKeyPath),
    passphrase: response.passphrase,
  };

  const decryptArgs: Parameters<typeof decrypt>[0] = {
    encryptedMessage,
    decryptionKey,
  };
  if (response.verifyKeyPath) {
    decryptArgs.verificationKey = await readArmored(response.verifyKeyPath);
  }

  const result = await decrypt(decryptArgs);

  await writeArmored(response.outPath, result.data);
  console.log(`✅ Plaintext written to ${response.outPath}`);
  if (result.signatures.length > 0) {
    for (const sig of result.signatures) {
      console.log(`✔️  Signature verified by key ${sig.keyID}`);
    }
  }
};

export default handleDecrypt;
