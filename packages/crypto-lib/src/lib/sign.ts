import * as openpgp from "openpgp";
import type { SignInput } from "../types/types";

/**
 * Sign a message with the caller's private key.
 *
 * When `detached` is true, returns an armored detached signature.
 * Otherwise returns an armored cleartext-signed message.
 */
export async function sign(input: SignInput): Promise<string> {
  if (!input?.message || !input?.signingKey) {
    throw new Error("sign: message and signingKey are required");
  }

  const armoredPriv = await openpgp.readPrivateKey({
    armoredKey: input.signingKey.armored,
  });
  const signingKeys = armoredPriv.isDecrypted()
    ? armoredPriv
    : await openpgp.decryptKey({
        privateKey: armoredPriv,
        passphrase: input.signingKey.passphrase ?? "",
      });

  if (input.detached === true) {
    // Detached signatures bind to a regular Message, not a CleartextMessage.
    const message = await openpgp.createMessage({ text: input.message });
    return (await openpgp.sign({
      message,
      signingKeys,
      detached: true,
      format: "armored",
    })) as unknown as string;
  }

  const message = await openpgp.createCleartextMessage({ text: input.message });
  return (await openpgp.sign({
    message,
    signingKeys,
    format: "armored",
  })) as unknown as string;
}

export default sign;
