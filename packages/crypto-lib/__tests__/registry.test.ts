import { expect } from "chai";
import {
  getAlgorithm,
  listAlgorithms,
  recommended,
  isDeprecated,
} from "../src/registry";

describe("Algorithm Registry", () => {
  describe("getAlgorithm", () => {
    it("should find algorithm by ID", () => {
      const algo = getAlgorithm("aes-256-gcm");
      expect(algo).to.exist;
      expect(algo!.name).to.equal("AES-256-GCM");
      expect(algo!.category).to.equal("encryption");
    });

    it("should find algorithm by alias", () => {
      const algo = getAlgorithm("aes256gcm");
      expect(algo).to.exist;
      expect(algo!.id).to.equal("aes-256-gcm");
    });

    it("should return undefined for unknown algorithm", () => {
      expect(getAlgorithm("nonexistent")).to.be.undefined;
    });
  });

  describe("listAlgorithms", () => {
    it("should list all algorithms with no filter", () => {
      const all = listAlgorithms();
      expect(all.length).to.be.greaterThan(30);
    });

    it("should filter by category", () => {
      const encryption = listAlgorithms({ category: "encryption" });
      for (const a of encryption) {
        expect(a.category).to.equal("encryption");
      }
      expect(encryption.length).to.be.greaterThan(0);
    });

    it("should filter by status", () => {
      const deprecated = listAlgorithms({ status: "deprecated" });
      for (const a of deprecated) {
        expect(a.status).to.equal("deprecated");
      }
    });

    it("should filter by both category and status", () => {
      const result = listAlgorithms({ category: "signing", status: "recommended" });
      for (const a of result) {
        expect(a.category).to.equal("signing");
        expect(a.status).to.equal("recommended");
      }
    });
  });

  describe("recommended", () => {
    it("should return only recommended algorithms", () => {
      const recs = recommended();
      for (const a of recs) {
        expect(a.status).to.equal("recommended");
      }
      expect(recs.length).to.be.greaterThan(10);
    });

    it("should filter by category", () => {
      const recs = recommended("encryption");
      for (const a of recs) {
        expect(a.status).to.equal("recommended");
        expect(a.category).to.equal("encryption");
      }
    });
  });

  describe("isDeprecated", () => {
    it("should return true for deprecated algorithms", () => {
      expect(isDeprecated("pbkdf2-sha256")).to.be.true;
    });

    it("should return false for recommended algorithms", () => {
      expect(isDeprecated("aes-256-gcm")).to.be.false;
    });

    it("should return false for unknown algorithms", () => {
      expect(isDeprecated("nonexistent")).to.be.false;
    });
  });
});
