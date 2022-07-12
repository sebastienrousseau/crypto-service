export type IQuerystring = {
  username: string;
  password: string;
};

export type IHeadersGenerate = {
  curve: any;
  date: Date;
  email: string;
  format: any;
  keyExpirationTime: number;
  name: string;
  passphrase: string;
  rsaBits: number;
  type: any;
  userIDs: [{ name: string, email: string }];
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
