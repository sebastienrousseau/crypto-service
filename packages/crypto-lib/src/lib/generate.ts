import * as openpgp from "openpgp";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);
// console.log(args);

/**
 * Generates a new OpenPGP key pair.
 * Creates a key for cryptography using the specified algorithm. The key created using this API is used for encrypting clear text and decrypting the encrypted data.
 * Supports RSA and ECC keys. Primary and subkey will be of same type.
 * @param  {Number} [data.bits] (optional) - Number of bits for RSA keys: 2048 or 4096. Defaults to 2048.
 * @param  {String} [data.curve] (optional) - Elliptic curve for ECC keys: curve25519, p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1.
 * @param  {String} data.email - (required) An email address. e.g. 'jane@doe.com'
 * @param  {Number} [data.expiration] (optional) - The number of seconds after the key creation time that the key expires. 0 means the key has no expiry date. Can be null to use the default value.
 * @param  {String} [data.format] (optional) - The Format of the output keys e.g. 'armored' | 'object' | 'binary'. Defaults to 'armored'.
 * @param  {String} data.name - (required) String consisting of a First name and Last name. e.g. ‘Jane Doe’
 * @param  {String} [data.passphrase] (optional) - A passphrase to encrypt the resulting private key. e.g. '1234567890abcdef' (min. 12 characters).
 * @param  {Boolean} [data.sign] (optional) - Whether to sign the key. e.g. true. Default: false.
 * @param  {Any} data.type - (required) The primary key algorithm type: 'ecc' | 'rsa'. Default: 'ecc'.
 * @param  {Array<Object>} [data.subkeys] (optional) - Options for each subkey. Each subkey is an object with the same options as the primary key.
 * @returns {Promise<Object>} - The generated key object.
 * @async
 * @static
 */
const generate = async (
  data:
    {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      bits: number;
      curve: any;
      email: string;
      expiration: number;
      format: any;
      name: string;
      passphrase: string;
      sign: boolean;
      type: any;
    }
): Promise<object> => {
  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      type: data.type,
      rsaBits: Number(data.bits),
      userIDs: [{ name: data.name, email: data.email }],
      passphrase: data.passphrase,
      curve: data.curve,
      keyExpirationTime: Number(data.expiration),
      subkeys: [{sign: Boolean(data.sign)}],
      format: data.format,
    });

  console.log(privateKey);  // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
  console.log(publicKey);   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  console.log(revocationCertificate); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

  return { publicKey, privateKey, revocationCertificate };
};

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  const data = {
    bits: Number(args[11]),
    curve: args[9],
    email: args[3],
    expiration: Number(args[13]),
    format: args[15],
    name: args[1],
    passphrase: args[5],
    sign: Boolean(args[15]),
    type: args[7],
  };
  generate(data);
}

/* Exporting the function `generate` so that it can be used in other files. */
export default generate;
