import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";
import { PACKAGE_VERSION } from "../src/lib/version";

describe("Package version used by telemetry", () => {
  it("matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8"),
    ) as { version: string };
    expect(PACKAGE_VERSION).to.equal(pkg.version);
  });
});
