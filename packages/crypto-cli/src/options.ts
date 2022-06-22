const curve = {
  demand: true,
  alias: 'c',
  desc: 'Curve to use',
}

const encryptedMessage = {
  demand: true,
  alias: 'e', // -
  desc: 'Encrypted message to decrypt',
}

const email = {
  demand: true,
  alias: 'e',
  desc: 'Email address',
}

const format = {
  demand: true,
  alias: 'f',
  desc: 'Format to use',
}

const keyExpirationTime = {
  demand: true,
  alias: 'k',
  desc: 'Key expiration time'
}

const message = {
  demand: true,
  alias: 'm', // -
  desc: 'Message to encrypt',
}

const name = {
  demand: true,
  alias: 'n',
  desc: 'Name',
}

const passphrase = {
  demand: true,
  alias: 'p', // -
  desc: 'Passphrase to use to encrypt the message',
}

const publicKey = {
  demand: true,
  alias: 'k', // -
  desc: 'Public key to use to encrypt the message',
}

const rsaBits = {
  demand: true,
  alias: 'r', // -
  desc: 'RSA bits to use',
}

const sign = {
  demand: true,
  alias: 's',
  desc: 'Sign the message',
}

const type = {
  demand: true,
  alias: 't',
  desc: 'Type of key to generate',
}

const optionsEncrypt = {
  passphrase,
  message,
  publicKey
}

const optionsDecrypt = {
  passphrase,
  encryptedMessage,
  publicKey
}

const optionsGenerate = {
  curve,
  email,
  format,
  keyExpirationTime,
  name,
  passphrase,
  rsaBits,
  sign,
  type,
}

export {
  optionsEncrypt,
  optionsDecrypt,
  optionsGenerate
}
