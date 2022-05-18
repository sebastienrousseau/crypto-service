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
console.log(args);
/**
 * It generates a public and private key pair, and saves them to the file system
 * @param data - This is the data that is passed from the frontend.
 */

var generate = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(data) {
    var _yield$openpgp$genera, privateKey, publicKey, pbkey, prkey;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return openpgp.generateKey({
              curve: String(data.curve),
              // Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1
              format: data.format,
              // format of the output keys e.g. 'armored' | 'object' | 'binary';
              keyExpirationTime: parseInt(data.expiration),
              // Number of seconds from the key creation time after which the key expires
              passphrase: data.passphrase,
              // The passphrase used to encrypt the generated private key. If omitted, the key won't be encrypted. e.g. 1234567890abcdef
              rsaBits: parseInt(data.size),
              // Number of bits for RSA keys (defaults to 4096 bits)
              // subkeys: [{sign: data.sign, passphrase: data.passphrase}], // Options for each subkey e.g. [{sign: true, passphrase: '123'}] default to main key options, except for sign parameter that defaults to false, and indicates whether the subkey should sign rather than encrypt
              type: String(data.type),
              // The primary key algorithm type: ECC (default) or RSA
              userIDs: [{
                name: data.name,
                email: data.email
              }] // User IDs as objects: [{ name: "John Doe", email: "john@doe.com" }]

            });

          case 2:
            _yield$openpgp$genera = _context.sent;
            privateKey = _yield$openpgp$genera.privateKey;
            publicKey = _yield$openpgp$genera.publicKey;
            _context.next = 7;
            return (0, _promises.writeFile)("../key/" + data.type + ".pub.pgp", publicKey, function (e) {
              if (e) {
                throw e;
              }
            });

          case 7:
            pbkey = _context.sent;
            pbkey;
            _context.next = 11;
            return (0, _promises.writeFile)("./src/key/" + data.type + ".priv.pgp", privateKey, function (e) {
              if (e) {
                throw e;
              }
            });

          case 11:
            prkey = _context.sent;
            prkey;

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function generate(_x) {
    return _ref.apply(this, arguments);
  };
}();
/* Checking if the args variable is empty or not. */


if (args) {
  var data = args;
  data.curve = data[1];
  data.email = data[3];
  data.expiration = data[5];
  data.format = data[7];
  data.name = data[9];
  data.passphrase = data[11];
  data.size = data[15];
  data.type = data[17];
  generate(data);
}

var _default = generate;
exports["default"] = _default;