"use strict";

exports.__esModule = true;
exports["default"] = void 0;

var _fastify = _interopRequireDefault(require("fastify"));

var _encrypt = _interopRequireDefault(require("../../../crypto-core/src/lib/encrypt.js"));

var _decrypt = _interopRequireDefault(require("../../../crypto-core/src/lib/decrypt.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

/* Taking the arguments from the command line and putting them into an array. */
var args = process.argv.slice(2);

var CryptoServer = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(data) {
    var app;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            /* Creating a new instance of the fastify server. */
            app = (0, _fastify["default"])();
            _context3.next = 3;
            return app.register(Promise.resolve().then(function () {
              return _interopRequireWildcard(require("@fastify/compress"));
            }), {
              global: true
            });

          case 3:
            console.log(process.argv);
            /* This is a route handler. It is a function that is called when a request is made
            to the server. */

            app.get("/v1/encrypt", /*#__PURE__*/function () {
              var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(request, reply) {
                var encryptedData;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        console.log(request.headers);
                        _context.next = 3;
                        return (0, _encrypt["default"])(_extends({}, request.headers));

                      case 3:
                        encryptedData = _context.sent;
                        reply.send({
                          "data": encryptedData
                        });

                      case 5:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x2, _x3) {
                return _ref2.apply(this, arguments);
              };
            }());
            app.get("/v1/decrypt", /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(request, reply) {
                var decryptedData;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return (0, _decrypt["default"])(_extends({}, request.headers));

                      case 2:
                        decryptedData = _context2.sent;
                        reply.send({
                          "data": decryptedData
                        });

                      case 4:
                      case "end":
                        return _context2.stop();
                    }
                  }
                }, _callee2);
              }));

              return function (_x4, _x5) {
                return _ref3.apply(this, arguments);
              };
            }());
            /* Telling the server to listen on port 3000. */

            app.listen(3000).then(function () {
              console.log("Server running at http://localhost:3000/");
            });

          case 7:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));

  return function CryptoServer(_x) {
    return _ref.apply(this, arguments);
  };
}();
/* Calling the function with the arguments. */


CryptoServer({
  curve: args[1],
  email: args[3],
  expiration: args[5],
  format: args[7],
  name: args[9],
  passphrase: args[11],
  sign: args[13],
  size: args[15],
  type: args[17]
});
var _default = CryptoServer;
exports["default"] = _default;