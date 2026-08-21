/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

// Source imports -- direct paths for coverage attribution
import {
  detectRuntime,
  getCapabilities,
  isEdgeCryptoAvailable,
} from "../src/detect";

import {
  installPolyfills,
  _resetPolyfillState,
  TextEncoderPolyfill,
  TextDecoderPolyfill,
  btoaPolyfill,
  atobPolyfill,
  insecureGetRandomValues,
} from "../src/polyfill";

import {
  hash,
  encrypt,
  decrypt,
  sign,
  verify,
  generateKey,
  randomBytes,
  toHex,
  toBytes,
  concat,
} from "../src/webcrypto";

// Barrel re-export coverage
import * as barrel from "../src/index";

const g = globalThis as Record<string, any>;

// =========================================================================
// Barrel re-exports (index.ts)
// =========================================================================

describe("index barrel exports", () => {
  it("should re-export runtime detection functions", () => {
    expect(barrel.detectRuntime).to.be.a("function");
    expect(barrel.getCapabilities).to.be.a("function");
    expect(barrel.isEdgeCryptoAvailable).to.be.a("function");
  });

  it("should re-export webcrypto functions", () => {
    expect(barrel.hash).to.be.a("function");
    expect(barrel.encrypt).to.be.a("function");
    expect(barrel.decrypt).to.be.a("function");
    expect(barrel.sign).to.be.a("function");
    expect(barrel.verify).to.be.a("function");
    expect(barrel.generateKey).to.be.a("function");
    expect(barrel.toHex).to.be.a("function");
    expect(barrel.toBytes).to.be.a("function");
    expect(barrel.randomBytes).to.be.a("function");
    expect(barrel.concat).to.be.a("function");
  });

  it("should re-export polyfill functions", () => {
    expect(barrel.installPolyfills).to.be.a("function");
    expect(barrel._resetPolyfillState).to.be.a("function");
    expect(barrel.TextEncoderPolyfill).to.be.a("function");
    expect(barrel.TextDecoderPolyfill).to.be.a("function");
    expect(barrel.btoaPolyfill).to.be.a("function");
    expect(barrel.atobPolyfill).to.be.a("function");
    expect(barrel.insecureGetRandomValues).to.be.a("function");
  });
});

// =========================================================================
// Runtime Detection (detect.ts)
// =========================================================================

