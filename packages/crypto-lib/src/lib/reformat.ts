import * as openpgp from "openpgp";
import type { ReformatInput, ReformatOutput } from "../types/types";

/**
 * Re-issue self-signatures on a key with a new user ID and/or expiration.
 * Returns the armored reformatted public and private keys.
 */
export async function reformat(input: ReformatInput): Promise<ReformatOutput> {
  if (!input?.privateKey?.armored || !input?.name || !input?.email) {
    throw new Error("reformat: privateKey, name and email are required");
  }

  const armoredPriv = await openpgp.readPrivateKey({
    armoredKey: input.privateKey.armored,
  });
  const privateKey = armoredPriv.isDecrypted()
    ? armoredPriv
    : await openpgp.decryptKey({
        privateKey: armoredPriv,
        passphrase: input.privateKey.passphrase ?? "",
      });

  const expiration = Math.max(Number(input.keyExpirationTime) || 0, 0);

  // openpgp.reformatKey is overloaded on `format`; build options loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    privateKey,
    userIDs: [{ name: input.name, email: input.email }],
    keyExpirationTime: expiration,
    date: new Date(),
    format: "armored",
  };
  if (input.privateKey.passphrase !== undefined) {
    options.passphrase = input.privateKey.passphrase;
  }

  const result = (await openpgp.reformatKey(options)) as unknown as {
    publicKey: string;
    privateKey: string;
  };

  return {
    publicKey: result.publicKey,
    privateKey: result.privateKey,
  };
}

export default reformat;
