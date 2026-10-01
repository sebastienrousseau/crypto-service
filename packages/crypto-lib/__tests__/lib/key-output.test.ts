import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import { generate } from "../../src/lib/generate";
import { revoke } from "../../src/lib/revoke";
import { reformat } from "../../src/lib/reformat";
import { loadKeystore, _resetKeystoreForTests } from "../../src/key/keystore";

const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "keys");
const FIXTURE_PASSPHRASE = "123456789abcdef";

/** Snapshot of every file in a directory: name → contents. */
function snapshot(dir: string): Record<string, string> {
  return Object.fromEntries(
    fs
      .readdirSync(dir)
      .sort()
      .map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]),
  );
}

/** Run `fn` with the given env overrides, restoring the old values after. */
async function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const saved = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]]),
  );
  const apply = (v: Record<string, string | undefined>): void => {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  };
  apply(vars);
  try {
    await fn();
  } finally {
    apply(saved);
  }
}

describe("Key output location and permissions", function () {
  this.timeout(60000);
  let outDir: string;

  beforeEach(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), "crypto-lib-keyout-"));
    _resetKeystoreForTests();
  });

  afterEach(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
    _resetKeystoreForTests();
  });

  it("revoke writes to CRYPTO_KEY_OUT_DIR, never into the keystore directory", async () => {
    const before = snapshot(FIXTURE_DIR);
    await withEnv(
      { CRYPTO_KEY_DIR: FIXTURE_DIR, CRYPTO_KEY_OUT_DIR: outDir },
      async () => {
        await revoke({
          passphrase: FIXTURE_PASSPHRASE,
          flag: 0,
          reason: "key output test",
        });
      },
    );
    expect(snapshot(FIXTURE_DIR)).to.deep.equal(before);
    expect(fs.readdirSync(outDir)).to.include("rsa-revoke.key");
  });

  it("reformat writes to CRYPTO_KEY_OUT_DIR, never into the keystore directory", async () => {
    const before = snapshot(FIXTURE_DIR);
    await withEnv(
      { CRYPTO_KEY_DIR: FIXTURE_DIR, CRYPTO_KEY_OUT_DIR: outDir },
      async () => {
        await reformat({
          date: new Date(),
          email: "out@test.com",
          name: "Out Test",
          passphrase: FIXTURE_PASSPHRASE,
          expiration: 0,
          publicKey: "",
        });
      },
    );
    expect(snapshot(FIXTURE_DIR)).to.deep.equal(before);
    expect(fs.readdirSync(outDir)).to.include("rsa-reformat.key");
  });

  it("generate does not fall back to the keystore directory when CRYPTO_KEY_OUT_DIR is unset", async () => {
    const before = snapshot(FIXTURE_DIR);
    await withEnv(
      { CRYPTO_KEY_DIR: FIXTURE_DIR, CRYPTO_KEY_OUT_DIR: undefined },
      async () => {
        const result = await generate({
          rsaBits: 2048,
          curve: "p256",
          email: "gen@test.com",
          keyExpirationTime: 0,
          format: "armored",
          name: "Gen Test",
          passphrase: "gen-test-passphrase",
          date: new Date(),
          type: "ecc",
          userIDs: [{ name: "Gen Test", email: "gen@test.com" }],
        });
        expect(result).to.have.property("publicKey");
      },
    );
    expect(snapshot(FIXTURE_DIR)).to.deep.equal(before);
  });

  it("private key files are written owner-only (0600)", async function () {
    if (process.platform === "win32") this.skip();
    await withEnv({ CRYPTO_KEY_OUT_DIR: outDir }, async () => {
      await generate({
        rsaBits: 2048,
        curve: "p256",
        email: "mode@test.com",
        keyExpirationTime: 0,
        format: "armored",
        name: "Mode Test",
        passphrase: "mode-test-passphrase",
        date: new Date(),
        type: "ecc",
        userIDs: [{ name: "Mode Test", email: "mode@test.com" }],
      });
    });
    const mode = fs.statSync(path.join(outDir, "ecc.key")).mode & 0o777;
    expect(mode.toString(8)).to.equal("600");
  });

  it("refuses the bundled test keys in production when CRYPTO_KEY_DIR is unset", async () => {
    await withEnv(
      { NODE_ENV: "production", CRYPTO_KEY_DIR: undefined },
      async () => {
        let error: Error | undefined;
        try {
          await loadKeystore();
        } catch (e) {
          error = e as Error;
        }
        expect(error?.message).to.match(/CRYPTO_KEY_DIR/);
      },
    );
  });
});
