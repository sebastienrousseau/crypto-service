import * as openpgp from "openpgp";
// import { writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
let args = process.argv.slice(2);
let data = args;

/**
 * It generates a public and private key pair, and saves them to the file system
 * @param {Object} args - The arguments passed to the function.
 */
// const generatePair = async(args) => {

const generate = async (data) => {
  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      type: data.type, // The primary key algorithm type: ECC (default) or RSA
      rsaBits: Number(data.bits), // Number of bits for RSA keys (defaults to 4096 bits)
      userIDs: [{ name: data.name, email: data.email }], // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
      passphrase: data.passphrase, // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
      curve: data.curve, // Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1
      keyExpirationTime: Number(data.expiration), // Number of seconds from the key creation time after which the key expires
      // subkeys: [{sign: data.sign, passphrase: data.passphrase}], // Options for each subkey e.g. [{sign: true, passphrase: '123'}] default to main key options, except for sign parameter that defaults to false, and indicates whether the subkey should sign rather than encrypt
      format: data.format, // format of the output keys e.g. 'armored' | 'object' | 'binary';
    });
  console.log(privateKey); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
  console.log(publicKey); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
  console.log(revocationCertificate); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

  /* Writing the public and private keys to the file system. */
  // const pbkey = await writeFile(
  //   "./src/key/"+ data.type + ".pub.pgp",
  //   publicKey,
  //   function(e) {
  //     if (e) {
  //       throw e;
  //     }
  //   },
  // );
  // pbkey;
  // const prkey = await writeFile(
  //   "./src/key/"+ data.type + ".priv.pgp",
  //   privateKey,
  //   function(e) {
  //     if (e) {
  //       throw e;
  //     }
  //   },
  // );
  // prkey;
  return { publicKey, privateKey, revocationCertificate };
};

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {
  /* Taking the arguments from the command line and storing them in an array. */
  args = JSON.stringify(args);
  data = JSON.parse(args);

  data.bits = data[11];
  data.curve = data[9];
  data.email = data[3];
  data.expiration = data[13];
  data.format = data[15];
  data.name = data[1];
  data.passphrase = data[5];
  data.sign = data[17];
  data.type = data[7];

  generate(data);
}
/* Exporting the function `generate` so that it can be used in other files. */
export default generate;
