import openpgp from "openpgp";
import { readFile } from "fs/promises";

// Initializing Variables
const args = process.argv.slice(2);

const encrypt = async(key, text) => {
  try {
    var publicKey = readPublicKey(key);
    done(null, encryptText(publicKey, text));
  }
  catch (e) {
    
  }
};

function readPublicKey(key) {
  return openpgp.key.readArmored(key);
}

function encryptText(key, text) {
  var msg = openpgp.message.fromText(text);
  var encrypted = msg.encrypt(key.keys);
  var encryptedText = openpgp.armor.encode(openpgp.enums.armor.message, encrypted.packets.write());

  return encryptedText;
}
export default encrypt;

if (args) {
  let data = args;
  console.log(data);
  var publicKey = await readFile(new URL("public.key", import.meta.url));
  var privateKey = await readFile(new URL("private.key", import.meta.url));
  console.log(publicKey);
  console.log(privateKey);
  // var privateKey = fs.readFileSync(__dirname + 'private.key').toString();
  data.key = data[0];
  data.string = data[1];
  // data.separator = data[7];
  encrypt(data.key, data.string);
  console.log(encrypt(data.key, data.string));
}

