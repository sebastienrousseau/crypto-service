/**
 * @module enums
 */

export default {
  hash: {
    md5: 1,
    sha1: 2,
    ripemd: 3,
    sha256: 8,
    sha384: 9,
    sha512: 10,
    sha224: 11
  },
  size: {
    keySize512: 512,
    keySize1024: 1024,
    keySize2048: 2048,
    keySize3072: 3072,
    keySize4096: 4096,
    keySize6144: 6144,
    keySize7680: 7680,
    keySize8192: 8192,
    keySize1536: 15360,
  },
  /** Maps curve names under various standards to one
   * @see {@link https://wiki.gnupg.org/ECC|ECC - GnuPG wiki}
   * @enum {String}
   * @readonly
   */
  curve: {
    /** NIST P-256 Curve */
    'p256': 'p256',
    'P-256': 'p256',
    'secp256r1': 'p256',
    'prime256v1': 'p256',
    '1.2.840.10045.3.1.7': 'p256',
    '2a8648ce3d030107': 'p256',
    '2A8648CE3D030107': 'p256',

    /** NIST P-384 Curve */
    'p384': 'p384',
    'P-384': 'p384',
    'secp384r1': 'p384',
    '1.3.132.0.34': 'p384',
    '2b81040022': 'p384',
    '2B81040022': 'p384',

    /** NIST P-521 Curve */
    'p521': 'p521',
    'P-521': 'p521',
    'secp521r1': 'p521',
    '1.3.132.0.35': 'p521',
    '2b81040023': 'p521',
    '2B81040023': 'p521',

    /** SECG SECP256k1 Curve */
    'secp256k1': 'secp256k1',
    '1.3.132.0.10': 'secp256k1',
    '2b8104000a': 'secp256k1',
    '2B8104000A': 'secp256k1',

    /** Ed25519 */
    'ED25519': 'ed25519',
    'ed25519': 'ed25519',
    'Ed25519': 'ed25519',
    '1.3.6.1.4.1.11591.15.1': 'ed25519',
    '2b06010401da470f01': 'ed25519',
    '2B06010401DA470F01': 'ed25519',

    /** Curve25519 */
    'X25519': 'curve25519',
    'cv25519': 'curve25519',
    'curve25519': 'curve25519',
    'Curve25519': 'curve25519',
    '1.3.6.1.4.1.3029.1.5.1': 'curve25519',
    '2b060104019755010501': 'curve25519',
    '2B060104019755010501': 'curve25519',

    /** BrainpoolP256r1 Curve */
    'brainpoolP256r1': 'brainpoolP256r1',
    '1.3.36.3.3.2.8.1.1.7': 'brainpoolP256r1',
    '2b2403030208010107': 'brainpoolP256r1',
    '2B2403030208010107': 'brainpoolP256r1',

    /** BrainpoolP384r1 Curve */
    'brainpoolP384r1': 'brainpoolP384r1',
    '1.3.36.3.3.2.8.1.1.11': 'brainpoolP384r1',
    '2b240303020801010b': 'brainpoolP384r1',
    '2B240303020801010B': 'brainpoolP384r1',

    /** BrainpoolP512r1 Curve */
    'brainpoolP512r1': 'brainpoolP512r1',
    '1.3.36.3.3.2.8.1.1.13': 'brainpoolP512r1',
    '2b240303020801010d': 'brainpoolP512r1',
    '2B240303020801010D': 'brainpoolP512r1'
  },
  type: {
    ecc: 'ecc',
    rsa: 'rsa',
  },
  format: {
    armored: 'armored',
    binary: 'binary',
    object: 'object',
  }
}
