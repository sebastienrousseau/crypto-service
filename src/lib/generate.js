import * as openpgp from "openpgp";
import { writeFile } from "fs/promises";

// Initializing variables
const args = process.argv.slice(2);
console.log(args);

const generateKey = async(data) => {
  console.log(data.name);
  console.log(data.email);
  const { privateKey, publicKey } = await openpgp.generateKey({
    curve: String(data.curve), // Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1
    format: String(data.format), // format of the output keys e.g. 'armored' | 'object' | 'binary';
    keyExpirationTime: parseInt(data.expiration), // Number of seconds from the key creation time after which the key expires
    passphrase: String(data.passphrase), // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
    rsaBits: parseInt(data.size), // Number of bits for RSA keys (defaults to 4096 bits)
    subkeys: [{sign: data.sign, passphrase: String(data.passphrase)}], // Options for each subkey e.g. [{sign: true, passphrase: '123'}] default to main key options, except for sign parameter that defaults to false, and indicates whether the subkey should sign rather than encrypt
    type: String(data.type), // The primary key algorithm type: ECC (default) or RSA
    userIDs: [{ name: data.name, email: data.email }] // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
  });
  const pbkey = await writeFile("./src/key/" + data.type + ".pub.pgp", publicKey, function(e) { if (e) {throw e;} }); pbkey;
  const prkey = await writeFile("./src/key/" + data.type + ".priv.pgp", privateKey, function(e) { if (e) {throw e;} }); prkey;
};
export default generateKey;

if (args) {
  let data = args;
  data.curve = data[1];
  data.format = data[3];
  data.expiration = data[5];
  data.passphrase = data[7];
  data.size = data[9];
  data.type = data[11];
  data.name = data[13];
  data.email = data[15];
  data.sign = data[17];
}
