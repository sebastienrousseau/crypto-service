import * as openpgp from "openpgp";
import type { VerifyInput, VerifyOutput } from "../types/types";

/**
 * Verify a cleartext-signed message or a (plaintext, detached signature) pair.
 *
 * - Throws if no signature is present (a missing signature is not "valid").
 * - Throws if any signature fails to verify.
 * - Returns `{ valid: true, signedBy }` for the first verifying key only on
 *   success.
 */
export async function verify(input: VerifyInput): Promise<VerifyOutput> {
  if (!input?.message || !input?.verificationKey) {
    throw new Error("verify: message and verificationKey are required");
  }

  const verificationKeys = await openpgp.readKeys({
    armoredKeys: input.verificationKey,
  });
  const date = input.date ?? new Date();

  // openpgp.verify has overloads keyed on the message type, so we split
  // the call site rather than passing a union.
  let result: openpgp.VerifyMessageResult<openpgp.MaybeStream<string>>;
  if (input.signature) {
    const message = await openpgp.createMessage({ text: input.message });
    const signature = await openpgp.readSignature({
      armoredSignature: input.signature,
    });
    result = await openpgp.verify({
      message,
      signature,
      verificationKeys,
      date,
    });
  } else {
    const message = await openpgp.readCleartextMessage({
      cleartextMessage: input.message,
    });
    result = await openpgp.verify({
      message,
      verificationKeys,
      date,
    });
  }

  if (!result.signatures || result.signatures.length === 0) {
    throw new Error("verify: no signature found");
  }

  // openpgp.verify NEVER throws for an invalid signature — you must await
  // each `.verified` promise. The previous implementation skipped this and
  // silently reported "verified" for any input string.
  for (const sig of result.signatures) {
    await sig.verified;
  }

  return { valid: true, signedBy: result.signatures[0].keyID.toHex() };
}

export default verify;
