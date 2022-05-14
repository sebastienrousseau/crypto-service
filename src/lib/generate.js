import * as openpgp from "openpgp";
import { writeFile } from "fs/promises";

// Initializing Variables
const args = process.argv.slice(2);
console.log(args);

const generateKey = async(data) => {
  console.log(data.name);
  console.log(data.email);
  const { privateKey, publicKey } = await openpgp.generateKey({
    // config: , // Custom configuration settings to overwrite those in config;
    // subkeys: , // Options for each subkey e.g. [{sign: true, passphrase: '123'}] default to main key options, except for sign parameter that defaults to false, and indicates whether the subkey should sign rather than encrypt
    curve: String(data.curve), // Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1
    // date: new Date().toISOString(), // Override the creation date of the key and the key signatures;
    format: "armored", // format of the output keys e.g. 'armored' | 'object' | 'binary';
    keyExpirationTime: 0, // Number of seconds from the key creation time after which the key expires
    passphrase: "1234567890abcdef", // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
    rsaBits: parseInt(data.size), // Number of bits for RSA keys (defaults to 4096 bits)
    type: String(data.type), // The primary key algorithm type: ECC (default) or RSA
    userIDs: [{ name: data.name, email: data.email }] // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]
  });
  const pbkey = await writeFile("./src/key/" + data.type + ".pub.pgp", publicKey, function(e) { if (e) {throw e;} }); pbkey;
  const prkey = await writeFile("./src/key/" + data.type + ".priv.pgp", privateKey, function(e) { if (e) {throw e;} }); prkey;
};

if (args) {
  let data = args;
  data.type = data[1];
  data.size = data[3];
  data.name = data[5];
  data.email = data[7];
  data.passphrase = data[9];
  data.curve = data[11];
  generateKey(data);
}
