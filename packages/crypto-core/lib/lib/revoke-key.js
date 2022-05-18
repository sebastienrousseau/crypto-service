"use strict";

var openpgp = _interopRequireWildcard(require("openpgp"));

var _promises = require("fs/promises");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var publicKey = await (0, _promises.readFile)("./src/key/rsa_public.key", function (e) {
  if (e) {
    throw e;
  }
});
var privateKey = await (0, _promises.readFile)("./src/key/rsa_private.key", function (e) {
  if (e) {
    throw e;
  }
});

/*#__PURE__*/
_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.t0 = openpgp;
          _context.next = 3;
          return openpgp.key.readArmored(privateKey);

        case 3:
          _context.t1 = _context.sent.keys[0];
          _context.t2 = {
            key: _context.t1
          };
          _context.next = 7;
          return _context.t0.revokeKey.call(_context.t0, _context.t2);

        case 7:
        case "end":
          return _context.stop();
      }
    }
  }, _callee);
}));

console.log(publicKey.toString()); // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

console.log(privateKey.toString()); // '-----BEGIN PGP PRIVATE KEY BLOCK ... '