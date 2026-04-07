import prompts from "prompts";
import { generate } from "@sebastienrousseau/crypto-lib";
import { writeArmored } from "../utils/io.utils";

const handleGenerate = async (): Promise<void> => {
  const response = await prompts([
    { type: "text", name: "name", message: "Provide a first and last name" },
    { type: "text", name: "email", message: "Provide an email address" },
    {
      type: "select",
      name: "type",
      message: "Key type",
      choices: [
        { title: "ECC (curve25519)", value: "ecc" },
        { title: "RSA", value: "rsa" },
      ],
      initial: 0,
    },
    { type: "password", name: "passphrase", message: "Provide a passphrase" },
    {
      type: (prev: string) => (prev === "rsa" ? "number" : null),
      name: "rsaBits",
      message: "RSA bits (>= 2048)",
      initial: 4096,
    },
    {
      type: "number",
      name: "keyExpirationTime",
      message: "Key expiration in seconds (0 = never)",
      initial: 0,
    },
    {
      type: "text",
      name: "outDir",
      message: "Output directory for the new key files",
      initial: "./",
    },
  ]);

  if (!response.name || !response.email || !response.passphrase) {
    console.error("\n🔔 You must provide a name, email, and passphrase.\n");
    return;
  }

  const result = await generate({
    name: response.name,
    email: response.email,
    type: response.type ?? "ecc",
    passphrase: response.passphrase,
    rsaBits: response.rsaBits,
    keyExpirationTime: response.keyExpirationTime,
  });

  const stem = (response.type ?? "ecc") + "-" + Date.now();
  const outDir = response.outDir ?? "./";
  await writeArmored(`${outDir}/${stem}.pub.asc`, result.publicKey);
  await writeArmored(`${outDir}/${stem}.key.asc`, result.privateKey);
  await writeArmored(`${outDir}/${stem}.cert.asc`, result.revocationCertificate);

  console.log(`🔑 Public key  : ${outDir}/${stem}.pub.asc`);
  console.log(`🔒 Private key : ${outDir}/${stem}.key.asc`);
  console.log(`🔏 Revocation  : ${outDir}/${stem}.cert.asc`);
};

export default handleGenerate;
