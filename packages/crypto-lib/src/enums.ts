/**
 * @module enums
 */

/** Crypto enumerations. */
export default {
  /**
   * ### enums.hash
   *
   * Enumeration of hash algorithms.
   *
   * @enum {String}
   * @readonly
   * @memberof module:enums
   * @description Enumeration of supported key hashing algorithms and their respective values.
   * @property {String} md5 - md5 hash algorithm.
   * @property {String} sha1 - sha1 hash algorithm.
   * @property {String} ripemd - ripemd hash algorithm.
   * @property {String} sha256 - SHA256 hash algorithm.
   * @property {String} sha512 - SHA512 hash algorithm.
   * @property {String} sha224 - SHA224 hash algorithm.
   *
   */
  hash: {
    /** MD5 hash algorithm. */
    md5: 1,
    /** SHA-1 hash algorithm. */
    sha1: 2,
    /** RIPEMD-160 hash algorithm. */
    ripemd: 3,
    /** SHA-256 hash algorithm. */
    sha256: 8,
    /** SHA-384 hash algorithm. */
    sha384: 9,
    /** SHA-512 hash algorithm. */
    sha512: 10,
    /** SHA-224 hash algorithm. */
    sha224: 11,
  },
  /**
   * ### enums.size
   *
   * Enumeration of key sizes.
   *
   * @enum {Number}
   * @readonly
   * @memberof module:enums
   * @description Enumeration of supported key sizes and their respective values.
   * @property {Number} keySize512 - The key size of 512 bits.
   * @property {Number} keySize1024 - The key size of 1024 bits.
   * @property {Number} keySize2048 - The key size of 2048 bits.
   * @property {Number} keySize3072 - The key size of 3072 bits.
   * @property {Number} keySize4096 - The key size of 4096 bits.
   * @property {Number} keySize6144 - The key size of 6144 bits.
   * @property {Number} keySize7680 - The key size of 7680 bits.
   * @property {Number} keySize8192 - The key size of 8192 bits.
   * @property {Number} keySize15360 - The key size of 15360 bits.
   *
   */
  size: {
    /** 512-bit key size. */
    keySize512: 512,
    /** 1024-bit key size. */
    keySize1024: 1024,
    /** 2048-bit key size. */
    keySize2048: 2048,
    /** 3072-bit key size. */
    keySize3072: 3072,
    /** 4096-bit key size. */
    keySize4096: 4096,
    /** 6144-bit key size. */
    keySize6144: 6144,
    /** 7680-bit key size. */
    keySize7680: 7680,
    /** 8192-bit key size. */
    keySize8192: 8192,
    /** 15360-bit key size. */
    keySize15360: 15360,
  },

  /**
   *
   * ### enums.curve
   *
   * Enumeration of elliptic curve algorithms.
   *
   * @enum {String}
   * @readonly
   * @see {@link https://wiki.gnupg.org/ECC|ECC - GnuPG wiki}
   * @memberof module:enums
   * @description Enumeration of supported elliptic curve algorithms and their respective values.
   * @property {String} p256 or P-256 - elliptic curve algorithm.
   * @property {String} p384 or P-384 - elliptic curve algorithm.
   * @property {String} p521 or P-521 - elliptic curve algorithm.
   * @property {String} secp256k1 - elliptic curve algorithm.
   * @property {String} ED25519 - elliptic curve algorithm.
   * @property {String} X25519 - elliptic curve algorithm.
   * @property {String} brainpoolP256r1 - elliptic curve algorithm.
   * @property {String} brainpoolP384r1 - elliptic curve algorithm.
   * @property {String} brainpoolP512r1 - elliptic curve algorithm.
   *
   */
  curve: {
    /** Canonical alias for P-256. */
    p256: "p256",
    /** OID alias for P-256. */
    "P-256": "p256",
    /** OID alias for P-256. */
    secp256r1: "p256",
    /** OID alias for P-256. */
    prime256v1: "p256",
    /** OID for P-256. */
    "1.2.840.10045.3.1.7": "p256",
    // '2a8648ce3d030107': 'p256',
    // '2A8648CE3D030107': 'p256',

    /** Canonical alias for P-384. */
    p384: "p384",
    /** OID alias for P-384. */
    "P-384": "p384",
    /** OID alias for P-384. */
    secp384r1: "p384",
    /** OID for P-384. */
    "1.3.132.0.34": "p384",
    /** Hex OID for P-384 (lowercase). */
    "2b81040022": "p384",
    /** Hex OID for P-384 (uppercase). */
    "2B81040022": "p384",

    /** Canonical alias for P-521. */
    p521: "p521",
    /** OID alias for P-521. */
    "P-521": "p521",
    /** OID alias for P-521. */
    secp521r1: "p521",
    /** OID for P-521. */
    "1.3.132.0.35": "p521",
    /** Hex OID for P-521 (lowercase). */
    "2b81040023": "p521",
    /** Hex OID for P-521 (uppercase). */
    "2B81040023": "p521",

    /** Canonical alias for secp256k1. */
    secp256k1: "secp256k1",
    /** OID for secp256k1. */
    "1.3.132.0.10": "secp256k1",
    /** Hex OID for secp256k1 (lowercase). */
    "2b8104000a": "secp256k1",
    /** Hex OID for secp256k1 (uppercase). */
    "2B8104000A": "secp256k1",

    /** Alias for Ed25519 (uppercase). */
    ED25519: "ed25519",
    /** Canonical alias for Ed25519. */
    ed25519: "ed25519",
    /** Alias for Ed25519 (mixed case). */
    Ed25519: "ed25519",
    /** OID for Ed25519. */
    "1.3.6.1.4.1.11591.15.1": "ed25519",
    /** Hex OID for Ed25519 (lowercase). */
    "2b06010401da470f01": "ed25519",
    /** Hex OID for Ed25519 (uppercase). */
    "2B06010401DA470F01": "ed25519",

    /** Alias for Curve25519 (X25519). */
    X25519: "curve25519",
    /** Alias for Curve25519 (cv25519). */
    cv25519: "curve25519",
    /** Canonical alias for Curve25519. */
    curve25519: "curve25519",
    /** Alias for Curve25519 (mixed case). */
    Curve25519: "curve25519",
    /** OID for Curve25519. */
    "1.3.6.1.4.1.3029.1.5.1": "curve25519",
    /** Hex OID for Curve25519 (lowercase). */
    "2b060104019755010501": "curve25519",
    /** Hex OID for Curve25519 (uppercase). */
    "2B060104019755010501": "curve25519",

    /** Canonical alias for BrainpoolP256r1. */
    brainpoolP256r1: "brainpoolP256r1",
    /** OID for BrainpoolP256r1. */
    "1.3.36.3.3.2.8.1.1.7": "brainpoolP256r1",
    /** Hex OID for BrainpoolP256r1 (lowercase). */
    "2b2403030208010107": "brainpoolP256r1",
    /** Hex OID for BrainpoolP256r1 (uppercase). */
    "2B2403030208010107": "brainpoolP256r1",

    /** Canonical alias for BrainpoolP384r1. */
    brainpoolP384r1: "brainpoolP384r1",
    /** OID for BrainpoolP384r1. */
    "1.3.36.3.3.2.8.1.1.11": "brainpoolP384r1",
    /** Hex OID for BrainpoolP384r1 (lowercase). */
    "2b240303020801010b": "brainpoolP384r1",
    /** Hex OID for BrainpoolP384r1 (uppercase). */
    "2B240303020801010B": "brainpoolP384r1",

    /** Canonical alias for BrainpoolP512r1. */
    brainpoolP512r1: "brainpoolP512r1",
    /** OID for BrainpoolP512r1. */
    "1.3.36.3.3.2.8.1.1.13": "brainpoolP512r1",
    /** Hex OID for BrainpoolP512r1 (lowercase). */
    "2b240303020801010d": "brainpoolP512r1",
    /** Hex OID for BrainpoolP512r1 (uppercase). */
    "2B240303020801010D": "brainpoolP512r1",
  },

  /**
   *
   * ### enums.type
   *
   * Enumeration of supported types.
   *
   * @enum {String}
   * @readonly
   * @memberof module:enums
   * @description Enumeration of supported types and their respective values.
   * @property {String} ecc - elliptic curve cryptography.
   * @property {String} rsa - RSA cryptography.
   *
   */
  type: {
    /** Elliptic curve cryptography. */
    ecc: "ecc",
    /** RSA cryptography. */
    rsa: "rsa",
  },

  /**
   * ### enums.format
   *
   * Enumeration of supported formats.
   *
   * @enum {String}
   * @readonly
   * @memberof module:enums
   * @description Enumeration of supported formats and their respective values.
   * @property {String} armored - ASCII armored format.
   * @property {String} binary - binary format.
   * @property {String} object - object format.
   *
   */
  format: {
    /** ASCII armored format. */
    armored: "armored",
    /** Binary format. */
    binary: "binary",
    /** Object format. */
    object: "object",
  },
};

// # sourceMappingURL=enums.js.map
// Language: typescript
