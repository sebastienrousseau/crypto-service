import enums from '../enums';

export default {
  /**
   * @memberof module:config
   * @property {Integer} preferredRSABits Default size algorithm {@link module:enums.size}
   */
  preferredRSABits: enums.size.keySize2048,

  /**
   * @memberof module:config
   * @property {Integer} preferredRSABits Default size algorithm {@link module:enums.curve}
   */
  preferredCurve: enums.curve.p256,

  /**
   * @memberof module:config
   * @property {Integer} Type Default type {@link module:enums.type}
   */
  preferredType: enums.type.rsa,

  /**
   * @memberof module:config
   * @property {Integer} format Default format {@link module:enums.format}
   */
  preferredFormat: enums.format.armored,
}

