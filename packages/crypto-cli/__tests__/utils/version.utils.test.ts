import { expect } from "chai";
import { getVersion } from "../../src/utils/version.utils";

describe("getVersion", () => {
  it("should return a version string starting with v", async () => {
    const version = await getVersion();
    expect(version).to.be.a("string");
    expect(version).to.match(/^v\d/);
  });

  it("should return cached version on subsequent calls", async () => {
    const v1 = await getVersion();
    const v2 = await getVersion();
    expect(v1).to.equal(v2);
  });
});
