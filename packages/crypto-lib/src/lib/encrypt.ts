import * as openpgp from "openpgp";
import type { EncryptInput } from "../types/types";

/**
 * Encrypt a message to one or more public keys, optionally signing it.
 *
 * Returns the armored ciphertext as a string. The library is pure: nothing
 * is written to disk and nothing is logged.
 */
export async function encrypt(input: EncryptInput): Promise<string> {
  if (!input?.message || !input?.encryptionKey) {
    throw new Error("encrypt: message and encryptionKey are required");
  }

  const encryptionKeys = await openpgp.readKeys({
    armoredKeys: input.encryptionKey,
  });

  const message = await openpgp.createMessage({ text: input.message });

  const options: openpgp.EncryptOptions & { format?: "armored" } = {
    message,
    encryptionKeys,
    format: "armored",
  };

  if (input.signingKey) {
    const armored = await openpgp.readPrivateKey({
      armoredKey: input.signingKey.armored,
    });
    options.signingKeys = armored.isDecrypted()
      ? armored
      : await openpgp.decryptKey({
          privateKey: armored,
          passphrase: input.signingKey.passphrase ?? "",
        });
  }

  // openpgp's overload returns `WebStream<string>` because Message is
  // stream-capable in principle, but for a non-stream input the runtime
  // value is a plain string. The cast is a static-only fix.
  return (await openpgp.encrypt(options)) as unknown as string;
}

export default encrypt;
