/**
 * Tests for modern CLI commands — keygen, hash, encrypt, sign, password-hash.
 *
 * Uses prompts.inject() to simulate user input.
 * Captures output by stubbing writeUtils.writeLn.
 */
import { expect } from "chai";
import prompts from "prompts";
import { writeUtils } from "../../src/utils/write.utils";

// Capture output
let captured: string[] = [];
const origWriteLn = writeUtils.writeLn;

function captureOutput() {
  captured = [];
  writeUtils.writeLn = (msg: string) => captured.push(msg);
}

function restoreOutput() {
  writeUtils.writeLn = origWriteLn;
}

describe("Modern CLI Commands", function () {
  this.timeout(60000);

  beforeEach(() => captureOutput());
  afterEach(() => restoreOutput());

  // ================================================================
  // keygen
  // ================================================================
  describe("handleModernKeygen", () => {
    let handleModernKeygen: () => Promise<void>;
    before(async () => {
      handleModernKeygen = (await import("../../src/commands/modern/keygen.command")).default;
    });

    it("should generate ed25519 key pair (JSON output)", async () => {
      prompts.inject(["ed25519", "test-kid", "sig", "json"]);
      await handleModernKeygen();
      expect(captured.length).to.be.greaterThan(0);
      const output = captured.join("");
      expect(output).to.include("publicKey");
    });

    it("should generate ed25519 key pair (hex output)", async () => {
      prompts.inject(["ed25519", "", "enc", "hex"]);
      await handleModernKeygen();
      expect(captured.length).to.be.greaterThan(0);
      expect(captured.join("")).to.include("Algorithm:");
    });

    it("should early return when algorithm is missing", async () => {
      prompts.inject([undefined]);
      await handleModernKeygen();
      expect(captured).to.have.length(0);
    });

    it("should handle error (invalid algorithm)", async () => {
      // Force an error by injecting an invalid algorithm value
      prompts.inject(["invalid-algo", "", "sig", "json"]);
      await handleModernKeygen();
      expect(captured.join("")).to.include("Key generation failed");
    });
  });

  // ================================================================
  // hash
  // ================================================================
  describe("handleModernHash", () => {
    let handleModernHash: () => Promise<void>;
    before(async () => {
      handleModernHash = (await import("../../src/commands/modern/hash.command")).default;
    });

    it("should hash data with sha256 (JSON output)", async () => {
      prompts.inject(["sha256", "hello world", "json"]);
      await handleModernHash();
      expect(captured.join("")).to.include("digest");
    });

    it("should hash data with sha3-256 (plain output)", async () => {
      prompts.inject(["sha3-256", "test data", "plain"]);
      await handleModernHash();
      expect(captured.length).to.be.greaterThan(0);
    });

    it("should hash data with blake3", async () => {
      prompts.inject(["blake3", "test", "plain"]);
      await handleModernHash();
      expect(captured.length).to.be.greaterThan(0);
    });

    it("should early return when algorithm is missing", async () => {
      prompts.inject([undefined, "data"]);
      await handleModernHash();
      expect(captured).to.have.length(0);
    });

    it("should early return when data is missing", async () => {
      prompts.inject(["sha256", undefined]);
      await handleModernHash();
      expect(captured).to.have.length(0);
    });

    it("should handle error (invalid algorithm)", async () => {
      prompts.inject(["invalid-algo", "test", "json"]);
      await handleModernHash();
      expect(captured.join("")).to.include("Hashing failed");
    });
  });

  // ================================================================
  // encrypt
  // ================================================================
  describe("handleModernEncrypt", () => {
    let handleModernEncrypt: () => Promise<void>;
    before(async () => {
      handleModernEncrypt = (await import("../../src/commands/modern/encrypt.command")).default;
    });

    it("should encrypt with xchacha20-poly1305 (JSON output)", async () => {
      prompts.inject(["xchacha20-poly1305", "a".repeat(64), "hello", "json"]);
      await handleModernEncrypt();
      expect(captured.join("")).to.include("ciphertext");
    });

    it("should encrypt with xchacha20-poly1305 (hex output)", async () => {
      prompts.inject(["xchacha20-poly1305", "a".repeat(64), "hello", "hex"]);
      await handleModernEncrypt();
      expect(captured.length).to.be.greaterThan(0);
    });

    it("should encrypt with aes-256-gcm-siv (JSON output)", async () => {
      prompts.inject(["aes-256-gcm-siv", "b".repeat(64), "hello", "json"]);
      await handleModernEncrypt();
      expect(captured.join("")).to.include("ciphertext");
    });

    it("should encrypt with aes-256-gcm-siv (hex output)", async () => {
      prompts.inject(["aes-256-gcm-siv", "b".repeat(64), "hello", "hex"]);
      await handleModernEncrypt();
      expect(captured.length).to.be.greaterThan(0);
    });

    it("should encrypt with aes-256-gcm (JSON output)", async () => {
      prompts.inject(["aes-256-gcm", "c".repeat(64), "hello", "json"]);
      await handleModernEncrypt();
      expect(captured.join("")).to.include("ciphertext");
    });

    it("should encrypt with aes-256-gcm (hex output)", async () => {
      prompts.inject(["aes-256-gcm", "c".repeat(64), "hello", "hex"]);
      await handleModernEncrypt();
      expect(captured.length).to.be.greaterThan(0);
    });

    it("should encrypt with aes-128-gcm", async () => {
      prompts.inject(["aes-128-gcm", "d".repeat(32), "hello", "json"]);
      await handleModernEncrypt();
      expect(captured.join("")).to.include("ciphertext");
    });

    it("should early return when key is missing", async () => {
      prompts.inject(["xchacha20-poly1305", undefined, "hello", "json"]);
      await handleModernEncrypt();
      expect(captured).to.have.length(0);
    });

    it("should handle error (invalid key)", async () => {
      prompts.inject(["xchacha20-poly1305", "short", "hello", "json"]);
      await handleModernEncrypt();
      expect(captured.join("")).to.include("Encryption failed");
    });
  });

  // ================================================================
  // sign
  // ================================================================
  describe("handleModernSign", () => {
    let handleModernSign: () => Promise<void>;
    before(async () => {
      handleModernSign = (await import("../../src/commands/modern/sign.command")).default;
    });

    it("should keygen-sign with ed25519", async () => {
      prompts.inject(["ed25519", "keygen-sign", "hello world"]);
      await handleModernSign();
      expect(captured.join("")).to.include("signature");
    });

    it("should keygen-sign with ecdsa-p256", async () => {
      prompts.inject(["ecdsa-p256", "keygen-sign", "hello"]);
      await handleModernSign();
      expect(captured.join("")).to.include("signature");
    });

    it("should keygen-sign with ecdsa-p384", async () => {
      prompts.inject(["ecdsa-p384", "keygen-sign", "hello"]);
      await handleModernSign();
      expect(captured.join("")).to.include("signature");
    });

    it("should keygen-sign with schnorr", async () => {
      prompts.inject(["schnorr", "keygen-sign", "hello"]);
      await handleModernSign();
      expect(captured.join("")).to.include("schnorr");
    });

    it("should sign with existing key (ed25519)", async () => {
      // First generate a key
      const { generateKeyPair } = await import("@sebastienrousseau/crypto-lib/dist/keys/keygen");
      const kp = generateKeyPair("ed25519");
      prompts.inject(["ed25519", "sign", "test message", kp.privateKey]);
      await handleModernSign();
      expect(captured.join("")).to.include("signature");
    });

    it("should verify a signature (ed25519)", async () => {
      const { generateKeyPair } = await import("@sebastienrousseau/crypto-lib/dist/keys/keygen");
      const { crypto } = await import("@sebastienrousseau/crypto-lib/dist/crypto");
      const kp = generateKeyPair("ed25519");
      const sig = crypto.sign("ed25519", kp.privateKey, "test");
      prompts.inject(["ed25519", "verify", "test", kp.publicKey, sig]);
      await handleModernSign();
      expect(captured.join("")).to.include("true");
    });

    it("should early return when algorithm is missing", async () => {
      prompts.inject([undefined]);
      await handleModernSign();
      expect(captured).to.have.length(0);
    });

    it("should early return when private key is missing in sign mode", async () => {
      prompts.inject(["ed25519", "sign", "test", undefined]);
      await handleModernSign();
      expect(captured).to.have.length(0);
    });

    it("should early return when public key is missing in verify mode", async () => {
      prompts.inject(["ed25519", "verify", "test", undefined, "sig"]);
      await handleModernSign();
      expect(captured).to.have.length(0);
    });

    it("should handle error (invalid key for sign)", async () => {
      prompts.inject(["ed25519", "sign", "test", "zz"]);
      await handleModernSign();
      expect(captured.join("")).to.include("Operation failed");
    });
  });

  // ================================================================
  // password-hash
  // ================================================================
  describe("handlePasswordHash", () => {
    let handlePasswordHash: () => Promise<void>;
    before(async () => {
      handlePasswordHash = (await import("../../src/commands/modern/password-hash.command")).default;
    });

    it("should hash a password with argon2id", async () => {
      prompts.inject(["hash", "mypassword", "argon2id"]);
      await handlePasswordHash();
      expect(captured.join("")).to.include("phc");
    });

    it("should verify a password via PHC", async () => {
      // First hash to get a PHC string
      const { hashPassword } = await import("@sebastienrousseau/crypto-lib/dist/modern/password");
      const result = hashPassword({ password: "test123", memoryCost: 1024, timeCost: 1 });
      prompts.inject(["verify", "test123", "argon2id", result.phc]);
      await handlePasswordHash();
      expect(captured.join("")).to.include("true");
    });

    it("should early return when action is missing", async () => {
      prompts.inject([undefined, "pass"]);
      await handlePasswordHash();
      expect(captured).to.have.length(0);
    });

    it("should early return when password is missing", async () => {
      prompts.inject(["hash", undefined]);
      await handlePasswordHash();
      expect(captured).to.have.length(0);
    });

    it("should early return when PHC string is missing in verify", async () => {
      prompts.inject(["verify", "test", "argon2id", undefined]);
      await handlePasswordHash();
      expect(captured).to.have.length(0);
    });

    it("should handle error (invalid PHC)", async () => {
      prompts.inject(["verify", "test", "argon2id", "invalid-phc"]);
      await handlePasswordHash();
      expect(captured.join("")).to.include("Password hashing failed");
    });
  });
});
