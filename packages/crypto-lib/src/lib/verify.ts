import { readFileSync } from "fs";
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
 * @param data.expectSigned     - (optional) If true, verification throws if the
 *                                message is not signed with the provided
 *                                publicKeys.
 * @param data.format           - (optional) Whether to return data as a
 *                                string(Stream) or Uint8Array(Stream).
 *                                If 'utf8' (the default), also normalize
 *                                newlines.
 * @param data.signature        - (optional) Detached signature for
 *                                verification.
 * @param data.date             - (optional) Use the given date for verification
 *                                instead of the current time.
 * @param data.config           - (optional) Custom configuration settings to
 *                                overwrite those in config.
 * @returns {Promise<String>}   - Signed message (string if `armor` was true,
 *                                the default; Uint8Array if `armor` was false).
 *
 */

export const verify = async (data: types.dataVerify) => {
  const message = data.message;
  const detachedSignatureBase64 = readFileSync(
    process.cwd() + "/src/data/detached.sig",
  );
  const detachedSignature = Buffer.from(
    detachedSignatureBase64.toString(),
    "base64",
  ).toString("utf-8");
  const publicKey = Buffer.from(data.verificationKeys.toString(), "base64").toString(
    "utf-8",
  );

  const signature = await openpgp.readSignature({
    armoredSignature: String(detachedSignature), // Parse detached signature.
  });

  const verified = await openpgp.verify({
    message: await openpgp.createMessage({ text: message }),
    verificationKeys: await openpgp.readKey({
      armoredKey: publicKey,
    }),
    expectSigned: data.expectSigned,
    format: data.format,
    signature,
    date: data.date,
    config: data.config
  });
  console.log(verified);
  return verified;
};

if (args instanceof Array && args.length) {
  const data = {
    message: String(args[1]),
    verificationKeys: String(args[3]),
    expectSigned: Boolean(args[5]),
    format: args[7],
    signature: args[9],
    date: new Date(args[11]),
    config: args[13],
  };
  verify(data);
}

export default verify;

// # sourceMappingURL=verify.js.map
// Language: typescript
