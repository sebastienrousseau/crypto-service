import { expect } from "chai";
import * as pqxdh from "../../src/protocols/pqxdh";

describe("PQXDH Protocol", () => {
  it("should generate identity key pair", () => {
    const kp = pqxdh.generateIdentityKeyPair();
    expect(kp.privateKey).to.be.a("string");
    expect(kp.publicKey).to.be.a("string");
    expect(kp.signingPrivateKey).to.be.a("string");
    expect(kp.signingPublicKey).to.be.a("string");
    expect(kp.privateKey).to.have.length(64);
    expect(kp.publicKey).to.have.length(64);
  });

  it("should generate signed pre-key", () => {
    const identity = pqxdh.generateIdentityKeyPair();
    const spk = pqxdh.generateSignedPreKey(identity.signingPrivateKey);
    expect(spk.privateKey).to.be.a("string");
    expect(spk.publicKey).to.be.a("string");
    expect(spk.signature).to.be.a("string");
  });

  it("should generate one-time pre-key", () => {
    const otpk = pqxdh.generateOneTimePreKey();
    expect(otpk.privateKey).to.be.a("string");
    expect(otpk.publicKey).to.be.a("string");
  });

  it("should generate PQ pre-key (ML-KEM-768)", () => {
    const identity = pqxdh.generateIdentityKeyPair();
    const pqpk = pqxdh.generatePqPreKey(identity.signingPrivateKey);
    expect(pqpk.publicKey).to.be.a("string");
    expect(pqpk.secretKey).to.be.a("string");
    expect(pqpk.signature).to.be.a("string");
  });

  it("should establish a shared secret between initiator and responder", () => {
    // Bob's keys (responder)
    const bobIdentity = pqxdh.generateIdentityKeyPair();
    const bobSpk = pqxdh.generateSignedPreKey(bobIdentity.signingPrivateKey);
    const bobOtpk = pqxdh.generateOneTimePreKey();
    const bobPqpk = pqxdh.generatePqPreKey(bobIdentity.signingPrivateKey);

    // Alice's keys (initiator)
    const aliceIdentity = pqxdh.generateIdentityKeyPair();

    // Alice initiates a session to Bob
    const aliceSession = pqxdh.initiateSession({
      identityKeyPair: aliceIdentity,
      remoteIdentityPublic: bobIdentity.publicKey,
      remoteSignedPreKeyPublic: bobSpk.publicKey,
      remoteOneTimePreKeyPublic: bobOtpk.publicKey,
      remotePqPreKeyPublic: bobPqpk.publicKey,
    });

    expect(aliceSession.sharedSecret).to.be.a("string");
    expect(aliceSession.sharedSecret).to.have.length(64); // 32 bytes
    expect(aliceSession.ephemeralPublicKey).to.be.a("string");
    expect(aliceSession.pqCiphertext).to.be.a("string");

    // Bob responds
    const bobSession = pqxdh.respondToSession({
      identityKeyPair: bobIdentity,
      signedPreKeyPrivate: bobSpk.privateKey,
      oneTimePreKeyPrivate: bobOtpk.privateKey,
      pqPreKeySecret: bobPqpk.secretKey,
      remoteIdentityPublic: aliceIdentity.publicKey,
      remoteEphemeralPublic: aliceSession.ephemeralPublicKey,
      pqCiphertext: aliceSession.pqCiphertext,
    });

    expect(bobSession.sharedSecret).to.equal(aliceSession.sharedSecret);
    expect(bobSession.algorithm).to.equal("pqxdh");
  });

  it("should work without one-time pre-key", () => {
    const bobIdentity = pqxdh.generateIdentityKeyPair();
    const bobSpk = pqxdh.generateSignedPreKey(bobIdentity.signingPrivateKey);
    const bobPqpk = pqxdh.generatePqPreKey(bobIdentity.signingPrivateKey);
    const aliceIdentity = pqxdh.generateIdentityKeyPair();

    const aliceSession = pqxdh.initiateSession({
      identityKeyPair: aliceIdentity,
      remoteIdentityPublic: bobIdentity.publicKey,
      remoteSignedPreKeyPublic: bobSpk.publicKey,
      remotePqPreKeyPublic: bobPqpk.publicKey,
    });

    const bobSession = pqxdh.respondToSession({
      identityKeyPair: bobIdentity,
      signedPreKeyPrivate: bobSpk.privateKey,
      pqPreKeySecret: bobPqpk.secretKey,
      remoteIdentityPublic: aliceIdentity.publicKey,
      remoteEphemeralPublic: aliceSession.ephemeralPublicKey,
      pqCiphertext: aliceSession.pqCiphertext,
    });

    expect(bobSession.sharedSecret).to.equal(aliceSession.sharedSecret);
  });
});
