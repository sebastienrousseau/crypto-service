import { readFileSync } from "fs";
import * as openpgp from "openpgp";
import * as types from "../types/types";

const args = process.argv.slice(2);

/**
 * ### sign
 *
 * @param data                - Data to be signed.
 * @param data.message        - Message to be signed.
 * @param data.publicKey      - Public key enumeration base64 encoded.
 * @param data.detached       - If the return value should contain a detached
 *                              signature.
 *
 * @returns {Promise<String>} - Signed message (string if `armor` was true, the
 *                              default; Uint8Array if `armor` was false).
 */

export const verify = async (data: types.dataVerify) => {
  const message = data.message;
  const detachedSignatureBase64 = readFileSync(process.cwd() + "/src/data/detached.sig");
  const detachedSignature = Buffer.from(detachedSignatureBase64.toString(), "base64").toString("utf-8");
  const publicKey = Buffer.from(data.publicKey.toString(), "base64").toString("utf-8");

  const signature = await openpgp.readSignature({
    armoredSignature: String(detachedSignature), // Parse detached signature.
  });

  const verified = await openpgp.verify({
    message: await openpgp.createMessage({ text: message }),
    signature,
    verificationKeys: await openpgp.readKey(
      {
        armoredKey: publicKey,
      }
    ),
  });
  console.log(verified);
  return verified;
};

if (args instanceof Array && args.length) {
  const data = {
    message: args[1],
    publicKey: args[3],
  };
  verify(data);
}

export default verify;

// # sourceMappingURL=verify.js.map
// Language: typescript
