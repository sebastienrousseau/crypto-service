/**
 * Example: Using the Crypto SDK client.
 *
 * Run: npx tsx examples/sdk-usage.ts
 * (Requires the server running on localhost:3000)
 */

import { CryptoClient } from "../packages/crypto-sdk/src";

async function main() {
  const client = new CryptoClient({ baseUrl: "http://localhost:3000" });

  // List algorithms
  const algos = await client.algorithms();
  console.log("Supported algorithms:", algos.data);

  // Hash
  const hashResult = await client.hash({ algorithm: "blake3", data: "Hello!" });
  console.log("BLAKE3 hash:", hashResult.data.digest);

  // Encrypt / Decrypt
  const key = "a".repeat(64);
  const encrypted = await client.encrypt({ key, plaintext: "Secret message" });
  console.log("Encrypted:", encrypted.data.ciphertext.slice(0, 40) + "...");

  const decrypted = await client.decrypt({ key, ciphertext: encrypted.data.ciphertext });
  console.log("Decrypted:", decrypted.data.plaintext);

  // Sign / Verify
  const keyPair = await client.generateKeyPair();
  console.log("Ed25519 public key:", keyPair.data.publicKey);

  const signed = await client.sign({
    privateKey: keyPair.data.privateKey,
    message: "Important document",
  });
  console.log("Signature:", signed.data.signature.slice(0, 40) + "...");

  const verified = await client.verify({
    publicKey: keyPair.data.publicKey,
    message: "Important document",
    signature: signed.data.signature,
  });
  console.log("Valid:", verified.data.valid);

  // Post-quantum hybrid key exchange
  const recipientKeys = await client.pqGenerateKeyPair();
  const encapsulated = await client.pqEncapsulate({
    x25519PublicKey: recipientKeys.data.x25519PublicKey,
    mlKemPublicKey: recipientKeys.data.mlKemPublicKey,
  });
  const decapsulated = await client.pqDecapsulate({
    x25519PrivateKey: recipientKeys.data.x25519PrivateKey,
    mlKemSecretKey: recipientKeys.data.mlKemSecretKey,
    x25519EphemeralPublic: encapsulated.data.x25519EphemeralPublic,
    mlKemCiphertext: encapsulated.data.mlKemCiphertext,
  });
  console.log("PQ shared secrets match:", encapsulated.data.sharedSecret === decapsulated.data.sharedSecret);
}

main().catch(console.error);
