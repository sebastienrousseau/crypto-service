import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);

/**
 * ### sign
 *
 * @param data                  - Data to be signed.
 * @param data.message          - (required) message to be verified.
 * @param data.verificationKeys - (required) array of publicKeys or single key,
 *                                to verify signatures.
 * @param data.date             - (optional) Use the given date for verification
 *                                instead of the current time.
 * @returns {Promise<String>}   - Signed message (string if `armor` was true,
 *                                the default; Uint8Array if `armor` was false).
 *
 */

export const verify = async (data: types.dataVerify) => {
  const message = data.message;
  const publicKey = Buffer.from(
    data.verificationKeys.toString(),
    "base64",
  ).toString("utf-8");

  const verified = await openpgp.verify({
    message: await openpgp.createMessage({ text: message }),
    verificationKeys: await openpgp.readKey({
      armoredKey: publicKey,
    }),
    date: data.date,
  });
  console.log(verified);
  return verified;
};

if (args instanceof Array && args.length) {
  const data = {
    message: args[1],
    verificationKeys: args[3],
    date: new Date(args[11]),
  };
  verify(data);
}

export default verify;

// # sourceMappingURL=verify.js.map
// Language: typescript
