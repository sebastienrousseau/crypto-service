import * as openpgp from "openpgp";
import { readFile, writeFile } from "fs/promises";

/* Taking the arguments from the command line and logging them to the console. */
let args = process.argv.slice(2);


/**
 * It reads the public and private keys from the file system, decrypts the private
 * key with the passphrase, and then decrypts the encrypted message with the public
 * and private keys
 * @returns The decrypted message.
 */
const decrypt = async(args) => {

  /* Taking the arguments from the command line and storing them in an array. */
  let data = args;
  // console.log(data);

  /* Reading the files from the file system. */
  // let encryptedMessage = "-----BEGIN PGP MESSAGE-----\n\nwcBMA110yr3GkulyAQf+PCGL6Qad27b2ZVET8PRhgQIojiwxPcN2vMk1WD/n\n/l6tmQfweMys/vyYTmZfDI82nHGafOlwD6ypIIpCf8Ryi7qOpQXUtytsdhu1\nlHDvIPiY1lA0p7Xe655EVluuVGntarNHbbfpIxcd7QtAp4vN+e5sPWgEP5CD\n2dlNtsWXbGWUSIlGempnpfplGJ5rKZdhtJLTF6Vbwb5asnGtuy5fSo8XVedn\nHbg7GEr7R+PBsuZXNUEjYU/3vvC3wE7rD4CmEd0i2uRIX9evDH8Tw53r9JQF\nctZIJ0ZqR9bwNFhU9dTBOq0h21XX334wtZvr7Cne1G2YJqyMnoAgkGNMCK6W\nUdLAvwHutnzcWof7iZgEz9o7xWQtIfQlYebdyv3yazsH0CEWfq1hzDU56sQH\nVPQprnuPUX2Z1Mhi08LjF80Jrn1tXo6RnWrGEY7QK28eDhUXvRLFCshmmk+c\nFXWEP3SWxslTi4PidK+GzmFi7owjOVWdlTRPatESbAEcjiGcFeDwfrPnyJJv\ngVCgv2Yk05e5qmx6AE5JW0SbwQubV7P4d7PumtT5X5rvPKKRLvMpJmz5/aOX\njju+IpampP8L24lowT1f8TqBiiTufRc7ONdhuaFoAFqYIKUVW+HRIpp26uA3\ne2J2xam3QoEZASF6mOQl2HYdFb9FmnK7c95jSilsWcSruWYLQ0PtlWwW9HsE\nOXTBexDHt5wrnto9F+r61jirmMxoNa9r/uGIYSCiIofw21DhmOjBbK+E7y8m\nsrPKDy5TG2qiQ9GubWqEplAH1iYlrtE58BxWo3rTBoQBejuVueSQSvDyYgph\ntTXNM3lRajzSEeWBc0EuZ8EN+EMweyV9AdLB\n=PffN\n-----END PGP MESSAGE-----\n";
  // let message = await readFile("./src/data/encrypted.txt", function(e) { if (e) {throw e;} });
  let message = data.message;
  let passphrase = data.passphrase;
  let privateKeyArmored = await readFile("./src/key/rsa.priv.pgp", function(e) { if (e) {throw e;} });
  let publicKeyArmored = await readFile("./src/key/rsa.pub.pgp", function(e) { if (e) {throw e;} });

  /* Converting the message from base64 to utf-8. */
  message = Buffer.from(message, "base64").toString("utf-8");
  // let message = "-----BEGIN PGP MESSAGE-----\n\nwcBMA110yr3GkulyAQf/cxtdGCo/LHcPeWRFaXN0kGiaNvtgjercSZWB9NUZ\n3SITK54WF+q2q24BfD/skgiCYcmu+Fg9SWIFPT117fgjQwy6kwD3EropcMH9\nsUY01X/TIiu55wi+szwTgrYni6y7EX1XUsoLJJTUr37ZXLfwtmK+LQEYDx4d\nUIpn+iRYRiLq3a0uWi81WRrfpy6XnleycoUnVH1SXfCVjftz7HGupA5OIfyu\nnVOfpOJseeAVQF7O9ldkcc4m9ZYwgzebuhPlHQBnZXJA2okF1mQMguHu1x4/\nmNwRuru1GslmXNm15WmecYKrr7n+Xx0JvmWTRs2hFiSpNoD6RDswK8nmgrCx\n1dLA1wHUP6I+Uj53Q2NX4Tn1m6PdFPzcraXw7hkbm6NlRhKeZ0Ym0Pdka0cX\n2VYlv14sCmYc4gaxFS6FlVGi3RoUjfH/DbZHuRDSMkWjrAQM4/bd9BAjfj/X\naIsmyPFYa6gZ/6AYOTT2sBe08kW9m9Ef93rSRpmXIARYbGVHIWd0Qn+C4bYp\nP/K2WYTgNKdSf+Pwp1nruUqf2CbsRdTcg1kVOqnAK10bKaTagl9jhkBRiiAv\n+QFOr6X/gr/9AcXs5g+1CU3gyfwUZFt76PK1ITCzSpa1BrFZYZSwMqkRU6mx\nChvM1K+aRp6jXMDtv/mQXw1R6X7M8Urc1IKiUZKHnQcj9aMgo3pXZ0IflZDc\nwrdyPx4fTKIRBZrd4P06Q7ctjUhFQM+oynP7tKHoJqKPZY2Mle0vTGB4W/f+\nxfxl2klQghWb3v9j9PDzovLPSoo2TRlDzvyZgztW0GNbax8epFjsio0KzlOk\ni2YxHOOA1NGvFIksLQRPB5KqQeItXSZ4p4Ib51xmZpfJkyGrwncpDbvr9nWr\nQGMYL3R8\n=3KnU\n-----END PGP MESSAGE-----\n";

  /* Reading the public key from the file system and converting it to a string. */
  const publicKey = await openpgp.readKey({ armoredKey: String(publicKeyArmored) });

  /* Decrypting the private key with the passphrase. */
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: String(privateKeyArmored) }),
    passphrase
  });

  /* Destructuring the data from the object returned by the `openpgp.decrypt()`
  function. */
  const { data: decrypted/*, signatures*/ } = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: message }),
    verificationKeys: publicKey,
    decryptionKeys: privateKey
  });

  /* Writing the decrypted message to a file. */
  const decryptedMessage = await writeFile("./src/data/decrypted.txt", decrypted, function(e) { if (e) {throw e;} }); decryptedMessage;

  /* Logging the decrypted message to the console. */
  console.log("\n❯ Decrypted message:\n" + decrypted);

  return decrypted;
};

/* Checking if the arguments passed to the function are an array and if the array
has a length. If it does, it is taking the arguments from the command line and
storing them in an array. */
if (args instanceof Array && args.length) {
  let data = args;
  let passphrase = data[1];
  let message = data[3];
  data = ({"passphrase": passphrase, "message": message});
  // console.log(data);
  decrypt(data);
}

/* Exporting the `decrypt()` function so that it can be imported into
other files. */
export default decrypt;
