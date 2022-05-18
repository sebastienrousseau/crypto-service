"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var openpgp = _interopRequireWildcard(require("openpgp"));

var _promises = require("fs/promises");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

/* Taking the arguments from the command line and storing them in an array. */
var args = process.argv.slice(2);
/**
 * @function encrypt
 * @summary Encrypts a message using a generated public keys and a given passphrase.
 * @author: Sebastien Rousseau <hello@crypto-service.dev>
 * @description
 * <ul>
 *  <li>It transforms understandable text into an unintelligible piece of data,</li>
 *  <li>It takes a message and a passphrase, encrypts the message with the public
 * key and returns the encrypted message result in base64 format.</li>
 * </ul>
 *
 * @param {Object} args - The arguments passed to the function.
 * @returns {string} data - The encrypted message result in base64 format.
 */

var encrypt = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(args) {
    var data, publicKeyArmored, privateKeyArmored, passphrase, message, publicKey, privateKey, encrypted, encryptedMessage;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            /* Converting the array into a JSON object. */
            args = JSON.stringify(args);
            data = JSON.parse(args); // console.log(data);

            /* Reading the public and private keys from the file. */

            _context.next = 4;
            return (0, _promises.readFile)("../key/rsa.pub.pgp", function (e) {
              if (e) {
                throw e;
              }
            });

          case 4:
            publicKeyArmored = _context.sent;
            _context.next = 7;
            return (0, _promises.readFile)("../key/rsa.priv.pgp", function (e) {
              if (e) {
                throw e;
              }
            });

          case 7:
            privateKeyArmored = _context.sent;
            passphrase = data.passphrase;
            message = data.message;
            /* Reading the public key from the file. */

            _context.next = 12;
            return openpgp.readKey({
              armoredKey: publicKeyArmored.toString()
            });

          case 12:
            publicKey = _context.sent;
            _context.t0 = openpgp;
            _context.next = 16;
            return openpgp.readKey({
              armoredKey: privateKeyArmored.toString()
            });

          case 16:
            _context.t1 = _context.sent;
            _context.t2 = passphrase;
            _context.t3 = {
              privateKey: _context.t1,
              passphrase: _context.t2
            };
            _context.next = 21;
            return _context.t0.decryptKey.call(_context.t0, _context.t3);

          case 21:
            privateKey = _context.sent;
            _context.t4 = openpgp;
            _context.next = 25;
            return openpgp.createMessage({
              text: message
            });

          case 25:
            _context.t5 = _context.sent;
            _context.t6 = publicKey;
            _context.t7 = privateKey;
            _context.t8 = {
              message: _context.t5,
              encryptionKeys: _context.t6,
              signingKeys: _context.t7
            };
            _context.next = 31;
            return _context.t4.encrypt.call(_context.t4, _context.t8);

          case 31:
            encrypted = _context.sent;
            _context.next = 34;
            return (0, _promises.writeFile)("../data/encrypted.txt", encrypted, function (e) {
              if (e) {
                throw e;
              }
            });

          case 34:
            encryptedMessage = _context.sent;
            encryptedMessage;
            /* Logging the encrypted message to the console. */

            console.log("\n❯ Encrypted message:\n" + Buffer.from(encrypted).toString("base64")); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

            return _context.abrupt("return", Buffer.from(encrypted).toString("base64"));

          case 38:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function encrypt(_x) {
    return _ref.apply(this, arguments);
  };
}();
/* Checking if the arguments passed to the function are an array and if the array
has a length. If it does, it is taking the arguments from the command line and
storing them in an array. */


if (args instanceof Array && args.length) {
  /* Taking the arguments from the command line and storing them in an array. */
  var data = args; // console.log(args);

  data.passphrase = data[1];
  data.message = data[3];
  data = {
    passphrase: data.passphrase,
    message: data.message
  };
  encrypt(data);
}
/* Exporting the function `encrypt` so that it can be used in other files. */


var _default = encrypt;
exports["default"] = _default;