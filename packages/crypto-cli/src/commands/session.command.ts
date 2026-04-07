import prompts from "prompts";
import { session } from "@sebastienrousseau/crypto-lib";
import { readArmored } from "../utils/io.utils";

const handleSession = async (): Promise<void> => {
  const response = await prompts([
    { type: "text", name: "name", message: "Recipient name" },
    { type: "text", name: "email", message: "Recipient email" },
    {
      type: "text",
      name: "publicKeyPath",
      message: "Path to recipient's armored public key (.asc)",
    },
  ]);

  if (!response.publicKeyPath || !response.name || !response.email) {
    console.error("\n🔔 publicKeyPath, name and email are required.\n");
    return;
  }

  const sessionKey = await session({
    encryptionKey: await readArmored(response.publicKeyPath),
    name: response.name,
    email: response.email,
  });

  console.log("✅ Session key generated");
  console.log("   algorithm:", sessionKey.algorithm);
  console.log("   data (hex):", Buffer.from(sessionKey.data).toString("hex"));
};

export default handleSession;
