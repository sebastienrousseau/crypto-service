import { expect } from "chai";
import {
  generateSchnorrKeyPair,
  schnorrSign,
  schnorrVerify,
} from "../../src/modern/curves";

describe("Schnorr (BIP-340)", () => {
  it("should generate a key pair", () => {
    const kp = generateSchnorrKeyPair();
    expect(kp.privateKey).to.have.length(64);
    expect(kp.publicKey).to.have.length(64);
    expect(kp.algorithm).to.equal("schnorr");
  });

  it("should sign and verify a message", () => {
    const kp = generateSchnorrKeyPair();
    const sig = schnorrSign(kp.privateKey, "hello world");
    expect(sig.signature).to.have.length(128); // 64 bytes = 128 hex
    expect(sig.algorithm).to.equal("schnorr");

    const result = schnorrVerify(kp.publicKey, "hello world", sig.signature);
    expect(result.valid).to.be.true;
    expect(result.algorithm).to.equal("schnorr");
  });

  it("should reject invalid signatures", () => {
    const kp = generateSchnorrKeyPair();
    const sig = schnorrSign(kp.privateKey, "hello");
    const result = schnorrVerify(
      kp.publicKey,
      "different message",
      sig.signature,
    );
    expect(result.valid).to.be.false;
  });

  it("should sign Uint8Array messages", () => {
    const kp = generateSchnorrKeyPair();
    const msg = new Uint8Array([1, 2, 3, 4, 5]);
    const sig = schnorrSign(kp.privateKey, msg);
    const result = schnorrVerify(kp.publicKey, msg, sig.signature);
    expect(result.valid).to.be.true;
  });

  it("should reject invalid hex for privateKey", () => {
    expect(() => schnorrSign("ZZZZ", "hello")).to.throw(
      /[Ii]nvalid.*hex|hex string expected/,
    );
  });
});
