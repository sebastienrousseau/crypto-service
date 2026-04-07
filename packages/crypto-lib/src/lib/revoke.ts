import * as openpgp from "openpgp";
import type { RevokeInput, RevokeOutput } from "../types/types";

/**
 * Revoke a key pair. Returns the armored revoked public and private keys —
 * the caller decides where (if anywhere) to persist them.
 */
export async function revoke(input: RevokeInput): Promise<RevokeOutput> {
  if (!input?.privateKey?.armored) {
    throw new Error("revoke: privateKey is required");
  }

  const armoredPriv = await openpgp.readPrivateKey({
    armoredKey: input.privateKey.armored,
  });
  const key = armoredPriv.isDecrypted()
    ? armoredPriv
    : await openpgp.decryptKey({
        privateKey: armoredPriv,
        passphrase: input.privateKey.passphrase ?? "",
      });

  // openpgp.revokeKey has multiple overloads keyed on `format`. Build the
  // options object loosely and cast — TypeScript can't pick the right
  // overload from a programmatically-built literal.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    key,
    date: new Date(),
    format: "armored",
  };
  if (input.reason) {
    const reason: { flag?: number; string?: string } = {};
    if (input.reason.flag !== undefined) reason.flag = input.reason.flag;
    if (input.reason.string !== undefined) reason.string = input.reason.string;
    options.reasonForRevocation = reason;
  }

  const result = (await openpgp.revokeKey(options)) as unknown as {
    publicKey: string;
    privateKey: string;
  };

  return {
    publicKey: result.publicKey,
    privateKey: result.privateKey,
  };
}

export default revoke;
