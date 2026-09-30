import { expect } from "chai";

describe("Package version used by telemetry", () => {
  it("matches package.json", async () => {
    const { PACKAGE_VERSION } = await import("../src/lib/version");
    const pkg = (await import("../package.json")) as { version: string };
    expect(PACKAGE_VERSION).to.equal(pkg.version);
  });
});
