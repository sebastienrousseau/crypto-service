import { expect } from "chai";
import { v4local, v4public, pae } from "../../src/tokens/paseto";
import { ed25519 } from "@noble/curves/ed25519.js";

describe("PASETO v4", () => {
  // --- v4.local ---

  describe("v4.local", () => {
    const key = "aa".repeat(32); // 256-bit symmetric key

    it("should encrypt and decrypt round-trip", () => {
      const payload = { sub: "user1", exp: "2030-01-01T00:00:00Z" };
      const { token } = v4local.encrypt({ key, payload });
      expect(token).to.be.a("string");
      expect(token.startsWith("v4.local.")).to.be.true;

      const { payload: decoded } = v4local.decrypt({ key, token });
      expect(decoded).to.deep.equal(payload);
    });

    it("should encrypt and decrypt with footer", () => {
      const payload = { data: "hello" };
      const footer = '{"kid":"key-1"}';
      const { token } = v4local.encrypt({ key, payload, footer });
      expect(token).to.include(".");
      // Token has 3 dot-separated parts: v4.local.<body>.<footer>
      const parts = token.split(".");
      expect(parts.length).to.equal(4); // "v4", "local", body, footer

      const { payload: decoded, footer: decodedFooter } = v4local.decrypt({
        key,
        token,
        footer,
      });
      expect(decoded).to.deep.equal(payload);
      expect(decodedFooter).to.equal(footer);
    });

    it("should encrypt and decrypt with implicit assertions", () => {
      const payload = { sub: "user2" };
      const implicit = "context-binding";
      const { token } = v4local.encrypt({ key, payload, implicit });
      const { payload: decoded } = v4local.decrypt({ key, token, implicit });
      expect(decoded).to.deep.equal(payload);
    });

    it("should fail with wrong key", () => {
      const payload = { secret: "data" };
      const { token } = v4local.encrypt({ key, payload });
      const wrongKey = "bb".repeat(32);
      expect(() => v4local.decrypt({ key: wrongKey, token })).to.throw();
    });

    it("should fail with tampered token", () => {
      const payload = { secret: "data" };
      const { token } = v4local.encrypt({ key, payload });
      // Tamper with the body (change a character in the base64url portion)
      const parts = token.split(".");
      const body = parts[2]!;
      const tampered =
        parts[0] +
        "." +
        parts[1] +
        "." +
        body.slice(0, -2) +
        (body.slice(-2) === "AA" ? "BB" : "AA");
      expect(() => v4local.decrypt({ key, token: tampered })).to.throw();
    });

    it("should fail with wrong footer", () => {
      const payload = { data: "test" };
      const { token } = v4local.encrypt({
        key,
        payload,
        footer: "correct-footer",
      });
      expect(() =>
        v4local.decrypt({ key, token, footer: "wrong-footer" }),
      ).to.throw(/Footer mismatch/);
    });

    it("should fail when footer expected but not in token", () => {
      const payload = { data: "test" };
      const { token } = v4local.encrypt({ key, payload });
      expect(() =>
        v4local.decrypt({ key, token, footer: "unexpected" }),
      ).to.throw(/Footer mismatch/);
    });

    it("should produce different tokens for same input (random nonce)", () => {
      const payload = { same: true };
      const { token: t1 } = v4local.encrypt({ key, payload });
      const { token: t2 } = v4local.encrypt({ key, payload });
      expect(t1).to.not.equal(t2);
    });

    it("should reject invalid token header", () => {
      expect(() => v4local.decrypt({ key, token: "v3.local.AAAA" })).to.throw(
        /Invalid token header/,
      );
    });

    it("should reject too-short token body", () => {
      expect(() => v4local.decrypt({ key, token: "v4.local.AAAA" })).to.throw(
        /too short/,
      );
    });

    it("should reject invalid hex key on encrypt", () => {
      expect(() =>
        v4local.encrypt({ key: "zz".repeat(32), payload: {} }),
      ).to.throw(/Invalid hex/);
    });

    it("should reject wrong-length key on encrypt", () => {
      expect(() => v4local.encrypt({ key: "aabb", payload: {} })).to.throw(
        /32 bytes/,
      );
    });

    it("should reject wrong-length key on decrypt", () => {
      expect(() =>
        v4local.decrypt({ key: "aabb", token: "v4.local.AAAA" }),
      ).to.throw(/32 bytes/);
    });

    it("should handle payload with various JSON types", () => {
      const payload = {
        str: "hello",
        num: 42,
        bool: true,
        arr: [1, 2, 3],
        nested: { a: "b" },
      };
      const { token } = v4local.encrypt({ key, payload });
      const { payload: decoded } = v4local.decrypt({ key, token });
      expect(decoded).to.deep.equal(payload);
    });

    it("should work with both footer and implicit", () => {
      const payload = { sub: "user1" };
      const footer = "my-footer";
      const implicit = "my-implicit";
      const { token } = v4local.encrypt({ key, payload, footer, implicit });
      const { payload: decoded } = v4local.decrypt({
        key,
        token,
        footer,
        implicit,
      });
      expect(decoded).to.deep.equal(payload);
    });

    it("should fail with wrong implicit assertion", () => {
      const payload = { sub: "user1" };
      const { token } = v4local.encrypt({
        key,
        payload,
        implicit: "correct",
      });
      expect(() =>
        v4local.decrypt({ key, token, implicit: "wrong" }),
      ).to.throw();
    });
  });

  // --- v4.public ---

  describe("v4.public", () => {
    // Generate a deterministic Ed25519 key pair for testing
    const seed = Buffer.from("bb".repeat(32), "hex");
    const publicKeyBytes = ed25519.getPublicKey(seed);
    // Ed25519 secret key is seed (32 bytes) + public key (32 bytes) = 64 bytes
    const secretKeyFull = new Uint8Array(64);
    secretKeyFull.set(seed);
    secretKeyFull.set(publicKeyBytes, 32);

    const secretKey = Buffer.from(secretKeyFull).toString("hex");
    const publicKey = Buffer.from(publicKeyBytes).toString("hex");

    it("should sign and verify round-trip", () => {
      const payload = { sub: "user1", iat: "2025-01-01T00:00:00Z" };
      const { token } = v4public.sign({ secretKey, payload });
      expect(token).to.be.a("string");
      expect(token.startsWith("v4.public.")).to.be.true;

      const { payload: decoded } = v4public.verify({ publicKey, token });
      expect(decoded).to.deep.equal(payload);
    });

    it("should sign and verify with footer", () => {
      const payload = { data: "public" };
      const footer = '{"kid":"key-2"}';
      const { token } = v4public.sign({ secretKey, payload, footer });

      const parts = token.split(".");
      expect(parts.length).to.equal(4); // "v4", "public", body, footer

      const { payload: decoded, footer: decodedFooter } = v4public.verify({
        publicKey,
        token,
        footer,
      });
      expect(decoded).to.deep.equal(payload);
      expect(decodedFooter).to.equal(footer);
    });

    it("should sign and verify with implicit assertions", () => {
      const payload = { sub: "user3" };
      const implicit = "audience-binding";
      const { token } = v4public.sign({ secretKey, payload, implicit });
      const { payload: decoded } = v4public.verify({
        publicKey,
        token,
        implicit,
      });
      expect(decoded).to.deep.equal(payload);
    });

    it("should fail with wrong public key", () => {
      const payload = { secret: "data" };
      const { token } = v4public.sign({ secretKey, payload });
      const wrongKey = "cc".repeat(32);
      expect(() => v4public.verify({ publicKey: wrongKey, token })).to.throw();
    });

    it("should fail with tampered token", () => {
      const payload = { data: "important" };
      const { token } = v4public.sign({ secretKey, payload });
      const parts = token.split(".");
      const body = parts[2]!;
      const tampered =
        parts[0] +
        "." +
        parts[1] +
        "." +
        body.slice(0, -2) +
        (body.slice(-2) === "AA" ? "BB" : "AA");
      expect(() => v4public.verify({ publicKey, token: tampered })).to.throw();
    });

    it("should fail with wrong footer on verify", () => {
      const payload = { data: "test" };
      const { token } = v4public.sign({
        secretKey,
        payload,
        footer: "correct-footer",
      });
      expect(() =>
        v4public.verify({ publicKey, token, footer: "wrong-footer" }),
      ).to.throw(/Footer mismatch/);
    });

    it("should fail when footer expected but not in token", () => {
      const payload = { data: "test" };
      const { token } = v4public.sign({ secretKey, payload });
      expect(() =>
        v4public.verify({ publicKey, token, footer: "unexpected" }),
      ).to.throw(/Footer mismatch/);
    });

    it("should reject invalid token header", () => {
      expect(() =>
        v4public.verify({ publicKey, token: "v3.public.AAAA" }),
      ).to.throw(/Invalid token header/);
    });

    it("should reject too-short token body", () => {
      expect(() =>
        v4public.verify({ publicKey, token: "v4.public.AAAA" }),
      ).to.throw(/too short/);
    });

    it("should accept 32-byte seed as secret key", () => {
      const seedOnly = Buffer.from(seed).toString("hex");
      const payload = { sub: "seed-user" };
      const { token } = v4public.sign({ secretKey: seedOnly, payload });

      // Derive the public key from the same seed
      const pk = Buffer.from(ed25519.getPublicKey(seed)).toString("hex");
      const { payload: decoded } = v4public.verify({ publicKey: pk, token });
      expect(decoded).to.deep.equal(payload);
    });

    it("should reject invalid hex secret key", () => {
      expect(() =>
        v4public.sign({ secretKey: "zz".repeat(32), payload: {} }),
      ).to.throw(/Invalid hex/);
    });

    it("should reject wrong-length secret key", () => {
      expect(() => v4public.sign({ secretKey: "aabb", payload: {} })).to.throw(
        /32 or 64 bytes/,
      );
    });

    it("should reject invalid hex public key", () => {
      expect(() =>
        v4public.verify({
          publicKey: "zz".repeat(32),
          token: "v4.public.AAAA",
        }),
      ).to.throw(/Invalid hex/);
    });

    it("should reject wrong-length public key", () => {
      expect(() =>
        v4public.verify({ publicKey: "aabb", token: "v4.public.AAAA" }),
      ).to.throw(/32 bytes/);
    });

    it("should produce deterministic tokens (same key + payload)", () => {
      const payload = { deterministic: true };
      const { token: t1 } = v4public.sign({ secretKey, payload });
      const { token: t2 } = v4public.sign({ secretKey, payload });
      // Ed25519 is deterministic, so same input → same signature
      expect(t1).to.equal(t2);
    });

    it("should fail with wrong implicit assertion on verify", () => {
      const payload = { sub: "user1" };
      const { token } = v4public.sign({
        secretKey,
        payload,
        implicit: "correct",
      });
      expect(() =>
        v4public.verify({ publicKey, token, implicit: "wrong" }),
      ).to.throw();
    });

    it("should work with both footer and implicit", () => {
      const payload = { sub: "user1" };
      const footer = "my-footer";
      const implicit = "my-implicit";
      const { token } = v4public.sign({
        secretKey,
        payload,
        footer,
        implicit,
      });
      const { payload: decoded } = v4public.verify({
        publicKey,
        token,
        footer,
        implicit,
      });
      expect(decoded).to.deep.equal(payload);
    });
  });

  // --- PAE ---

  describe("PAE (Pre-Authentication Encoding)", () => {
    it("should encode zero pieces", () => {
      const result = pae();
      // LE64(0) = 8 zero bytes
      expect(result.length).to.equal(8);
      expect(Array.from(result)).to.deep.equal([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it("should encode one piece", () => {
      const piece = new Uint8Array([0x01, 0x02]);
      const result = pae(piece);
      // LE64(1) + LE64(2) + [0x01, 0x02] = 8 + 8 + 2 = 18
      expect(result.length).to.equal(18);
    });

    it("should encode multiple pieces", () => {
      const a = new Uint8Array([0x01]);
      const b = new Uint8Array([0x02, 0x03]);
      const result = pae(a, b);
      // LE64(2) + LE64(1) + [0x01] + LE64(2) + [0x02, 0x03] = 8 + 8 + 1 + 8 + 2 = 27
      expect(result.length).to.equal(27);
    });

    it("should encode empty piece", () => {
      const result = pae(new Uint8Array(0));
      // LE64(1) + LE64(0) = 8 + 8 = 16
      expect(result.length).to.equal(16);
    });
  });
});
