import type {
  ArmoredPrivateKey,
  DecryptInput,
  DecryptOutput,
  EncryptInput,
  GenerateInput,
  GenerateOutput,
  ReformatInput,
  ReformatOutput,
  RevokeInput,
  RevokeOutput,
  SessionInput,
  SignInput,
  VerifyInput,
  VerifyOutput,
} from "../../src/types/types";
import chai from "chai";

const { expect } = chai;

describe("types/types", function () {
  it("compiles type aliases", function () {
    // The interesting test is that the file type-checks. We assert at runtime
    // that the inferred shapes are usable.
    const armoredPriv: ArmoredPrivateKey = { armored: "x", passphrase: "y" };
    const gen: GenerateInput = { name: "n", email: "e@x" };
    const enc: EncryptInput = { message: "m", encryptionKey: "k" };
    const dec: DecryptInput = {
      encryptedMessage: "m",
      decryptionKey: armoredPriv,
    };
    const sgn: SignInput = { message: "m", signingKey: armoredPriv };
    const vrf: VerifyInput = { message: "m", verificationKey: "k" };
    const rvk: RevokeInput = { privateKey: armoredPriv };
    const rfm: ReformatInput = {
      privateKey: armoredPriv,
      name: "n",
      email: "e@x",
    };
    const ses: SessionInput = { encryptionKey: "k", name: "n", email: "e@x" };

    expect(armoredPriv.armored).to.equal("x");
    expect(gen.email).to.equal("e@x");
    expect(enc.message).to.equal("m");
    expect(dec.encryptedMessage).to.equal("m");
    expect(sgn.message).to.equal("m");
    expect(vrf.verificationKey).to.equal("k");
    expect(rvk.privateKey).to.equal(armoredPriv);
    expect(rfm.name).to.equal("n");
    expect(ses.email).to.equal("e@x");

    // Output shapes
    const genOut: GenerateOutput = {
      publicKey: "p",
      privateKey: "k",
      revocationCertificate: "r",
    };
    const decOut: DecryptOutput = { data: "d", signatures: [] };
    const vrfOut: VerifyOutput = { valid: true, signedBy: "id" };
    const rvkOut: RevokeOutput = { publicKey: "p", privateKey: "k" };
    const rfmOut: ReformatOutput = { publicKey: "p", privateKey: "k" };
    expect(genOut.publicKey).to.equal("p");
    expect(decOut.data).to.equal("d");
    expect(vrfOut.valid).to.equal(true);
    expect(rvkOut.publicKey).to.equal("p");
    expect(rfmOut.privateKey).to.equal("k");
  });
});
