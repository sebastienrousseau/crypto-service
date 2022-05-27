export type IQuerystring = {
  username: string;
  password: string;
}

export type generateHeaders = {
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
}

export type encryptionHeaders = {
  passphrase: string;
  message: string;
}
