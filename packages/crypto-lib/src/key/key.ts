import { readFileSync } from "fs";

/**
 * ### PrivateKeyBase64
 *
 * @param {string} filePath
 * @returns {string}
 * @private
 * @memberof key
 * @description Reads the private key file and returns the base64 string.
 *
 */

export const PrivateKeyBase64 = readFileSync("./src/key/rsa.key");

/**
 * ### PublicKeyBase64
 *
 * @param {string} filePath
 * @returns {string}
 * @private
 * @memberof key
 * @description Reads the public key file and returns the base64 string.
 *
 */

export const PublicKeyBase64 = readFileSync("./src/key/rsa.pub");

/**
 * ### RevocationCertificateBase64
 *
 * @param {string} filePath
 * @returns {string}
 * @private
 * @memberof key
 * @description Reads the revocation certificate file and returns the base64 string.
 *
 */

export const RevocationCertificateBase64 = readFileSync("./src/key/rsa.cert");

/**
 * ### PrivateKey
 *
 * @param {string} PrivateKeyBase64
 * @returns {string}
 * @private
 * @memberof key
 * @description Returns the private key.
 *
 */

export const PrivateKey = Buffer.from(PrivateKeyBase64.toString(), "base64").toString("utf-8");

/**
 * ### PublicKey
 *
 * @param {string} PublicKeyBase64
 * @returns {string}
 * @private
 * @memberof key
 * @description Returns the public key.
 *
 */

export const PublicKey = Buffer.from(PublicKeyBase64.toString(), "base64").toString("utf-8");

/**
 * ### RevocationCertificate
 *
 * @param {string} RevocationCertificateBase64
 * @returns {string}
 * @private
 * @memberof key
 * @description Returns the revocation certificate.
 *
 */

export const RevocationCertificate = Buffer.from(RevocationCertificateBase64.toString(), "base64").toString("utf-8");

export default {
  PrivateKeyBase64,
  PublicKeyBase64,
  RevocationCertificateBase64,
  PrivateKey,
  PublicKey,
  RevocationCertificate
};

// # sourceMappingURL=key.js.map
// Language: typescript
