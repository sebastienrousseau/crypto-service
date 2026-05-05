import { expect } from "chai";
import { SymmetricRatchet, DoubleRatchet } from "../../src/protocols/ratchet";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { x25519 } from "@noble/curves/ed25519";

describe("Ratchet Protocol", () => {
  describe("SymmetricRatchet", () => {
    it("should derive sequential message keys", () => {
      const chainKey = Buffer.from(randomBytes(32)).toString("hex");
      const ratchet = new SymmetricRatchet(chainKey);

      const step1 = ratchet.next();
      const step2 = ratchet.next();

      expect(step1.messageKey).to.be.an.instanceOf(Uint8Array);
      expect(step1.messageKey).to.have.length(32);
      expect(step2.messageKey).to.be.an.instanceOf(Uint8Array);
      expect(Buffer.from(step1.messageKey).toString("hex")).to.not.equal(
        Buffer.from(step2.messageKey).toString("hex"),
      );
    });

    it("should produce deterministic output for same initial key", () => {
      const chainKey = Buffer.from(randomBytes(32)).toString("hex");
      const r1 = new SymmetricRatchet(chainKey);
      const r2 = new SymmetricRatchet(chainKey);

      expect(Buffer.from(r1.next().messageKey).toString("hex")).to.equal(
        Buffer.from(r2.next().messageKey).toString("hex"),
      );
    });

    it("should track message index", () => {
      const chainKey = Buffer.from(randomBytes(32)).toString("hex");
      const ratchet = new SymmetricRatchet(chainKey);

      expect(ratchet.next().index).to.equal(0);
      expect(ratchet.next().index).to.equal(1);
      expect(ratchet.next().index).to.equal(2);
    });
  });

  describe("DoubleRatchet", () => {
    function setupBobKeys() {
      const priv = randomBytes(32);
      const pub = x25519.getPublicKey(priv);
      return {
        privateKey: Buffer.from(priv).toString("hex"),
        publicKey: Buffer.from(pub).toString("hex"),
      };
    }

    it("should encrypt and decrypt messages between two parties", () => {
      // Shared secret from a key agreement (e.g., PQXDH)
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();

      // Alice and Bob init their ratchets
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Alice sends to Bob
      const msg1 = alice.encrypt("Hello Bob!");
      const pt1 = bob.decrypt(msg1.header, msg1.ciphertext);
      expect(Buffer.from(pt1).toString("utf8")).to.equal("Hello Bob!");

      // Bob sends to Alice
      const msg2 = bob.encrypt("Hi Alice!");
      const pt2 = alice.decrypt(msg2.header, msg2.ciphertext);
      expect(Buffer.from(pt2).toString("utf8")).to.equal("Hi Alice!");
    });

    it("should handle multiple messages in one direction", () => {
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      const msgs = ["msg1", "msg2", "msg3"];
      const encrypted = msgs.map((m) => alice.encrypt(m));

      for (let i = 0; i < msgs.length; i++) {
        const pt = bob.decrypt(encrypted[i].header, encrypted[i].ciphertext);
        expect(Buffer.from(pt).toString("utf8")).to.equal(msgs[i]);
      }
    });

    it("should expose serializable state", () => {
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);

      const state = alice.state;
      expect(state.sendingRatchetPublic).to.be.a("string");
      expect(state.rootKey).to.be.a("string");
    });

    it("should handle out-of-order messages (skipped message keys)", () => {
      // Covers lines 389-392: normal skip messages loop storing keys
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Alice sends 3 messages
      const msg0 = alice.encrypt("message-0");
      const msg1 = alice.encrypt("message-1");
      const msg2 = alice.encrypt("message-2");

      // Bob receives message 2 FIRST (skipping 0 and 1)
      const pt2 = bob.decrypt(msg2.header, msg2.ciphertext);
      expect(Buffer.from(pt2).toString("utf8")).to.equal("message-2");

      // Bob receives message 0 (from skipped keys)
      const pt0 = bob.decrypt(msg0.header, msg0.ciphertext);
      expect(Buffer.from(pt0).toString("utf8")).to.equal("message-0");

      // Bob receives message 1 (from skipped keys)
      const pt1 = bob.decrypt(msg1.header, msg1.ciphertext);
      expect(Buffer.from(pt1).toString("utf8")).to.equal("message-1");
    });

    it("should throw on short/invalid ciphertext", () => {
      // Covers lines 324-325: _decryptWithKey short ciphertext check
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Alice sends a real message so Bob sets up his receiving chain
      const msg = alice.encrypt("setup");

      // Try to decrypt with a too-short ciphertext (less than NONCE_LEN + 16 = 40 bytes)
      const shortCt = Buffer.from(new Uint8Array(10)).toString("base64");
      expect(() => bob.decrypt(msg.header, shortCt)).to.throw(
        "Ciphertext too short",
      );
    });

    it("should throw when MAX_SKIP is exceeded", () => {
      // Covers lines 378-381: _skipMessages with too many skipped messages
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Alice sends one message to set up the receiving chain on Bob's side
      const setupMsg = alice.encrypt("setup");
      bob.decrypt(setupMsg.header, setupMsg.ciphertext);

      // Now Alice sends many messages but we only try to decrypt one far ahead
      // We need to craft a header with a very high messageNumber to exceed MAX_SKIP
      // First, Alice sends messages to advance her counter, but we'll just
      // fabricate the scenario by encrypting a msg after bumping the counter far ahead
      // Easier: encrypt 1 more message, then modify its header to have a huge messageNumber
      const realMsg = alice.encrypt("test");
      const badHeader = { ...realMsg.header, messageNumber: 300 };

      expect(() => bob.decrypt(badHeader, realMsg.ciphertext)).to.throw(
        "Too many skipped messages",
      );
    });

    it("should handle multiple direction changes (DH ratchet with existing receiving chain)", () => {
      // Covers lines 289-295: DH ratchet step triggered while receiving chain exists
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Round 1: Alice -> Bob (establishes Bob's receiving chain)
      const a1 = alice.encrypt("Alice round 1");
      const pt1 = bob.decrypt(a1.header, a1.ciphertext);
      expect(Buffer.from(pt1).toString("utf8")).to.equal("Alice round 1");

      // Round 2: Bob -> Alice (Bob's DH ratchet step, Alice gets new receiving chain)
      const b1 = bob.encrypt("Bob round 1");
      const pt2 = alice.decrypt(b1.header, b1.ciphertext);
      expect(Buffer.from(pt2).toString("utf8")).to.equal("Bob round 1");

      // Round 3: Alice -> Bob (Alice's new DH key, Bob has EXISTING receiving chain)
      // This triggers lines 289-295: Bob has a receivingChainKey from round 1
      // and now gets a NEW ratchet public key from Alice
      const a2 = alice.encrypt("Alice round 2");
      const pt3 = bob.decrypt(a2.header, a2.ciphertext);
      expect(Buffer.from(pt3).toString("utf8")).to.equal("Alice round 2");

      // Round 4: Bob -> Alice (another direction change)
      const b2 = bob.encrypt("Bob round 2");
      const pt4 = alice.decrypt(b2.header, b2.ciphertext);
      expect(Buffer.from(pt4).toString("utf8")).to.equal("Bob round 2");

      // Round 5: Alice -> Bob again (another direction change with existing chain)
      const a3 = alice.encrypt("Alice round 3");
      const pt5 = bob.decrypt(a3.header, a3.ciphertext);
      expect(Buffer.from(pt5).toString("utf8")).to.equal("Alice round 3");
    });

    it("should handle direction change with skipped messages in previous chain", () => {
      // Specifically triggers lines 289-295: skip messages in current receiving
      // chain before performing DH ratchet for new key
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Alice sends 3 messages in first chain
      const a1 = alice.encrypt("Alice msg 1");
      const a2 = alice.encrypt("Alice msg 2");
      const a3 = alice.encrypt("Alice msg 3");

      // Bob only decrypts the first one (skips 2 and 3 for now)
      const pt1 = bob.decrypt(a1.header, a1.ciphertext);
      expect(Buffer.from(pt1).toString("utf8")).to.equal("Alice msg 1");

      // Bob sends to Alice (direction change on Alice's side)
      const b1 = bob.encrypt("Bob msg 1");
      const ptb1 = alice.decrypt(b1.header, b1.ciphertext);
      expect(Buffer.from(ptb1).toString("utf8")).to.equal("Bob msg 1");

      // Alice sends again with NEW ratchet key
      // When Bob receives this, he has an existing receivingChainKey and a new
      // publicKey in the header -> triggers lines 289-295 to skip remaining
      // messages (msg 2, 3) in the old chain
      const a4 = alice.encrypt("Alice msg 4");
      const pt4 = bob.decrypt(a4.header, a4.ciphertext);
      expect(Buffer.from(pt4).toString("utf8")).to.equal("Alice msg 4");

      // Now Bob can still decrypt the skipped messages from the old chain
      const pt2 = bob.decrypt(a2.header, a2.ciphertext);
      expect(Buffer.from(pt2).toString("utf8")).to.equal("Alice msg 2");

      const pt3 = bob.decrypt(a3.header, a3.ciphertext);
      expect(Buffer.from(pt3).toString("utf8")).to.equal("Alice msg 3");
    });

    it("should restore from serialized state via fromState", () => {
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const alice = DoubleRatchet.initAlice(sharedSecret, bobKp.publicKey);
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Alice sends a message
      const msg1 = alice.encrypt("before save");
      bob.decrypt(msg1.header, msg1.ciphertext);

      // Save and restore Alice's state
      const savedState = alice.state;
      const restoredAlice = DoubleRatchet.fromState(savedState);

      // Restored Alice can send messages that Bob can decrypt
      const msg2 = restoredAlice.encrypt("after restore");
      const pt2 = bob.decrypt(msg2.header, msg2.ciphertext);
      expect(Buffer.from(pt2).toString("utf8")).to.equal("after restore");
    });

    it("should throw when encrypting without sending chain (Bob before receiving)", () => {
      const sharedSecret = Buffer.from(randomBytes(32)).toString("hex");
      const bobKp = setupBobKeys();
      const bob = DoubleRatchet.initBob(sharedSecret, bobKp);

      // Bob hasn't received any message yet so sendingChainKey is null
      expect(() => bob.encrypt("should fail")).to.throw(
        "Sending chain not initialized",
      );
    });

    it("should throw on invalid hex in SymmetricRatchet constructor", () => {
      expect(() => new SymmetricRatchet("ZZZZZZ")).to.throw("Invalid hex string");
    });
  });
});
