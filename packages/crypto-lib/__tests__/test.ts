// import { decrypt } from '../src/lib/decrypt';
// import { encrypt } from '../src/lib/encrypt';
import { generate } from '../src/lib/generate';
// import { reformat } from '../src/lib/reformat';
// import { revoke } from '../src/lib/revoke';
// import { session } from '../src/lib/session';
// import { sign } from '../src/lib/sign';
// import { verify } from '../src/lib/verify';
import config from '../src/config/config';
import enums from '../src/enums';


const curve = config.preferredCurve as keyof typeof enums.curve;
const date = new Date();
// const detached = false;
const email = 'jane@doe.com';
// const encryptedMessage = '...';
// const expiration = 0;
// const flag = 0;
const format = config.preferredFormat as keyof typeof enums.format;
const keyExpirationTime = 0;
// const message = 'Hello Crypto Service Suite APIs!';
const name = 'Jane Doe';
const passphrase = '123456789abcdef';
// const publicKey = '...';
// const reason = "Test";
const rsaBits = config.preferredRSABits;
// const signature = true;
const type = config.preferredType as keyof typeof enums.type;
const userIDs = [{ name, email }];

// decrypt({ passphrase, encryptedMessage, publicKey}); // decrypt
// encrypt({passphrase, message, publicKey}); // encrypt
generate({curve, date, email, format, keyExpirationTime, name, passphrase, rsaBits, type, userIDs});// generate
// reformat({date, email, expiration, name, passphrase, publicKey}); // reformat
// revoke({ passphrase, flag, reason }); // revoke
// session({ email, name, publicKey }) // session
// sign( { message, detached, passphrase }); // sign
// verify( { message, publicKey }); // verify
