"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var openpgp = _interopRequireWildcard(require("openpgp"));

var _promises = require("fs/promises");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

/* Taking the arguments from the command line and logging them to the console. */
var args = process.argv.slice(2);
/**
 * It reads the public and private keys from the file system, decrypts the private
 * key with the passphrase, and then decrypts the encrypted message with the public
 * and private keys
 * @returns The decrypted message.
 */

var decrypt = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(args) {
    var data, message, passphrase, privateKeyArmored, publicKeyArmored, publicKey, privateKey, _yield$openpgp$decryp, decrypted, decryptedMessage;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            /* Taking the arguments from the command line and storing them in an array. */
            data = args; // console.log(data);

            /* Reading the files from the file system. */
            // let encryptedMessage = "-----BEGIN PGP MESSAGE-----\n\nwcBMA110yr3GkulyAQf+PCGL6Qad27b2ZVET8PRhgQIojiwxPcN2vMk1WD/n\n/l6tmQfweMys/vyYTmZfDI82nHGafOlwD6ypIIpCf8Ryi7qOpQXUtytsdhu1\nlHDvIPiY1lA0p7Xe655EVluuVGntarNHbbfpIxcd7QtAp4vN+e5sPWgEP5CD\n2dlNtsWXbGWUSIlGempnpfplGJ5rKZdhtJLTF6Vbwb5asnGtuy5fSo8XVedn\nHbg7GEr7R+PBsuZXNUEjYU/3vvC3wE7rD4CmEd0i2uRIX9evDH8Tw53r9JQF\nctZIJ0ZqR9bwNFhU9dTBOq0h21XX334wtZvr7Cne1G2YJqyMnoAgkGNMCK6W\nUdLAvwHutnzcWof7iZgEz9o7xWQtIfQlYebdyv3yazsH0CEWfq1hzDU56sQH\nVPQprnuPUX2Z1Mhi08LjF80Jrn1tXo6RnWrGEY7QK28eDhUXvRLFCshmmk+c\nFXWEP3SWxslTi4PidK+GzmFi7owjOVWdlTRPatESbAEcjiGcFeDwfrPnyJJv\ngVCgv2Yk05e5qmx6AE5JW0SbwQubV7P4d7PumtT5X5rvPKKRLvMpJmz5/aOX\njju+IpampP8L24lowT1f8TqBiiTufRc7ONdhuaFoAFqYIKUVW+HRIpp26uA3\ne2J2xam3QoEZASF6mOQl2HYdFb9FmnK7c95jSilsWcSruWYLQ0PtlWwW9HsE\nOXTBexDHt5wrnto9F+r61jirmMxoNa9r/uGIYSCiIofw21DhmOjBbK+E7y8m\nsrPKDy5TG2qiQ9GubWqEplAH1iYlrtE58BxWo3rTBoQBejuVueSQSvDyYgph\ntTXNM3lRajzSEeWBc0EuZ8EN+EMweyV9AdLB\n=PffN\n-----END PGP MESSAGE-----\n";
            // let message = await readFile("./src/data/encrypted.txt", function(e) { if (e) {throw e;} });

            message = data.message;
            passphrase = data.passphrase;
            _context.next = 5;
            return (0, _promises.readFile)("../key/rsa.priv.pgp", function (e) {
              if (e) {
                throw e;
              }
            });

          case 5:
            privateKeyArmored = _context.sent;
            _context.next = 8;
            return (0, _promises.readFile)("../key/rsa.pub.pgp", function (e) {
              if (e) {
                throw e;
              }
            });

          case 8:
            publicKeyArmored = _context.sent;

            /* Converting the message from base64 to utf-8. */
            message = Buffer.from(message, "base64").toString("utf-8"); // let message = "-----BEGIN PGP MESSAGE-----\n\nwcBMA110yr3GkulyAQf/cxtdGCo/LHcPeWRFaXN0kGiaNvtgjercSZWB9NUZ\n3SITK54WF+q2q24BfD/skgiCYcmu+Fg9SWIFPT117fgjQwy6kwD3EropcMH9\nsUY01X/TIiu55wi+szwTgrYni6y7EX1XUsoLJJTUr37ZXLfwtmK+LQEYDx4d\nUIpn+iRYRiLq3a0uWi81WRrfpy6XnleycoUnVH1SXfCVjftz7HGupA5OIfyu\nnVOfpOJseeAVQF7O9ldkcc4m9ZYwgzebuhPlHQBnZXJA2okF1mQMguHu1x4/\nmNwRuru1GslmXNm15WmecYKrr7n+Xx0JvmWTRs2hFiSpNoD6RDswK8nmgrCx\n1dLA1wHUP6I+Uj53Q2NX4Tn1m6PdFPzcraXw7hkbm6NlRhKeZ0Ym0Pdka0cX\n2VYlv14sCmYc4gaxFS6FlVGi3RoUjfH/DbZHuRDSMkWjrAQM4/bd9BAjfj/X\naIsmyPFYa6gZ/6AYOTT2sBe08kW9m9Ef93rSRpmXIARYbGVHIWd0Qn+C4bYp\nP/K2WYTgNKdSf+Pwp1nruUqf2CbsRdTcg1kVOqnAK10bKaTagl9jhkBRiiAv\n+QFOr6X/gr/9AcXs5g+1CU3gyfwUZFt76PK1ITCzSpa1BrFZYZSwMqkRU6mx\nChvM1K+aRp6jXMDtv/mQXw1R6X7M8Urc1IKiUZKHnQcj9aMgo3pXZ0IflZDc\nwrdyPx4fTKIRBZrd4P06Q7ctjUhFQM+oynP7tKHoJqKPZY2Mle0vTGB4W/f+\nxfxl2klQghWb3v9j9PDzovLPSoo2TRlDzvyZgztW0GNbax8epFjsio0KzlOk\ni2YxHOOA1NGvFIksLQRPB5KqQeItXSZ4p4Ib51xmZpfJkyGrwncpDbvr9nWr\nQGMYL3R8\n=3KnU\n-----END PGP MESSAGE-----\n";

            /* Reading the public key from the file system and converting it to a string. */

            _context.next = 12;
            return openpgp.readKey({
              armoredKey: String(publicKeyArmored)
            });

          case 12:
            publicKey = _context.sent;
            _context.t0 = openpgp;
            _context.next = 16;
            return openpgp.readKey({
              armoredKey: String(privateKeyArmored)
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
            return openpgp.readMessage({
              armoredMessage: message
            });

          case 25:
            _context.t5 = _context.sent;
            _context.t6 = publicKey;
            _context.t7 = privateKey;
            _context.t8 = {
              message: _context.t5,
              verificationKeys: _context.t6,
              decryptionKeys: _context.t7
            };
            _context.next = 31;
            return _context.t4.decrypt.call(_context.t4, _context.t8);

          case 31:
            _yield$openpgp$decryp = _context.sent;
            decrypted = _yield$openpgp$decryp.data;
            _context.next = 35;
            return (0, _promises.writeFile)("../data/decrypted.txt", decrypted, function (e) {
              if (e) {
                throw e;
              }
            });

          case 35:
            decryptedMessage = _context.sent;
            decryptedMessage;
            /* Logging the decrypted message to the console. */

            console.log("\n❯ Decrypted message:\n" + decrypted);
            return _context.abrupt("return", decrypted);

          case 39:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function decrypt(_x) {
    return _ref.apply(this, arguments);
  };
}();
/* Checking if the arguments passed to the function are an array and if the array
has a length. If it does, it is taking the arguments from the command line and
storing them in an array. */


if (args instanceof Array && args.length) {
  var data = args;
  var passphrase = data[1];
  var message = data[3];
  data = {
    passphrase: passphrase,
    message: message
  }; // console.log(data);

  decrypt(data);
}
/* Exporting the `decrypt()` function so that it can be imported into
other files. */


var _default = decrypt;
exports["default"] = _default;