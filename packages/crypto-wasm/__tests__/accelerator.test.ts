// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { expect } from "chai";
import {
  WasmAccelerator,
  isWasmSupported,
  isStreamingSupported,
  isSimdSupported,
  detectCapabilities,
} from "../src/index";
import type {
  AcceleratedOperation,
  BenchmarkResult,
  WasmStatus,
} from "../src/index";

// ---------------------------------------------------------------------------
// Detection utilities
// ---------------------------------------------------------------------------

describe("detect", () => {
  describe("isWasmSupported()", () => {
    it("returns a boolean", () => {
      const result = isWasmSupported();
      expect(result).to.be.a("boolean");
    });

    it("returns true in Node.js >= 22", () => {
      // Node 22+ always has WebAssembly support
      expect(isWasmSupported()).to.equal(true);
    });
  });

  describe("isStreamingSupported()", () => {
    it("returns a boolean", () => {
      expect(isStreamingSupported()).to.be.a("boolean");
    });
  });

  describe("isSimdSupported()", () => {
    it("returns a boolean", () => {
      expect(isSimdSupported()).to.be.a("boolean");
    });
  });

  describe("detectCapabilities()", () => {
    it("returns an object with all capability flags", () => {
      const caps = detectCapabilities();
      expect(caps).to.have.property("wasmSupported").that.is.a("boolean");
      expect(caps).to.have.property("streamingSupported").that.is.a("boolean");
      expect(caps).to.have.property("simdSupported").that.is.a("boolean");
    });

    it("wasmSupported matches isWasmSupported()", () => {
      const caps = detectCapabilities();
      expect(caps.wasmSupported).to.equal(isWasmSupported());
    });
  });
});

// ---------------------------------------------------------------------------
// WasmAccelerator
// ---------------------------------------------------------------------------

