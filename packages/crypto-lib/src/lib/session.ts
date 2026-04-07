import * as openpgp from "openpgp";
import type { SessionInput } from "../types/types";

/**
 * Generate a new session key for the supplied recipient public key.
 *
 * The session key honours the recipient key's stated algorithm preferences.
 */
export async function session(
  input: SessionInput,
): Promise<openpgp.SessionKey> {
  if (!input?.encryptionKey || !input?.name || !input?.email) {
    throw new Error("session: encryptionKey, name and email are required");
  }

  const encryptionKeys = await openpgp.readKey({
    armoredKey: input.encryptionKey,
  });

  return openpgp.generateSessionKey({
    encryptionKeys,
    date: new Date(),
    encryptionUserIDs: [{ name: input.name, email: input.email }],
  });
}

export default session;
