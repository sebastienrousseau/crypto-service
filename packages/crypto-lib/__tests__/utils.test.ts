import { expect } from "chai";
import { timingSafeEqual, SecureBuffer } from "../src/utils";

describe("Utilities", () => {
  describe("timingSafeEqual", () => {
    it("should return true for identical arrays", () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(timingSafeEqual(a, b)).to.be.true;
    });

    it("should return false for different arrays", () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 5]);
      expect(timingSafeEqual(a, b)).to.be.false;
    });

    it("should return false for different lengths", () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(timingSafeEqual(a, b)).to.be.false;
    });

    it("should return true for empty arrays", () => {
      expect(timingSafeEqual(new Uint8Array(0), new Uint8Array(0))).to.be.true;
    });
  });

  describe("SecureBuffer", () => {
    it("should create from Uint8Array", () => {
      const buf = new SecureBuffer(new Uint8Array([0xaa, 0xbb, 0xcc]));
      expect(buf.length).to.equal(3);
      expect(buf.isDestroyed).to.be.false;
      expect(buf.expose()).to.deep.equal(new Uint8Array([0xaa, 0xbb, 0xcc]));
    });

    it("should create from hex string", () => {
      const buf = new SecureBuffer("aabbcc");
      expect(buf.length).to.equal(3);
      expect(buf.toHex()).to.equal("aabbcc");
    });

    it("should zero memory on destroy", () => {
      const data = new Uint8Array([0xff, 0xff, 0xff]);
      const buf = new SecureBuffer(data);
      buf.destroy();
      expect(buf.isDestroyed).to.be.true;
      // The internal buffer should be zeroed
      expect(() => buf.expose()).to.throw(/destroyed/);
      expect(() => buf.toHex()).to.throw(/destroyed/);
    });

    it("should be safe to call destroy multiple times", () => {
      const buf = new SecureBuffer("aabb");
      buf.destroy();
      buf.destroy(); // should not throw
      expect(buf.isDestroyed).to.be.true;
    });
  });
});
