import * as openpgp from "openpgp";
// import { writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
const args = process.argv.slice(2);
console.log(args);

/**
 * It generates a public and private key pair, and saves them to the file system
 * @param {Object} args - The arguments passed to the function.
 */
// const generatePair = async(args) => {


const generate = async (
  data:
    {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      type: any;
      bits: number;
      name: string;
      email: string;
      passphrase: string;
      curve: any;
      expiration: number;
      format: any;
      sign: boolean;
    }
) => {
  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      // The primary key algorithm type: ECC (default) or RSA
      type: data.type,
      // Number of bits for RSA keys (defaults to 4096 bits)
      rsaBits: Number(data.bits),
      // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
      userIDs: [{ name: data.name, email: data.email }],
      // The passphrase used to encrypt the private key. e.g. 1234567890abcdef
      passphrase: data.passphrase,
      // Elliptic curve for ECC keys:
      // curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1,
      //brainpoolP384r1, or brainpoolP512r1
      curve: data.curve,
      // Number of seconds from key creation time after which the key expires
      keyExpirationTime: Number(data.expiration),
      // Options for each subkey e.g. [{sign: true, passphrase: '123'}]
      // default to main key options, except for sign parameter that defaults to
      // false, and indicates whether the subkey should sign rather than encrypt
      subkeys: [{sign: Boolean(data.sign)}],
      // Format of the output keys e.g. 'armored' | 'object' | 'binary';
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
