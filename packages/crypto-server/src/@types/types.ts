export type IQuerystring = {
  username: string;
  password: string;
};
/* eslint-disable  @typescript-eslint/no-explicit-any */
export type IHeadersGenerate = {
  date: Date;
  name: string;
  email: string;
  userIDs: [{
    name: string,
    email: string
  }];
  type: any;
  passphrase: string;
  rsaBits: number;
  curve: any;
  keyExpirationTime: number;
  format: any;
};

export type IHeadersEncrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
};

export type IHeadersDecrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
};

export type IHeadersRevoke = {
  passphrase: string;
  flag: number;
  reason: string;
};

export type IHeadersVerify = {
  date: string;
  message: string;
  verificationKeys: string;
};