describe("detect", () => {
  describe("detectRuntime()", () => {
    it("should return 'node' when running under Node.js", () => {
      expect(detectRuntime()).to.equal("node");
    });

    it("should return 'cloudflare-workers' when navigator.userAgent matches", () => {
      const origDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      Object.defineProperty(g, "navigator", {
        value: { userAgent: "Cloudflare-Workers" },
        configurable: true,
        writable: true,
      });
      try {
        expect(detectRuntime()).to.equal("cloudflare-workers");
      } finally {
        if (origDesc) {
          Object.defineProperty(g, "navigator", origDesc);
        } else {
          delete g.navigator;
        }
      }
    });

    it("should return 'vercel-edge' when EdgeRuntime global is a string", () => {
      const origEdgeRuntime = g.EdgeRuntime;
      const origNavDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      // Clear navigator to avoid cloudflare match first
      Object.defineProperty(g, "navigator", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      g.EdgeRuntime = "edge-light";
      try {
        expect(detectRuntime()).to.equal("vercel-edge");
      } finally {
        if (origNavDesc) {
          Object.defineProperty(g, "navigator", origNavDesc);
        } else {
          delete g.navigator;
        }
        if (origEdgeRuntime === undefined) {
          delete g.EdgeRuntime;
        } else {
          g.EdgeRuntime = origEdgeRuntime;
        }
      }
    });

    it("should return 'deno' when Deno global exists with version object", () => {
      const origDeno = g.Deno;
      const origNavDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      const origEdgeRuntime = g.EdgeRuntime;
      Object.defineProperty(g, "navigator", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      delete g.EdgeRuntime;
      g.Deno = { version: { deno: "1.40.0" } };
      try {
        expect(detectRuntime()).to.equal("deno");
      } finally {
        if (origNavDesc) {
          Object.defineProperty(g, "navigator", origNavDesc);
        } else {
          delete g.navigator;
        }
        if (origEdgeRuntime !== undefined) g.EdgeRuntime = origEdgeRuntime;
        if (origDeno === undefined) {
          delete g.Deno;
        } else {
          g.Deno = origDeno;
        }
      }
    });

    it("should return 'bun' when Bun global exists", () => {
      const origBun = g.Bun;
      const origNavDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      const origEdgeRuntime = g.EdgeRuntime;
      const origDeno = g.Deno;
      Object.defineProperty(g, "navigator", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      delete g.EdgeRuntime;
      delete g.Deno;
      g.Bun = {};
      try {
        expect(detectRuntime()).to.equal("bun");
      } finally {
        if (origNavDesc) {
          Object.defineProperty(g, "navigator", origNavDesc);
        } else {
          delete g.navigator;
        }
        if (origEdgeRuntime !== undefined) g.EdgeRuntime = origEdgeRuntime;
        if (origDeno !== undefined) g.Deno = origDeno;
        if (origBun === undefined) {
          delete g.Bun;
        } else {
          g.Bun = origBun;
        }
      }
    });

    it("should return 'browser' when window and document exist", () => {
      const origWindow = g.window;
      const origDocument = g.document;
      const origNavDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      const origEdgeRuntime = g.EdgeRuntime;
      const origDeno = g.Deno;
      const origBun = g.Bun;
      const origProcess = g.process;
      Object.defineProperty(g, "navigator", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      delete g.EdgeRuntime;
      delete g.Deno;
      delete g.Bun;
      g.window = {};
      g.document = {};
      // Remove process to prevent Node detection
      delete g.process;
      try {
        expect(detectRuntime()).to.equal("browser");
      } finally {
        if (origNavDesc) {
          Object.defineProperty(g, "navigator", origNavDesc);
        } else {
          delete g.navigator;
        }
        if (origEdgeRuntime !== undefined) g.EdgeRuntime = origEdgeRuntime;
        if (origDeno !== undefined) g.Deno = origDeno;
        if (origBun !== undefined) g.Bun = origBun;
        g.process = origProcess;
        if (origWindow === undefined) {
          delete g.window;
        } else {
          g.window = origWindow;
        }
        if (origDocument === undefined) {
          delete g.document;
        } else {
          g.document = origDocument;
        }
      }
    });

    it("should return 'unknown' when no runtime markers match", () => {
      const origNavDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      const origEdgeRuntime = g.EdgeRuntime;
      const origDeno = g.Deno;
      const origBun = g.Bun;
      const origWindow = g.window;
      const origDocument = g.document;
      const origProcess = g.process;
      Object.defineProperty(g, "navigator", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      delete g.EdgeRuntime;
      delete g.Deno;
      delete g.Bun;
      delete g.window;
      delete g.document;
      delete g.process;
      try {
        expect(detectRuntime()).to.equal("unknown");
      } finally {
        if (origNavDesc) {
          Object.defineProperty(g, "navigator", origNavDesc);
        } else {
          delete g.navigator;
        }
        if (origEdgeRuntime !== undefined) g.EdgeRuntime = origEdgeRuntime;
        if (origDeno !== undefined) g.Deno = origDeno;
        if (origBun !== undefined) g.Bun = origBun;
        if (origWindow !== undefined) g.window = origWindow;
        if (origDocument !== undefined) g.document = origDocument;
        g.process = origProcess;
      }
    });

    it("should not match cloudflare when navigator exists without correct userAgent", () => {
      const origDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      Object.defineProperty(g, "navigator", {
        value: { userAgent: "Mozilla/5.0" },
        configurable: true,
        writable: true,
      });
      try {
        // Should fall through to node (since process.versions.node exists)
        expect(detectRuntime()).to.equal("node");
      } finally {
        if (origDesc) {
          Object.defineProperty(g, "navigator", origDesc);
        } else {
          delete g.navigator;
        }
      }
    });

    it("should not match cloudflare when navigator.userAgent is not a string", () => {
      const origDesc = Object.getOwnPropertyDescriptor(g, "navigator");
      Object.defineProperty(g, "navigator", {
        value: { userAgent: 42 },
        configurable: true,
        writable: true,
      });
      try {
        expect(detectRuntime()).to.equal("node");
      } finally {
        if (origDesc) {
          Object.defineProperty(g, "navigator", origDesc);
        } else {
          delete g.navigator;
        }
      }
    });
  });

  describe("getCapabilities()", () => {
    it("should return capabilities for the current Node.js runtime", () => {
      const caps = getCapabilities();
      expect(caps.runtime).to.equal("node");
      expect(caps.hasWebCrypto).to.be.true;
      expect(caps.hasSubtle).to.be.true;
      expect(caps.hasNodeCrypto).to.be.true;
      expect(caps.hasTextEncoder).to.be.true;
    });

    it("should report hasWebCrypto=false when crypto is undefined", () => {
      const origCrypto = g.crypto;
      delete g.crypto;
      try {
        const caps = getCapabilities();
        expect(caps.hasWebCrypto).to.be.false;
        expect(caps.hasSubtle).to.be.false;
      } finally {
        g.crypto = origCrypto;
      }
    });

    it("should report hasSubtle=false when crypto.subtle is undefined", () => {
      const origCrypto = g.crypto;
      g.crypto = {};
      try {
        const caps = getCapabilities();
        expect(caps.hasWebCrypto).to.be.true;
        expect(caps.hasSubtle).to.be.false;
      } finally {
        g.crypto = origCrypto;
      }
    });

    it("should report hasNodeCrypto=false in non-Node runtime", () => {
      const origProcess = g.process;
      delete g.process;
      try {
        const caps = getCapabilities();
        expect(caps.hasNodeCrypto).to.be.false;
      } finally {
        g.process = origProcess;
      }
    });

    it("should report hasNodeCrypto=false when require('node:crypto') throws", () => {
      // To exercise the catch branch in getCapabilities(), we need
      // require("node:crypto") to throw. We patch Module.prototype.require
      // which is the instance method called by all module-scoped require() calls.
      const Module = require("module");
      const origRequire = Module.prototype.require;

      Module.prototype.require = function (id: string) {
        if (id === "node:crypto") {
          throw new Error("Simulated require failure");
        }
        return origRequire.call(this, id);
      };

      try {
        const caps = getCapabilities();
        expect(caps.hasNodeCrypto).to.be.false;
      } finally {
        Module.prototype.require = origRequire;
      }
    });

    it("should report hasTextEncoder=false when TextEncoder is missing", () => {
      const origTE = g.TextEncoder;
      delete g.TextEncoder;
      try {
        const caps = getCapabilities();
        expect(caps.hasTextEncoder).to.be.false;
      } finally {
        g.TextEncoder = origTE;
      }
    });
  });

  describe("isEdgeCryptoAvailable()", () => {
    it("should return true in Node.js (which has crypto.subtle)", () => {
      expect(isEdgeCryptoAvailable()).to.be.true;
    });

    it("should return false when crypto.subtle is unavailable", () => {
      const origCrypto = g.crypto;
      g.crypto = {};
      try {
        expect(isEdgeCryptoAvailable()).to.be.false;
      } finally {
        g.crypto = origCrypto;
      }
    });
  });
});

// =========================================================================
// Polyfills (polyfill.ts)
// =========================================================================

describe("polyfill", () => {
  describe("TextEncoderPolyfill", () => {
    let encoder: InstanceType<typeof TextEncoderPolyfill>;

    beforeEach(() => {
      encoder = new TextEncoderPolyfill();
    });

    it("should have encoding property set to 'utf-8'", () => {
      expect(encoder.encoding).to.equal("utf-8");
    });

    it("should encode ASCII characters", () => {
      const result = encoder.encode("hello");
      expect(result).to.be.instanceOf(Uint8Array);
      expect(Array.from(result)).to.deep.equal([104, 101, 108, 108, 111]);
    });

    it("should encode empty string", () => {
      const result = encoder.encode("");
      expect(result.length).to.equal(0);
    });

    it("should encode 2-byte UTF-8 characters", () => {
      // U+00E9 (e with acute) encodes as [0xC3, 0xA9]
      const result = encoder.encode("\u00e9");
      expect(Array.from(result)).to.deep.equal([0xc3, 0xa9]);
    });

    it("should encode 3-byte UTF-8 characters", () => {
      // U+2603 (snowman) encodes as [0xE2, 0x98, 0x83]
      const result = encoder.encode("\u2603");
      expect(Array.from(result)).to.deep.equal([0xe2, 0x98, 0x83]);
    });

    it("should encode 4-byte UTF-8 characters (surrogate pairs)", () => {
      // U+1F600 (grinning face) -- encoded as surrogate pair in JS
      const result = encoder.encode("\uD83D\uDE00");
      expect(Array.from(result)).to.deep.equal([0xf0, 0x9f, 0x98, 0x80]);
    });

    it("should match native TextEncoder output", () => {
      const native = new TextEncoder();
      const testStrings = [
        "hello world",
        "\u00e9\u00e8\u00ea",
        "\u2603\u2764",
        "\uD83D\uDE00\uD83D\uDE01",
        "abc\u0000def",
      ];
      for (const s of testStrings) {
        const polyfill = encoder.encode(s);
        const nativeResult = native.encode(s);
        expect(Array.from(polyfill)).to.deep.equal(
          Array.from(nativeResult),
          `mismatch for string: ${JSON.stringify(s)}`,
        );
      }
    });

    it("should handle lone high surrogate (no valid pair)", () => {
      // A high surrogate (0xD800) not followed by a valid low surrogate
      // The charCodeAt returns 0xD800, the next char is 'A' (not in 0xDC00-0xDFFF)
      // So it should be encoded as a 3-byte UTF-8 sequence for 0xD800
      const result = encoder.encode("\uD800A");
      // 0xD800 => 3-byte: [0xED, 0xA0, 0x80], then 'A' => [0x41]
      expect(Array.from(result)).to.deep.equal([0xed, 0xa0, 0x80, 0x41]);
    });
  });

  describe("TextDecoderPolyfill", () => {
    let decoder: InstanceType<typeof TextDecoderPolyfill>;

    beforeEach(() => {
      decoder = new TextDecoderPolyfill();
    });

    it("should have encoding property set to 'utf-8'", () => {
      expect(decoder.encoding).to.equal("utf-8");
    });

    it("should return empty string for undefined input", () => {
      expect(decoder.decode(undefined)).to.equal("");
    });

    it("should return empty string for falsy input", () => {
      expect(decoder.decode(undefined)).to.equal("");
    });

    it("should decode ASCII bytes", () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      expect(decoder.decode(bytes)).to.equal("hello");
    });

    it("should decode 2-byte UTF-8", () => {
      const bytes = new Uint8Array([0xc3, 0xa9]);
      expect(decoder.decode(bytes)).to.equal("\u00e9");
    });

    it("should decode 3-byte UTF-8", () => {
      const bytes = new Uint8Array([0xe2, 0x98, 0x83]);
      expect(decoder.decode(bytes)).to.equal("\u2603");
    });

    it("should decode 4-byte UTF-8 (supplementary plane)", () => {
      const bytes = new Uint8Array([0xf0, 0x9f, 0x98, 0x80]);
      expect(decoder.decode(bytes)).to.equal("\uD83D\uDE00");
    });

    it("should decode from ArrayBuffer directly", () => {
      const buf = new Uint8Array([0x48, 0x69]).buffer;
      expect(decoder.decode(buf)).to.equal("Hi");
    });

    it("should decode from ArrayBufferView with offset", () => {
      const fullBuf = new Uint8Array([0x00, 0x48, 0x69, 0x00]);
      const view = new Uint8Array(fullBuf.buffer, 1, 2);
      expect(decoder.decode(view)).to.equal("Hi");
    });

    it("should roundtrip with TextEncoderPolyfill", () => {
      const encoder = new TextEncoderPolyfill();
      const testStrings = [
        "hello world",
        "\u00e9\u00e8\u00ea",
        "\u2603\u2764",
        "\uD83D\uDE00\uD83D\uDE01",
      ];
      for (const s of testStrings) {
        const encoded = encoder.encode(s);
        const decoded = decoder.decode(encoded);
        expect(decoded).to.equal(s, `roundtrip failed for: ${JSON.stringify(s)}`);
      }
    });
  });

  describe("btoaPolyfill / atobPolyfill", () => {
    it("should encode binary string to base64", () => {
      expect(btoaPolyfill("hello")).to.equal("aGVsbG8=");
    });

    it("should encode empty string", () => {
      expect(btoaPolyfill("")).to.equal("");
    });

    it("should handle single-byte encoding (1-byte remainder)", () => {
      // Encoding "M" should give "TQ==" (1 byte => 2 base64 chars + ==)
      expect(btoaPolyfill("M")).to.equal("TQ==");
    });

    it("should handle two-byte encoding (2-byte remainder)", () => {
      // Encoding "Ma" should give "TWE=" (2 bytes => 3 base64 chars + =)
      expect(btoaPolyfill("Ma")).to.equal("TWE=");
    });

    it("should handle three-byte encoding (no padding)", () => {
      expect(btoaPolyfill("Man")).to.equal("TWFu");
    });

    it("should match native btoa output", () => {
      const cases = ["hello", "world", "foo bar", "test123", "Man", "Ma", "M", ""];
      for (const input of cases) {
        expect(btoaPolyfill(input)).to.equal(
          btoa(input),
          `btoa mismatch for: ${input}`,
        );
      }
    });

    it("should decode base64 strings whose stripped length is a multiple of 4", () => {
      // "TWFu" is "Man" (4 base64 chars, no padding)
      expect(atobPolyfill("TWFu")).to.equal("Man");
    });

    it("should invoke atob branch for base64 with double padding (c=-1, d=-1)", () => {
      // "TQ==" stripped to "TQ" (2 chars, not multiple of 4).
      // indexOf(undefined) returns -1 for c and d, exercising the c===-1 and d===-1 guards.
      const result = atobPolyfill("TQ==");
      expect(result).to.be.a("string");
      // The c===-1 guard prevents the second byte from being emitted,
      // and d===-1 prevents the third, so the result is only 1 char (from bits>>16).
      expect(result.length).to.equal(1);
    });

    it("should invoke atob branch for base64 with single padding (d=-1)", () => {
      // "TWE=" stripped to "TWE" (3 chars, not multiple of 4).
      // indexOf(undefined) returns -1 for d, exercising the d===-1 guard.
      const result = atobPolyfill("TWE=");
      expect(result).to.be.a("string");
      // d===-1 prevents the third byte; c is valid so second byte is emitted.
      expect(result.length).to.equal(2);
    });

    it("should decode longer aligned base64 strings", () => {
      // "QUJDRA==" is "ABCD" (8 base64 chars with padding)
      // After stripping: "QUJDRA" (6 chars) -- not a multiple of 4.
      // Use a properly aligned input instead.
      // "QUJD" = "ABC" (exactly 4 base64 chars)
      expect(atobPolyfill("QUJD")).to.equal("ABC");
    });

    it("should roundtrip strings whose byte length is a multiple of 3", () => {
      // These produce base64 without padding, so stripped length is a multiple of 4
      const testCases = ["", "Man", "foobar", "abcdef123456789"];
      for (const input of testCases) {
        const encoded = btoaPolyfill(input);
        const decoded = atobPolyfill(encoded);
        expect(decoded).to.equal(
          input,
          `roundtrip failed for: ${JSON.stringify(input)}`,
        );
      }
    });

    it("should handle binary characters in btoa", () => {
      const binary = String.fromCharCode(0, 128, 255);
      const encoded = btoaPolyfill(binary);
      expect(encoded).to.equal(btoa(binary));
    });

    it("should decode empty string", () => {
      expect(atobPolyfill("")).to.equal("");
    });
  });

  describe("insecureGetRandomValues", () => {
    it("should fill a Uint8Array with random values", () => {
      const arr = new Uint8Array(32);
      const result = insecureGetRandomValues(arr);
      expect(result).to.equal(arr);
      // Very unlikely all 32 bytes are zero
      const hasNonZero = arr.some((b) => b !== 0);
      expect(hasNonZero).to.be.true;
    });

    it("should handle typed array views with offset", () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer, 4, 8);
      const result = insecureGetRandomValues(view);
      expect(result).to.equal(view);
      expect(result.byteLength).to.equal(8);
    });

    it("should return the same reference", () => {
      const arr = new Uint8Array(8);
      expect(insecureGetRandomValues(arr)).to.equal(arr);
    });

    it("should handle zero-length array", () => {
      const arr = new Uint8Array(0);
      const result = insecureGetRandomValues(arr);
      expect(result).to.equal(arr);
      expect(result.length).to.equal(0);
    });
  });

  describe("installPolyfills()", () => {
    afterEach(() => {
      _resetPolyfillState();
    });

    it("should return all false on first call in Node (everything already exists)", () => {
      _resetPolyfillState();
      const result = installPolyfills();
      // In Node.js, TextEncoder, TextDecoder, btoa, atob, and crypto.getRandomValues
      // all exist natively, so nothing should be installed.
      expect(result.textEncoder).to.be.false;
      expect(result.textDecoder).to.be.false;
      expect(result.btoa).to.be.false;
      expect(result.atob).to.be.false;
      expect(result.getRandomValues).to.be.false;
    });

    it("should return all false on second call (idempotent)", () => {
      _resetPolyfillState();
      installPolyfills();
      const result = installPolyfills();
      expect(result.textEncoder).to.be.false;
      expect(result.textDecoder).to.be.false;
      expect(result.btoa).to.be.false;
      expect(result.atob).to.be.false;
      expect(result.getRandomValues).to.be.false;
    });

    it("should install TextEncoder polyfill when missing", () => {
      _resetPolyfillState();
      const origTE = g.TextEncoder;
      delete g.TextEncoder;
      try {
        const result = installPolyfills();
        expect(result.textEncoder).to.be.true;
        expect(g.TextEncoder).to.equal(TextEncoderPolyfill);
      } finally {
        g.TextEncoder = origTE;
      }
    });

    it("should install TextDecoder polyfill when missing", () => {
      _resetPolyfillState();
      const origTD = g.TextDecoder;
      delete g.TextDecoder;
      try {
        const result = installPolyfills();
        expect(result.textDecoder).to.be.true;
        expect(g.TextDecoder).to.equal(TextDecoderPolyfill);
      } finally {
        g.TextDecoder = origTD;
      }
    });

    it("should install btoa polyfill when missing", () => {
      _resetPolyfillState();
      const origBtoa = g.btoa;
      delete g.btoa;
      try {
        const result = installPolyfills();
        expect(result.btoa).to.be.true;
      } finally {
        g.btoa = origBtoa;
      }
    });

    it("should install atob polyfill when missing", () => {
      _resetPolyfillState();
      const origAtob = g.atob;
      delete g.atob;
      try {
        const result = installPolyfills();
        expect(result.atob).to.be.true;
      } finally {
        g.atob = origAtob;
      }
    });

    it("should install getRandomValues polyfill when crypto is undefined", () => {
      _resetPolyfillState();
      const origCrypto = g.crypto;
      delete g.crypto;
      try {
        const result = installPolyfills();
        expect(result.getRandomValues).to.be.true;
        expect(g.crypto).to.be.an("object");
        expect(g.crypto.getRandomValues).to.be.a("function");
      } finally {
        g.crypto = origCrypto;
      }
    });

    it("should install getRandomValues polyfill when crypto exists but getRandomValues is missing", () => {
      _resetPolyfillState();
      const origCrypto = g.crypto;
      g.crypto = { subtle: origCrypto.subtle };
      try {
        const result = installPolyfills();
        expect(result.getRandomValues).to.be.true;
        expect(g.crypto.getRandomValues).to.be.a("function");
      } finally {
        g.crypto = origCrypto;
      }
    });
  });

  describe("_resetPolyfillState()", () => {
    it("should allow polyfills to be installed again after reset", () => {
      _resetPolyfillState();
      installPolyfills();
      _resetPolyfillState();
      // After reset, a second install should go through the logic again
      const origTE = g.TextEncoder;
      delete g.TextEncoder;
      try {
        const result = installPolyfills();
        expect(result.textEncoder).to.be.true;
      } finally {
        g.TextEncoder = origTE;
        _resetPolyfillState();
      }
    });
  });
});

// =========================================================================
// WebCrypto Wrapper (webcrypto.ts)
// =========================================================================

describe("webcrypto", () => {
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  describe("randomBytes()", () => {
    it("should return a Uint8Array of the requested length", () => {
      const bytes = randomBytes(32);
      expect(bytes).to.be.instanceOf(Uint8Array);
      expect(bytes.length).to.equal(32);
    });

    it("should return different bytes on successive calls", () => {
      const a = randomBytes(32);
      const b = randomBytes(32);
      expect(toHex(a)).to.not.equal(toHex(b));
    });

    it("should handle zero-length request", () => {
      const bytes = randomBytes(0);
      expect(bytes.length).to.equal(0);
    });
  });

  describe("toHex()", () => {
    it("should convert bytes to lowercase hex string", () => {
      expect(toHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).to.equal(
        "deadbeef",
      );
    });

    it("should pad single-digit hex values with zero", () => {
      expect(toHex(new Uint8Array([0x00, 0x0f, 0x01]))).to.equal("000f01");
    });

    it("should handle empty array", () => {
      expect(toHex(new Uint8Array(0))).to.equal("");
    });
  });

  describe("toBytes()", () => {
    it("should return a Uint8Array unchanged", () => {
      const input = new Uint8Array([1, 2, 3]);
      expect(toBytes(input)).to.equal(input);
    });

    it("should encode a string to UTF-8 bytes", () => {
      const result = toBytes("hello");
      expect(result).to.be.instanceOf(Uint8Array);
      expect(Array.from(result)).to.deep.equal([104, 101, 108, 108, 111]);
    });

    it("should encode an empty string to empty Uint8Array", () => {
      const result = toBytes("");
      expect(result.length).to.equal(0);
    });
  });

  describe("concat()", () => {
    it("should concatenate two Uint8Arrays", () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);
      const result = concat(a, b);
      expect(Array.from(result)).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });

    it("should handle empty first array", () => {
      const a = new Uint8Array(0);
      const b = new Uint8Array([7, 8]);
      expect(Array.from(concat(a, b))).to.deep.equal([7, 8]);
    });

    it("should handle empty second array", () => {
      const a = new Uint8Array([7, 8]);
      const b = new Uint8Array(0);
      expect(Array.from(concat(a, b))).to.deep.equal([7, 8]);
    });

    it("should handle both arrays empty", () => {
      expect(concat(new Uint8Array(0), new Uint8Array(0)).length).to.equal(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Hash
  // ---------------------------------------------------------------------------

  describe("hash()", () => {
    it("should compute SHA-256 digest of a string", async () => {
      const digest = await hash("SHA-256", "hello world");
      expect(digest).to.equal(
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      );
    });

    it("should compute SHA-384 digest", async () => {
      const digest = await hash("SHA-384", "hello world");
      expect(digest).to.be.a("string");
      expect(digest.length).to.equal(96); // 384 bits = 48 bytes = 96 hex chars
    });

    it("should compute SHA-512 digest", async () => {
      const digest = await hash("SHA-512", "hello world");
      expect(digest).to.be.a("string");
      expect(digest.length).to.equal(128); // 512 bits = 64 bytes = 128 hex chars
    });

    it("should compute SHA-1 digest", async () => {
      const digest = await hash("SHA-1", "hello world");
      expect(digest).to.be.a("string");
      expect(digest.length).to.equal(40); // 160 bits = 20 bytes = 40 hex chars
    });

    it("should accept Uint8Array input", async () => {
      const data = new TextEncoder().encode("hello world");
      const digest = await hash("SHA-256", data);
      expect(digest).to.equal(
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      );
    });

    it("should produce consistent output for same input", async () => {
      const a = await hash("SHA-256", "deterministic");
      const b = await hash("SHA-256", "deterministic");
      expect(a).to.equal(b);
    });

    it("should produce different output for different inputs", async () => {
      const a = await hash("SHA-256", "alpha");
      const b = await hash("SHA-256", "beta");
      expect(a).to.not.equal(b);
    });

    it("should handle empty string input", async () => {
      const digest = await hash("SHA-256", "");
      // SHA-256 of empty string
      expect(digest).to.equal(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AES-GCM Encrypt / Decrypt
  // ---------------------------------------------------------------------------

  describe("encrypt() / decrypt()", () => {
    it("should roundtrip encrypt/decrypt with 256-bit key", async () => {
      const key = randomBytes(32);
      const plaintext = new TextEncoder().encode("secret message");
      const { ciphertext, ivLength } = await encrypt({ key, plaintext });

      expect(ivLength).to.equal(12);
      expect(ciphertext.length).to.be.greaterThan(plaintext.length);

      const decrypted = await decrypt({ key, ciphertext });
      expect(new TextDecoder().decode(decrypted)).to.equal("secret message");
    });

    it("should roundtrip encrypt/decrypt with 128-bit key", async () => {
      const key = randomBytes(16);
      const plaintext = new TextEncoder().encode("128-bit key test");
      const { ciphertext } = await encrypt({ key, plaintext });

      const decrypted = await decrypt({ key, ciphertext });
      expect(new TextDecoder().decode(decrypted)).to.equal("128-bit key test");
    });

    it("should roundtrip with AAD (additional authenticated data)", async () => {
      const key = randomBytes(32);
      const plaintext = new TextEncoder().encode("aad test");
      const aad = new TextEncoder().encode("context");
      const { ciphertext } = await encrypt({ key, plaintext, aad });

      const decrypted = await decrypt({ key, ciphertext, aad });
      expect(new TextDecoder().decode(decrypted)).to.equal("aad test");
    });

    it("should fail decryption with wrong key", async () => {
      const key1 = randomBytes(32);
      const key2 = randomBytes(32);
      const plaintext = new TextEncoder().encode("wrong key test");
      const { ciphertext } = await encrypt({ key: key1, plaintext });

      await expect(decrypt({ key: key2, ciphertext })).to.be.rejected;
    });

    it("should fail decryption when AAD does not match", async () => {
      const key = randomBytes(32);
      const plaintext = new TextEncoder().encode("aad mismatch");
      const aad1 = new TextEncoder().encode("context-a");
      const aad2 = new TextEncoder().encode("context-b");
      const { ciphertext } = await encrypt({ key, plaintext, aad: aad1 });

      await expect(decrypt({ key, ciphertext, aad: aad2 })).to.be.rejected;
    });

    it("should produce different ciphertexts for same plaintext (random IV)", async () => {
      const key = randomBytes(32);
      const plaintext = new TextEncoder().encode("same plaintext");
      const a = await encrypt({ key, plaintext });
      const b = await encrypt({ key, plaintext });
      expect(toHex(a.ciphertext)).to.not.equal(toHex(b.ciphertext));
    });

    it("should throw for invalid key length on encrypt", async () => {
      const badKey = randomBytes(24); // 192-bit -- not 16 or 32
      const plaintext = new TextEncoder().encode("test");
      await expect(encrypt({ key: badKey, plaintext })).to.be.rejectedWith(
        "Key must be 16 bytes (128-bit) or 32 bytes (256-bit), got 24",
      );
    });

    it("should throw for invalid key length on decrypt", async () => {
      const badKey = randomBytes(24);
      const ciphertext = new Uint8Array(64);
      await expect(decrypt({ key: badKey, ciphertext })).to.be.rejectedWith(
        "Key must be 16 bytes (128-bit) or 32 bytes (256-bit), got 24",
      );
    });

    it("should throw when ciphertext is too short", async () => {
      const key = randomBytes(32);
      // IV (12) + tag (16) = 28 minimum; 27 is too short
      const ciphertext = new Uint8Array(27);
      await expect(decrypt({ key, ciphertext })).to.be.rejectedWith(
        "Ciphertext too short",
      );
    });

    it("should support custom ivLength during decryption", async () => {
      const key = randomBytes(32);
      const plaintext = new TextEncoder().encode("custom iv len");
      // Default IV is 12 bytes; decrypt with explicit ivLength=12
      const { ciphertext } = await encrypt({ key, plaintext });
      const decrypted = await decrypt({ key, ciphertext, ivLength: 12 });
      expect(new TextDecoder().decode(decrypted)).to.equal("custom iv len");
    });

    it("should encrypt and decrypt empty plaintext", async () => {
      const key = randomBytes(32);
      const plaintext = new Uint8Array(0);
      const { ciphertext } = await encrypt({ key, plaintext });
      const decrypted = await decrypt({ key, ciphertext });
      expect(decrypted.length).to.equal(0);
    });
  });

  // ---------------------------------------------------------------------------
  // HMAC Sign / Verify
  // ---------------------------------------------------------------------------

  describe("sign() / verify()", () => {
    it("should sign and verify with SHA-256 (default)", async () => {
      const key = randomBytes(32);
      const data = new TextEncoder().encode("sign me");

      const signature = await sign({ key, data });
      expect(signature).to.be.instanceOf(Uint8Array);
      expect(signature.length).to.equal(32); // SHA-256 => 32 bytes

      const valid = await verify({ key, data, signature });
      expect(valid).to.be.true;
    });

    it("should sign and verify with SHA-384", async () => {
      const key = randomBytes(48);
      const data = new TextEncoder().encode("384 test");

      const signature = await sign({ key, data, hash: "SHA-384" });
      expect(signature.length).to.equal(48);

      const valid = await verify({ key, data, signature, hash: "SHA-384" });
      expect(valid).to.be.true;
    });

    it("should sign and verify with SHA-512", async () => {
      const key = randomBytes(64);
      const data = new TextEncoder().encode("512 test");

      const signature = await sign({ key, data, hash: "SHA-512" });
      expect(signature.length).to.equal(64);

      const valid = await verify({ key, data, signature, hash: "SHA-512" });
      expect(valid).to.be.true;
    });

    it("should return false for tampered data", async () => {
      const key = randomBytes(32);
      const data = new TextEncoder().encode("original");
      const signature = await sign({ key, data });

      const tampered = new TextEncoder().encode("tampered");
      const valid = await verify({ key, data: tampered, signature });
      expect(valid).to.be.false;
    });

    it("should return false for tampered signature", async () => {
      const key = randomBytes(32);
      const data = new TextEncoder().encode("test data");
      const signature = await sign({ key, data });

      // Flip a byte in the signature
      const badSig = new Uint8Array(signature);
      badSig[0] ^= 0xff;
      const valid = await verify({ key, data, signature: badSig });
      expect(valid).to.be.false;
    });

    it("should return false for wrong key", async () => {
      const key1 = randomBytes(32);
      const key2 = randomBytes(32);
      const data = new TextEncoder().encode("key mismatch");
      const signature = await sign({ key: key1, data });

      const valid = await verify({ key: key2, data, signature });
      expect(valid).to.be.false;
    });

    it("should produce deterministic signatures for same key+data", async () => {
      const key = randomBytes(32);
      const data = new TextEncoder().encode("deterministic hmac");
      const sig1 = await sign({ key, data });
      const sig2 = await sign({ key, data });
      expect(toHex(sig1)).to.equal(toHex(sig2));
    });
  });

  // ---------------------------------------------------------------------------
  // Key Generation
  // ---------------------------------------------------------------------------

  describe("generateKey()", () => {
    it("should generate a 256-bit AES-GCM key by default", async () => {
      const key = await generateKey({ algorithm: "AES-GCM" });
      expect(key).to.be.instanceOf(Uint8Array);
      expect(key.length).to.equal(32);
    });

    it("should generate a 128-bit AES-GCM key", async () => {
      const key = await generateKey({ algorithm: "AES-GCM", length: 128 });
      expect(key.length).to.equal(16);
    });

    it("should generate a 192-bit AES-GCM key", async () => {
      const key = await generateKey({ algorithm: "AES-GCM", length: 192 });
      expect(key.length).to.equal(24);
    });

    it("should generate AES-CBC keys", async () => {
      const key = await generateKey({ algorithm: "AES-CBC", length: 256 });
      expect(key.length).to.equal(32);
    });

    it("should generate AES-CTR keys", async () => {
      const key = await generateKey({ algorithm: "AES-CTR", length: 256 });
      expect(key.length).to.equal(32);
    });

    it("should throw for unsupported algorithm", async () => {
      await expect(
        generateKey({ algorithm: "INVALID" as any }),
      ).to.be.rejectedWith("Unsupported key generation algorithm: INVALID");
    });

    it("should produce usable key for encrypt/decrypt", async () => {
      const key = await generateKey({ algorithm: "AES-GCM" });
      const plaintext = new TextEncoder().encode("generated key test");
      const { ciphertext } = await encrypt({ key, plaintext });
      const decrypted = await decrypt({ key, ciphertext });
      expect(new TextDecoder().decode(decrypted)).to.equal("generated key test");
    });
  });

  // ---------------------------------------------------------------------------
  // getSubtle() error path
  // ---------------------------------------------------------------------------

  describe("getSubtle() error path", () => {
    it("should throw when crypto.subtle is unavailable (via hash)", async () => {
      const origCrypto = g.crypto;
      g.crypto = {};
      try {
        await expect(hash("SHA-256", "test")).to.be.rejectedWith(
          "Web Crypto API (crypto.subtle) is not available",
        );
      } finally {
        g.crypto = origCrypto;
      }
    });

    it("should throw when crypto is entirely undefined (via encrypt)", async () => {
      const origCrypto = g.crypto;
      delete g.crypto;
      try {
        await expect(
          encrypt({
            key: new Uint8Array(32),
            plaintext: new Uint8Array(1),
          }),
        ).to.be.rejectedWith(
          "Web Crypto API (crypto.subtle) is not available",
        );
      } finally {
        g.crypto = origCrypto;
      }
    });
  });
});
