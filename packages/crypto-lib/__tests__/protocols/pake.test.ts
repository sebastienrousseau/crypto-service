import { expect } from "chai";
import * as pake from "../../src/protocols/pake";
import { p256 } from "@noble/curves/nist.js";

describe("PAKE (OPAQUE-style, not RFC 9807)", () => {
  it("should register a user", () => {
    const record = pake.serverRegister("my-password", "server-id-1");
    expect(record.envelope).to.be.a("string");
    expect(record.serverPublicKey).to.be.a("string");
    expect(record.serverPrivateKey).to.be.a("string");
    expect(record.userPublicKey).to.be.a("string");
    expect(record.oprfSalt).to.be.a("string");
    expect(record.serverId).to.equal("server-id-1");
  });

  it("should start client login", () => {
    const { request, state } = pake.clientStartLogin("correct-password");
    expect(request.blindedElement).to.be.a("string");
    expect(request.clientEphemeralPublic).to.be.a("string");
    expect(state.blind).to.be.a("string");
    expect(state.password).to.equal("correct-password");
    expect(state.clientEphemeralPrivate).to.be.a("string");
    expect(state.clientEphemeralPublic).to.be.a("string");
  });

  it("should complete server respond to login", () => {
    const record = pake.serverRegister("test-pass", "server-1");
    const { request } = pake.clientStartLogin("test-pass");

    const { response, state } = pake.serverRespondLogin(request, record);
    expect(response.evaluatedElement).to.be.a("string");
    expect(response.serverEphemeralPublic).to.be.a("string");
    expect(response.envelope).to.be.a("string");
    expect(response.serverPublicKey).to.be.a("string");
    expect(response.oprfSalt).to.be.a("string");
    expect(response.serverMac).to.be.a("string");
    expect(state.sessionKey).to.be.a("string");
    expect(state.expectedClientMac).to.be.a("string");
  });

  it("should produce session keys in full login flow", () => {
    const serverId = "my-server";
    const password = "correct-password";
    const record = pake.serverRegister(password, serverId);
    const loginStart = pake.clientStartLogin(password);
    const loginRespond = pake.serverRespondLogin(loginStart.request, record);
    const serverState = loginRespond.state;

    // The server state should have a session key
    expect(serverState.sessionKey).to.be.a("string");
    expect(serverState.sessionKey).to.have.length(64);
    expect(serverState.expectedClientMac).to.be.a("string");
  });

  describe("clientFinishLogin", () => {
    it("should throw on invalid hex in response fields", () => {
      const { state: clientState } = pake.clientStartLogin("pw");
      // serverEphemeralPublic contains non-hex chars, triggering hexToBytes validation
      const fakeResponse: pake.LoginResponse = {
        evaluatedElement: "ab",
        serverEphemeralPublic: "ZZZZ",
        envelope: "ab",
        serverPublicKey: "ab",
        oprfSalt: "ab",
        serverMac: "ab",
      };
      expect(() =>
        pake.clientFinishLogin(fakeResponse, clientState, "srv"),
      ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
    });

    it("should throw on invalid hex in oprfSalt field", () => {
      const { state: clientState } = pake.clientStartLogin("pw");
      // Use a valid P-256 point for serverEphemeralPublic but invalid hex for oprfSalt
      // Generate a valid point (generator * 1 = generator)
      const validPoint = Buffer.from(p256.Point.BASE.toBytes(false)).toString(
        "hex",
      );
      const fakeResponse: pake.LoginResponse = {
        evaluatedElement: "ab",
        serverEphemeralPublic: validPoint,
        envelope: "ab",
        serverPublicKey: "ab",
        oprfSalt: "not-valid-hex!",
        serverMac: "ab",
      };
      expect(() =>
        pake.clientFinishLogin(fakeResponse, clientState, "srv"),
      ).to.throw(/[Ii]nvalid.*hex|hex string expected/);
    });

    it("should throw on odd-length hex", () => {
      const { state: clientState } = pake.clientStartLogin("pw");
      const validPoint = Buffer.from(p256.Point.BASE.toBytes(false)).toString(
        "hex",
      );
      const fakeResponse: pake.LoginResponse = {
        evaluatedElement: "abc",
        serverEphemeralPublic: validPoint,
        envelope: "ab",
        serverPublicKey: "ab",
        oprfSalt: "ab",
        serverMac: "ab",
      };
      expect(() =>
        pake.clientFinishLogin(fakeResponse, clientState, "srv"),
      ).to.throw("Invalid hex string for evaluatedElement");
    });

    it("should complete a full login and agree on the session key", () => {
      const serverId = "test-server";
      const password = "test-password";
      const record = pake.serverRegister(password, serverId);
      const { request, state: clientState } = pake.clientStartLogin(password);
      const { response, state: serverState } = pake.serverRespondLogin(
        request,
        record,
      );

      const result = pake.clientFinishLogin(response, clientState, serverId);
      expect(result.sessionKey).to.have.length(64);
      expect(result.sessionKey).to.equal(serverState.sessionKey);
      expect(result.clientMac).to.equal(serverState.expectedClientMac);
      expect(result.algorithm).to.equal("opaque-p256");
    });

    it("should reject a wrong password", () => {
      const record = pake.serverRegister("right", "srv");
      const { request, state } = pake.clientStartLogin("wrong");
      const { response } = pake.serverRespondLogin(request, record);
      expect(() => pake.clientFinishLogin(response, state, "srv")).to.throw(
        "Authentication failed — wrong password or invalid envelope",
      );
    });
  });

  describe("serverVerifyClient", () => {
    it("should return true for matching client MAC", () => {
      const serverState: pake.ServerLoginState = {
        sessionKey: "ab".repeat(32),
        expectedClientMac: "cd".repeat(32),
      };
      // Pass the same MAC as expected
      const result = pake.serverVerifyClient("cd".repeat(32), serverState);
      expect(result).to.equal(true);
    });

    it("should return false for non-matching client MAC", () => {
      const serverState: pake.ServerLoginState = {
        sessionKey: "ab".repeat(32),
        expectedClientMac: "cd".repeat(32),
      };
      // Pass a different MAC
      const result = pake.serverVerifyClient("ef".repeat(32), serverState);
      expect(result).to.equal(false);
    });

    it("should return false for different length MACs", () => {
      const serverState: pake.ServerLoginState = {
        sessionKey: "ab".repeat(32),
        expectedClientMac: "cd".repeat(32),
      };
      // Pass a shorter MAC
      const result = pake.serverVerifyClient("cd".repeat(16), serverState);
      expect(result).to.equal(false);
    });

    it("should work in a full flow with manually constructed MAC", () => {
      const serverId = "full-flow-server";
      const password = "full-flow-pass";
      const record = pake.serverRegister(password, serverId);
      const { request } = pake.clientStartLogin(password);
      const { state: serverState } = pake.serverRespondLogin(request, record);

      // serverVerifyClient accepts exactly the expected MAC
      const verified = pake.serverVerifyClient(
        serverState.expectedClientMac,
        serverState,
      );
      expect(verified).to.equal(true);

      // And false for a wrong one
      const wrongMac = "00".repeat(32);
      const rejected = pake.serverVerifyClient(wrongMac, serverState);
      expect(rejected).to.equal(false);
    });
  });
});
