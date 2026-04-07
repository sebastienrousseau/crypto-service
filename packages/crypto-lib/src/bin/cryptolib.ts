/**
 * Public API surface for `@sebastienrousseau/crypto-lib`.
 *
 * Re-exports the pure functions from `../lib/*` so callers can do
 *   `import CryptoLib from "@sebastienrousseau/crypto-lib"`
 * or
 *   `import { encrypt } from "@sebastienrousseau/crypto-lib"`.
 */

import { decrypt } from "../lib/decrypt";
import { encrypt } from "../lib/encrypt";
import { generate } from "../lib/generate";
import { reformat } from "../lib/reformat";
import { revoke } from "../lib/revoke";
import { session } from "../lib/session";
import { sign } from "../lib/sign";
import { verify } from "../lib/verify";

export { decrypt, encrypt, generate, reformat, revoke, session, sign, verify };

export type {
  ArmoredPrivateKey,
  DecryptInput,
  DecryptOutput,
  EncryptInput,
  GenerateInput,
  GenerateOutput,
  ReformatInput,
  ReformatOutput,
  RevokeInput,
  RevokeOutput,
  SessionInput,
  SignInput,
  VerifyInput,
  VerifyOutput,
} from "../types/types";

const CryptoLib = {
  decrypt,
  encrypt,
  generate,
  reformat,
  revoke,
  session,
  sign,
  verify,
};

export default CryptoLib;
