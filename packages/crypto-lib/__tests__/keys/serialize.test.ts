import { expect } from "chai";
import {
  hexToBytes,
  bytesToHex,
  bytesToBase64,
  base64ToBytes,
  bytesToBase64url,
  base64urlToBytes,
  encodePem,
  decodePem,
  ed25519ToJwk,
  x25519ToJwk,
  jwkToHex,
  jwkThumbprint,
} from "../../src/keys/serialize";
import { generateEd25519KeyPair } from "../../src/modern/signing";
import { generateX25519KeyPair } from "../../src/modern/ecdh";

describe("Key Serialization", () => {
  describe("hex <-> bytes", () => {
    it("should roundtrip hex conversion", () => {
      const bytes = new Uint8Array([0, 1, 127, 128, 255]);
      expect(bytesToHex(hexToBytes(bytesToHex(bytes)))).to.equal(bytesToHex(bytes));
    });

    it("should reject invalid hex", () => {
      expect(() => hexToBytes("zz")).to.throw(/Invalid hex/);
    });

    it("should reject odd-length hex", () => {
      expect(() => hexToBytes("abc")).to.throw(/even length/);
    });
  });

  describe("base64 <-> bytes", () => {
    it("should roundtrip base64", () => {
      const bytes = new Uint8Array([0, 1, 127, 128, 255]);
      const b64 = bytesToBase64(bytes);
      expect(Array.from(base64ToBytes(b64))).to.deep.equal(Array.from(bytes));
    });
  });

  describe("base64url <-> bytes", () => {
    it("should roundtrip base64url", () => {
      const bytes = new Uint8Array([0, 1, 127, 128, 255, 63, 62]);
      const b64url = bytesToBase64url(bytes);
      expect(b64url).to.not.include("+");
      expect(b64url).to.not.include("/");
      expect(b64url).to.not.include("=");
      expect(Array.from(base64urlToBytes(b64url))).to.deep.equal(Array.from(bytes));
    });

    it("should handle no-padding case", () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const b64url = bytesToBase64url(bytes);
      expect(Array.from(base64urlToBytes(b64url))).to.deep.equal([1, 2, 3]);
    });
  });

  describe("PEM", () => {
    it("should encode and decode PEM", () => {
      const data = new Uint8Array(64).fill(0xab);
      const pem = encodePem("PUBLIC KEY", data);
      expect(pem).to.include("-----BEGIN PUBLIC KEY-----");
      expect(pem).to.include("-----END PUBLIC KEY-----");

      const decoded = decodePem(pem);
      expect(decoded.label).to.equal("PUBLIC KEY");
      expect(Array.from(decoded.data)).to.deep.equal(Array.from(data));
    });

    it("should wrap lines at 64 characters", () => {
      const data = new Uint8Array(100);
      const pem = encodePem("PRIVATE KEY", data);
      const lines = pem.split("\n").filter(l => !l.startsWith("-----") && l.length > 0);
      for (const line of lines.slice(0, -1)) {
        expect(line.length).to.equal(64);
      }
    });

    it("should reject invalid PEM", () => {
      expect(() => decodePem("not a pem")).to.throw(/Invalid PEM/);
    });

    it("should handle different labels", () => {
      const data = new Uint8Array([1, 2, 3]);
      const pem = encodePem("ED25519 PRIVATE KEY", data);
      const decoded = decodePem(pem);
      expect(decoded.label).to.equal("ED25519 PRIVATE KEY");
    });
  });

  describe("JWK — Ed25519", () => {
    it("should export public key as JWK", () => {
      const kp = generateEd25519KeyPair();
      const jwk = ed25519ToJwk(kp.publicKey);
      expect(jwk.kty).to.equal("OKP");
      expect(jwk.crv).to.equal("Ed25519");
      expect(jwk.alg).to.equal("EdDSA");
      expect(jwk.x).to.be.a("string");
      expect(jwk.d).to.be.undefined;
    });

    it("should export key pair as JWK", () => {
      const kp = generateEd25519KeyPair();
      const jwk = ed25519ToJwk(kp.publicKey, kp.privateKey);
      expect(jwk.x).to.be.a("string");
      expect(jwk.d).to.be.a("string");
    });

    it("should roundtrip JWK → hex → JWK", () => {
      const kp = generateEd25519KeyPair();
      const jwk = ed25519ToJwk(kp.publicKey, kp.privateKey);
      const hex = jwkToHex(jwk);
      expect(hex.publicKey).to.equal(kp.publicKey);
      expect(hex.privateKey).to.equal(kp.privateKey);
    });
  });

  describe("JWK — X25519", () => {
    it("should export X25519 key as JWK", () => {
      const kp = generateX25519KeyPair();
      const jwk = x25519ToJwk(kp.publicKey, kp.privateKey);
      expect(jwk.kty).to.equal("OKP");
      expect(jwk.crv).to.equal("X25519");
      expect(jwk.alg).to.equal("ECDH-ES");
      expect(jwk.d).to.be.a("string");
    });

    it("should export public-only JWK", () => {
      const kp = generateX25519KeyPair();
      const jwk = x25519ToJwk(kp.publicKey);
      expect(jwk.d).to.be.undefined;
    });
  });

  describe("jwkToHex", () => {
    it("should import public-only JWK", () => {
      const kp = generateEd25519KeyPair();
      const jwk = ed25519ToJwk(kp.publicKey);
      const hex = jwkToHex(jwk);
      expect(hex.publicKey).to.equal(kp.publicKey);
      expect(hex.privateKey).to.be.undefined;
    });

    it("should reject JWK without x field", () => {
      expect(() => jwkToHex({ kty: "OKP" })).to.throw(/missing 'x'/);
    });
  });

  describe("JWK Thumbprint", () => {
    it("should compute deterministic thumbprint for Ed25519", () => {
      const kp = generateEd25519KeyPair();
      const jwk = ed25519ToJwk(kp.publicKey);
      const t1 = jwkThumbprint(jwk);
      const t2 = jwkThumbprint(jwk);
      expect(t1).to.equal(t2);
      expect(t1).to.be.a("string");
      expect(t1.length).to.be.greaterThan(0);
    });

    it("should produce different thumbprints for different keys", () => {
      const kp1 = generateEd25519KeyPair();
      const kp2 = generateEd25519KeyPair();
      const t1 = jwkThumbprint(ed25519ToJwk(kp1.publicKey));
      const t2 = jwkThumbprint(ed25519ToJwk(kp2.publicKey));
      expect(t1).to.not.equal(t2);
    });

    it("should handle EC kty", () => {
      const jwk = { kty: "EC", crv: "P-256", x: "abc", y: "def" };
      const t = jwkThumbprint(jwk);
      expect(t).to.be.a("string");
    });

    it("should handle unknown kty", () => {
      const t = jwkThumbprint({ kty: "RSA" });
      expect(t).to.be.a("string");
    });
  });
});
