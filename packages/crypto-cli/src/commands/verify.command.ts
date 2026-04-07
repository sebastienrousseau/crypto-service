import prompts from "prompts";
import { verify } from "@sebastienrousseau/crypto-lib";
import { readArmored } from "../utils/io.utils";

const handleVerify = async (): Promise<void> => {
  const response = await prompts([
    {
      type: "text",
      name: "messagePath",
      message:
        "Path to the cleartext-signed message OR the plaintext (when using a detached signature)",
    },
    {
      type: "text",
      name: "verifyKeyPath",
      message: "Path to the signer's armored public key (.asc)",
    },
    {
      type: "text",
      name: "signaturePath",
      message: "(optional) path to a detached signature",
      initial: "",
    },
  ]);

  if (!response.messagePath || !response.verifyKeyPath) {
    console.error("\n🔔 messagePath and verifyKeyPath are required.\n");
    return;
  }

  try {
    const verifyArgs: Parameters<typeof verify>[0] = {
      message: await readArmored(response.messagePath),
      verificationKey: await readArmored(response.verifyKeyPath),
    };
    if (response.signaturePath) {
      verifyArgs.signature = await readArmored(response.signaturePath);
    }
    const result = await verify(verifyArgs);
    console.log(`✅ Signature valid (signed by ${result.signedBy})`);
  } catch (err) {
    console.error(
      `❌ Signature INVALID: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  }
};

export default handleVerify;
