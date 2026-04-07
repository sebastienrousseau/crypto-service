import * as openpgp from "openpgp";
import type { DecryptInput, DecryptOutput } from "../types/types";

/**
 * Decrypt an armored OpenPGP message with the caller's private key.
 *
 * If `verificationKey` is provided, embedded signatures are verified and
 * surfaced in the response. An invalid signature throws.
 */
export async function decrypt(input: DecryptInput): Promise<DecryptOutput> {
  if (!input?.encryptedMessage || !input?.decryptionKey) {
    throw new Error("decrypt: encryptedMessage and decryptionKey are required");
  }

  const message = await openpgp.readMessage({
    armoredMessage: input.encryptedMessage,
  });

  const armoredPriv = await openpgp.readPrivateKey({
    armoredKey: input.decryptionKey.armored,
  });
  const decryptionKeys = armoredPriv.isDecrypted()
    ? armoredPriv
    : await openpgp.decryptKey({
        privateKey: armoredPriv,
        passphrase: input.decryptionKey.passphrase ?? "",
      });

  const options: openpgp.DecryptOptions = {
    message,
    decryptionKeys,
  };
  if (input.verificationKey) {
    options.verificationKeys = await openpgp.readKeys({
      armoredKeys: input.verificationKey,
    });
  }

  const result = await openpgp.decrypt(options);

  // Drain the data to a UTF-8 string. For non-stream messages this is a
  // synchronous identity in practice but typed as a stream.
  const data =
    typeof result.data === "string"
      ? result.data
      : await new Response(result.data as ReadableStream).text();

  const signatures: DecryptOutput["signatures"] = [];
  for (const sig of result.signatures) {
    // openpgp returns one signature record per verification key. Awaiting
    // `.verified` throws on failure — surface that to the caller.
    await sig.verified;
    signatures.push({ keyID: sig.keyID.toHex(), valid: true });
  }

  return { data, signatures };
}

export default decrypt;
