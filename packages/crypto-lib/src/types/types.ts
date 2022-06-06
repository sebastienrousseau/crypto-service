export type dataGenerate = {
  bits: number;
  curve: string;
  email: string;
  expiration: number;
  format: string;
  name: string;
  passphrase: string;
  signature: boolean;
  type: string;
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
