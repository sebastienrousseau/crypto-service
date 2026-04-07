import * as openpgp from "openpgp";
import type { GenerateInput, GenerateOutput } from "../types/types";

/**
 * Generate a fresh OpenPGP key pair.
 *
 * The library is pure: nothing is written to disk and nothing is logged.
 * The caller is responsible for persisting the returned key material.
 *
 * @example
 * ```ts
 * const key = await generate({
 *   name: "Jane Doe",
 *   email: "jane@doe.com",
 *   passphrase: "correct horse battery staple",
 *   type: "rsa",
 *   rsaBits: 4096,
 *   keyExpirationTime: 60 * 60 * 24 * 365,
 * });
 * ```
 */
export async function generate(input: GenerateInput): Promise<GenerateOutput> {
  if (!input?.name || !input?.email) {
    throw new Error("generate: name and email are required");
  }

  const type: "rsa" | "ecc" = input.type ?? "ecc";

  // Force a sane minimum: RFC says 2048 is the floor; cap-down bugs in the
  // previous implementation silently produced 2048-bit RSA keys.
  const rsaBits =
    type === "rsa" ? Math.max(Number(input.rsaBits) || 2048, 2048) : undefined;

  const curve = type === "ecc" ? input.curve ?? "curve25519" : undefined;

  // Negative or non-numeric expirations collapse to "never expires" (0).
  const expiration = Math.max(Number(input.keyExpirationTime) || 0, 0);

  // Build options without explicit `undefined` properties so they satisfy
  // openpgp's `exactOptionalPropertyTypes`-friendly typings.
  const options: openpgp.GenerateKeyOptions & { format?: "armored" } = {
    type,
    userIDs: [{ name: input.name, email: input.email }],
    keyExpirationTime: expiration,
    format: "armored",
    date: new Date(),
  };
  if (rsaBits !== undefined) options.rsaBits = rsaBits;
  if (curve !== undefined) options.curve = curve;
  if (input.passphrase !== undefined) options.passphrase = input.passphrase;

  const result = await openpgp.generateKey(options);

  return {
    publicKey: result.publicKey,
    privateKey: result.privateKey,
    revocationCertificate: result.revocationCertificate,
  };
}

export default generate;
