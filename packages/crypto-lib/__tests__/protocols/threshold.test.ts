import { expect } from "chai";
import * as threshold from "../../src/protocols/threshold";

describe("Threshold / Shamir Secret Sharing", () => {
  it("should split and reconstruct a secret (3-of-5)", () => {
    // Use a value that's valid in the Ed25519 scalar field (< group order)
    const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const result = threshold.splitSecret(secret, 5, 3);
    expect(result.shares).to.have.length(5);
    expect(result.threshold).to.equal(3);
    expect(result.algorithm).to.equal("shamir-ed25519");

    // Reconstruct from any 3 shares
    const reconstructed = threshold.combineShares([
      result.shares[0],
      result.shares[2],
      result.shares[4],
    ]);
    expect(reconstructed).to.equal(secret);
  });

  it("should split and reconstruct with 2-of-3", () => {
    const secret = "0000000000000000000000000000000000000000000000000000000000000042";
    const result = threshold.splitSecret(secret, 3, 2);
    expect(result.shares).to.have.length(3);

    const r1 = threshold.combineShares([result.shares[0], result.shares[1]]);
    const r2 = threshold.combineShares([result.shares[1], result.shares[2]]);
    const r3 = threshold.combineShares([result.shares[0], result.shares[2]]);
    expect(r1).to.equal(secret);
    expect(r2).to.equal(secret);
    expect(r3).to.equal(secret);
  });

  it("should fail reconstruction with insufficient shares", () => {
    const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const result = threshold.splitSecret(secret, 5, 3);

    // Only 2 shares — should NOT reconstruct correctly for a 3-of-5 scheme
    const bad = threshold.combineShares([result.shares[0], result.shares[1]]);
    expect(bad).to.not.equal(secret);
  });

  it("should reject invalid parameters (threshold > n)", () => {
    expect(() => threshold.splitSecret("ab".repeat(32), 2, 3)).to.throw();
  });

  it("should reject threshold < 2", () => {
    expect(() => threshold.splitSecret("ab".repeat(32), 3, 1)).to.throw();
  });

  describe("Feldman VSS", () => {
    it("should generate commitments and verify shares", () => {
      const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const commitResult = threshold.splitSecretWithCommitments(secret, 5, 3);
      expect(commitResult.commitments).to.be.an("object");
      expect(commitResult.commitments.commitments).to.have.length(3);
      expect(commitResult.commitments.algorithm).to.equal("feldman-vss-ed25519");

      for (const share of commitResult.shares) {
        const valid = threshold.verifyFeldmanShare(share, commitResult.commitments);
        expect(valid).to.be.true;
      }
    });

    it("should reject tampered shares", () => {
      const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const result = threshold.splitSecretWithCommitments(secret, 5, 3);

      // Tamper with a share value (use a valid non-zero scalar)
      const tamperedShare = {
        index: result.shares[0].index,
        value: "0000000000000000000000000000000000000000000000000000000000000001",
      };
      const valid = threshold.verifyFeldmanShare(tamperedShare, result.commitments);
      expect(valid).to.be.false;
    });
  });
});
