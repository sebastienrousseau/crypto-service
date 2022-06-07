export type dataGenerate = {
  curve: any;
  date: Date;
  email: string;
  format: any;
  keyExpirationTime: number;
  name: string;
  passphrase: string;
  rsaBits: number;
  type: any;
  userIDs: any;
};

export type dataRevoke = {
  passphrase: string;
};

export type dataEncrypt = {
  passphrase: string;
  message: string;
  publicKey: string;
};

export type dataDecrypt = {
  passphrase: string;
  encryptedMessage: string;
  publicKey: string;
};

export type dataSign = {
  passphrase: string;
  message: string;
};

export type dataVerify = {
  passphrase: string;
  message: string;
  publicKey: string;
};

export type dataSessionKey = {
  date: string;
  email: string;
  name: string;
  publicKey: string;
};
