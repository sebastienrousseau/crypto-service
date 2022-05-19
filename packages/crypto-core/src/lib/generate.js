import * as openpgp from "openpgp";
import { writeFile } from "fs/promises";

/* Taking the arguments from the command line and storing them in an array. */
let args = process.argv.slice(2);
console.log(args);

/**
 * It generates a public and private key pair, and saves them to the file system
 * @param {Object} args - The arguments passed to the function.
 */
// const generatePair = async(args) => {

/* Converting the array into a JSON object. */
// args = JSON.stringify(args);
const data = args;
// console.log(data);

const generate = async(data) =>
{
  // const { privateKey, publicKey } = await openpgp.generateKey({
  //   type: String(data.type), // The primary key algorithm type: ECC (default) or RSA
  //   rsaBits: Number(data.bits), // Number of bits for RSA keys (defaults to 4096 bits)
  //   userIDs: [{ name: data.name, email: data.email }], // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
  //   passphrase: String(data.passphrase), // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef

  // userIDs: [{ name: data.name, email: data.email }], // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
  // passphrase: String(data.passphrase), // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
  // type: String(data.type), // The primary key algorithm type: ECC (default) or RSA
  // curve: String(data.curve), // Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1
  // rsaBits: Number(data.bits), // Number of bits for RSA keys (defaults to 4096 bits)
  // keyExpirationTime: Number(data.expiration), // Number of seconds from the key creation time after which the key expires
  // subkeys: [{sign: data.sign, passphrase: data.passphrase}], // Options for each subkey e.g. [{sign: true, passphrase: '123'}] default to main key options, except for sign parameter that defaults to false, and indicates whether the subkey should sign rather than encrypt
  // format: String(data.format), // format of the output keys e.g. 'armored' | 'object' | 'binary';
  // });

  const { privateKey, publicKey } = await openpgp.generateKey({
    type: data.type, // The primary key algorithm type: ECC (default) or RSA
    rsaBits: Number(data.bits), // Number of bits for RSA keys (defaults to 4096 bits)
    userIDs: [{ name: data.name, email: data.email }], // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
    passphrase: data.passphrase, // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
    curve: data.curve, // Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1
    keyExpirationTime: Number(data.expiration), // Number of seconds from the key creation time after which the key expires
    // subkeys: [{sign: data.sign, passphrase: data.passphrase}], // Options for each subkey e.g. [{sign: true, passphrase: '123'}] default to main key options, except for sign parameter that defaults to false, and indicates whether the subkey should sign rather than encrypt
    format: data.format, // format of the output keys e.g. 'armored' | 'object' | 'binary';
  });
  //   console.log(data.type);
  // console.log(data.bits);
  // console.log(data.name);
  // console.log(data.email);
  // console.log(data.passphrase);

  console.log(privateKey);     // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
  console.log(publicKey);      // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

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
  return { publicKey, privateKey };
};

/* Checking if the args variable is empty or not. */
if (args instanceof Array && args.length) {

  /* Taking the arguments from the command line and storing them in an array. */
  args = JSON.stringify(args);
  let data = JSON.parse(args);

  data.name = data[1];
  data.email = data[3];
  data.passphrase = data[5];
  data.type = data[7];
  data.curve = data[9];
  data.bits = data[11];
  data.expiration = data[13];
  data.format = data[15];
  data.sign = data[17];
  // data = {
  //   type: data.type, // The primary key algorithm type: ECC (default) or RSA
  //   rsaBits: Number(data.bits), // Number of bits for RSA keys (defaults to 4096 bits)
  //   userIDs: [{ name: data.name, email: data.email }], // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
  //   passphrase: data.passphrase // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
  //   // userIDs: [{ name: data.name, email: data.email }],
  //   // passphrase: String(data.passphrase),
  //   // type: String(data.type),
  //   // curve: String(data.curve),
  //   // rsaBits: Number(data.bits),
  //   // keyExpirationTime: Number(data.expiration),
  //   // subkeys: [{sign: data.sign, passphrase: data.passphrase}],
  //   // format: String(data.format),
  // };
  console.log(data);
  generate(data);

}
/* Exporting the function `generate` so that it can be used in other files. */
export default generate;
// export default generatePair;
