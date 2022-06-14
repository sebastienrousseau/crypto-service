import enums from '../enums';

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
   * @memberof module:config
   * @default enums.size.keySize4096
   * @description User configurable property, sets the preferred number of bits for RSA keys.
    * @property {Number} preferredRSABits Default number of bits for RSA keys. {@link module:enums.size}
   * @see {@link module:enums.size}
   * @see {@link module:config}
   * @see {@link module:config.preferredRSABits}
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
   * @memberof module:config
   * @description User configurable property, sets the preferred curve for ECC keys.
   * @default 'enums.curve.X25519'
   * @property {String} preferredCurve Default curve algorithm {@link module:enums.curve}
   * @see {@link module:enums.curve}
   * @see {@link module:config}
   * @see {@link module:config.preferredCurve}
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
   * @memberof module:config
   * @description User configurable property, sets the preferred type for keys.
   * @default 'rsa'
   * @property {String} preferredType Default type for keys {@link module:enums.type}
   * @see {@link module:enums.type}
   * @see {@link module:config}
   * @see {@link module:config.preferredType}
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
   * @memberof module:config
   * @description User configurable property, sets the preferred format for keys.
   * @default 'armored'
   * @property {String} preferredFormat Default format for keys {@link module:enums.format}
   * @see {@link module:enums.format}
   * @see {@link module:config}
   * @see {@link module:config.preferredFormat}
   *
   */

  preferredFormat: enums.format.armored,

}

// # sourceMappingURL=config.js.map
// Language: typescript
