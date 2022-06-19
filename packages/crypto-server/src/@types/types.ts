export type IQuerystring = {
  username: string;
  password: string;
};

export type IHeadersGenerate = {
  type: string;
  bits: string;
  name: string;
  email: string;
  passphrase: string;
  curve: string;
  expiration: string;
  format: string;
  message: string;
  sign: string;
};

export type IHeadersEncrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
};

export type IHeadersDecrypt = {
  passphrase: string;
  encryptedMessage: string;
  publicKey: string;
};

export type IHeadersRevoke = {
  passphrase: string;
  flag: number;
  reason: string;
};
