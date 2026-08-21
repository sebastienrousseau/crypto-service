import enums from "../enums";

/** Default cryptographic configuration (key type, size, curve, format). */
export default {
  /**
   * ### config.preferredRSABits
   *
   * User configurable property, sets the preferred number of bits for RSA keys.
   * Default is enums.size.keySize4096.
   *
   * Set it to an empty string to enable the default setting.
   *
   * @type {number}
   * @public
   * @default enums.size.keySize4096
   * @see enums
   *
   */

  preferredRSABits: enums.size.keySize2048,

  /**
   * ### config.preferredCurve
   *
   * User configurable property, sets the preferred curve for ECC keys.
   * Default is `enums.curve.X25519`.
   *
   * Set it to an empty string to enable the default setting.
   *
   * @type {string}
   * @public
   * @default 'enums.curve.X25519'
   * @see enums
   *
   */

  preferredCurve: enums.curve.p256,

  /**
   * ### config.preferredType
   *
   * User configurable property, sets the preferred type for keys.
   * Default is `rsa`.
   *
   * @type {string}
   * @public
   * @default 'rsa'
   * @see enums
   *
   */

  preferredType: enums.type.rsa,

  /**
   * ### config.preferredFormat
   *
   * User configurable property, sets the preferred format for keys.
   * Default is `armored`.
   *
   * @type {string}
   * @public
   * @default 'armored'
   * @see enums
   *
   */

  preferredFormat: enums.format.armored,
};

// # sourceMappingURL=config.js.map
// Language: typescript