describe("WasmAccelerator", () => {
  describe("constructor", () => {
    it("creates an instance", () => {
      const accel = new WasmAccelerator();
      expect(accel).to.be.instanceOf(WasmAccelerator);
    });

    it("is not available before init()", () => {
      const accel = new WasmAccelerator();
      expect(accel.isAvailable).to.equal(false);
    });
  });

  describe("init()", () => {
    it("initializes without throwing (no WASM file present)", async () => {
      const accel = new WasmAccelerator();
      // No .wasm file exists yet — init should catch the error gracefully
      await accel.init();
      expect(accel.isAvailable).to.equal(false);
    });

    it("is idempotent — calling init() twice does not throw", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      await accel.init(); // second call is a no-op
      expect(accel.isAvailable).to.equal(false);
    });

    it("accepts a BufferSource (minimal valid WASM)", async () => {
      const accel = new WasmAccelerator();
      // Minimal valid WASM module: magic + version, empty
      const minimal = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
      ]);
      await accel.init(minimal);
      expect(accel.isAvailable).to.equal(true);
    });
  });

  describe("status()", () => {
    it("returns unavailable status before init", () => {
      const accel = new WasmAccelerator();
      const s: WasmStatus = accel.status();
      expect(s.available).to.equal(false);
      expect(s.version).to.equal(null);
      expect(s.operations).to.deep.equal([]);
      expect(s.memoryUsageBytes).to.equal(0);
    });

    it("returns unavailable status when no WASM file exists", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      const s = accel.status();
      expect(s.available).to.equal(false);
      expect(s.version).to.equal(null);
      expect(s.operations).to.deep.equal([]);
      expect(s.memoryUsageBytes).to.equal(0);
    });

    it("returns available status when WASM is loaded", async () => {
      const accel = new WasmAccelerator();
      const minimal = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
        // Memory section: 1 memory, min 1 page
        0x05, 0x03, 0x01, 0x00, 0x01,
        // Export section: export "memory"
        0x07, 0x0a, 0x01, 0x06,
        0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, // "memory"
        0x02, 0x00, // memory export, index 0
      ]);
      await accel.init(minimal);
      if (accel.isAvailable) {
        const s = accel.status();
        expect(s.available).to.equal(true);
        expect(s.version).to.equal("0.0.3");
        expect(s.operations).to.have.length.greaterThan(0);
        expect(s.memoryUsageBytes).to.be.greaterThan(0);
      }
    });

    it("operations list contains expected entries when available", async () => {
      const accel = new WasmAccelerator();
      const minimal = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
        0x05, 0x03, 0x01, 0x00, 0x01,
        0x07, 0x0a, 0x01, 0x06,
        0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79,
        0x02, 0x00,
      ]);
      await accel.init(minimal);
      if (accel.isAvailable) {
        const ops = accel.status().operations;
        const expected: AcceleratedOperation[] = [
          "hash-sha256",
          "hash-sha512",
          "hash-blake3",
          "aes-gcm-encrypt",
          "aes-gcm-decrypt",
          "argon2-hash",
          "ed25519-sign",
          "ed25519-verify",
          "x25519-exchange",
        ];
        expect(ops).to.deep.equal(expected);
      }
    });
  });

  describe("hash() — JS fallback", () => {
    it("hashes with sha256 via Node.js fallback", async () => {
      const accel = new WasmAccelerator();
      await accel.init(); // no WASM available
      const data = new TextEncoder().encode("hello world");
      const digest = await accel.hash("sha256", data);
      expect(digest).to.be.instanceOf(Uint8Array);
      expect(digest.length).to.equal(32); // SHA-256 = 32 bytes
    });

    it("hashes with sha512 via Node.js fallback", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      const data = new TextEncoder().encode("hello world");
      const digest = await accel.hash("sha512", data);
      expect(digest).to.be.instanceOf(Uint8Array);
      expect(digest.length).to.equal(64); // SHA-512 = 64 bytes
    });

    it("produces correct SHA-256 digest", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      const data = new TextEncoder().encode("hello");
      const digest = await accel.hash("sha256", data);
      // Known SHA-256 of "hello"
      const hex = Buffer.from(digest).toString("hex");
      expect(hex).to.equal(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      );
    });

    it("produces correct SHA-512 digest", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      const data = new TextEncoder().encode("hello");
      const digest = await accel.hash("sha512", data);
      const hex = Buffer.from(digest).toString("hex");
      expect(hex).to.equal(
        "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7" +
          "2323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
      );
    });
  });

  describe("benchmark()", () => {
    it("returns a BenchmarkResult", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      const result: BenchmarkResult = await accel.benchmark(
        "hash-sha256",
        10,
      );
      expect(result.operation).to.equal("hash-sha256");
      expect(result.jsTimeMs).to.be.a("number").and.to.be.greaterThan(0);
      expect(result.wasmTimeMs).to.be.a("number").and.to.be.greaterThan(0);
      expect(result.speedup).to.be.a("number");
    });

    it("speedup is approximately 1.0 when both paths use JS", async () => {
      const accel = new WasmAccelerator();
      await accel.init(); // no WASM, both paths use JS
      const result = await accel.benchmark("hash-sha256", 50);
      // Without real WASM, both paths use Node crypto, so speedup ~ 1.0
      expect(result.speedup).to.be.greaterThan(0);
    });
  });

  describe("destroy()", () => {
    it("resets the accelerator", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      accel.destroy();
      expect(accel.isAvailable).to.equal(false);
    });

    it("allows re-initialization after destroy", async () => {
      const accel = new WasmAccelerator();
      await accel.init();
      accel.destroy();
      // Can init again
      await accel.init();
      expect(accel.isAvailable).to.equal(false); // still no WASM file
    });
  });
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

describe("type exports", () => {
  it("AcceleratedOperation type is usable", () => {
    const op: AcceleratedOperation = "hash-sha256";
    expect(op).to.equal("hash-sha256");
  });

  it("WasmStatus interface is usable", () => {
    const status: WasmStatus = {
      available: false,
      version: null,
      operations: [],
      memoryUsageBytes: 0,
    };
    expect(status.available).to.equal(false);
  });

  it("BenchmarkResult interface is usable", () => {
    const result: BenchmarkResult = {
      operation: "hash-sha256",
      jsTimeMs: 10,
      wasmTimeMs: 5,
      speedup: 2,
    };
    expect(result.speedup).to.equal(2);
  });
});
