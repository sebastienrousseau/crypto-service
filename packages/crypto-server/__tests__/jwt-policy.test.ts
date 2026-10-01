/**
 * JWT claim checks (audit findings F06, F07).
 *
 * Before these checks the server pinned HS256 but accepted a token with
 * no `exp` (valid forever), with any lifetime, and from any issuer or for
 * any audience that shared the secret.
 */
import { expect } from "chai";
import { createHmac } from "crypto";
import { init } from "../src/server";
import { exceedsLifetime } from "../src/lib/auth";
import {
  DEFAULT_JWT_MAX_AGE_SECONDS,
  authConfigError,
  jwtConfigError,
  jwtPolicy,
} from "../src/config/auth-policy";

const SECRET = "k".repeat(32);

/** Encode JSON as unpadded base64url. */
const b64url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** Mint a token by hand, so tests control every header and claim. */
function mint(
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
  hmac = "sha256",
): string {
  const input = `${b64url(header)}.${b64url(claims)}`;
  const sig = createHmac(hmac, SECRET).update(input).digest("base64url");
  return `${input}.${sig}`;
}

/** Run `fn` with env overrides, restoring the previous values after. */
async function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
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
    return await fn();
  } finally {
    apply(saved);
  }
}

const JWT_ENV = {
  JWT_SECRET: SECRET,
  JWT_ISSUER: "https://issuer.example",
  JWT_AUDIENCE: "crypto-server",
  JWT_MAX_AGE: "600",
  CRYPTO_API_KEY: undefined,
  ALLOW_ANONYMOUS: undefined,
};

const now = (): number => Math.floor(Date.now() / 1000);

/** Claims that pass every check under JWT_ENV. */
const good = (): Record<string, unknown> => ({
  sub: "svc",
  scopes: ["crypto:hash"],
  iss: JWT_ENV.JWT_ISSUER,
  aud: JWT_ENV.JWT_AUDIENCE,
  iat: now(),
  exp: now() + 300,
});

describe("JWT claim policy (F06, F07)", function () {
  this.timeout(30000);

  describe("configuration", () => {
    it("defaults to a one-hour maximum age and no issuer or audience", () => {
      expect(jwtPolicy({})).to.deep.equal({
        maxAgeSeconds: DEFAULT_JWT_MAX_AGE_SECONDS,
        issuer: undefined,
        audience: undefined,
      });
      expect(DEFAULT_JWT_MAX_AGE_SECONDS).to.equal(3600);
      expect(
        jwtPolicy({ JWT_MAX_AGE: "", JWT_ISSUER: "", JWT_AUDIENCE: "" }),
      ).to.deep.equal({
        maxAgeSeconds: 3600,
        issuer: undefined,
        audience: undefined,
      });
      expect(jwtPolicy(JWT_ENV)).to.deep.equal({
        maxAgeSeconds: 600,
        issuer: "https://issuer.example",
        audience: "crypto-server",
      });
    });

    it("rejects a JWT_MAX_AGE that is not a positive integer", () => {
      for (const bad of ["0", "-1", "1.5", "abc", "3600s", "1e3"]) {
        expect(jwtConfigError({ JWT_MAX_AGE: bad }), bad).to.match(
          /JWT_MAX_AGE/,
        );
      }
      expect(jwtConfigError({ JWT_MAX_AGE: "60" })).to.equal(null);
    });

    it("requires JWT_ISSUER and JWT_AUDIENCE in production with JWT_SECRET", () => {
      const prod = { NODE_ENV: "production", JWT_SECRET: SECRET };
      expect(jwtConfigError(prod)).to.match(/JWT_ISSUER and JWT_AUDIENCE/);
      expect(jwtConfigError({ ...prod, JWT_ISSUER: "i" })).to.match(
        /JWT_AUDIENCE/,
      );
      expect(authConfigError(prod)).to.match(/JWT_ISSUER/);
      expect(
        authConfigError({ ...prod, JWT_ISSUER: "i", JWT_AUDIENCE: "a" }),
      ).to.equal(null);
      // Outside production, and in production with only an API key, the
      // issuer and audience stay optional.
      expect(jwtConfigError({ JWT_SECRET: SECRET })).to.equal(null);
      expect(
        jwtConfigError({ NODE_ENV: "production", CRYPTO_API_KEY: "k" }),
      ).to.equal(null);
    });

    it("refuses to boot with an invalid JWT_MAX_AGE", async () => {
      await withEnv({ ...JWT_ENV, JWT_MAX_AGE: "forever" }, async () => {
        let error: unknown;
        try {
          const app = await init();
          await app.close();
        } catch (err) {
          error = err;
        }
        expect((error as Error).message).to.match(/JWT_MAX_AGE/);
      });
    });
  });

  describe("exceedsLifetime", () => {
    it("rejects missing claims, long lifetimes and future iat", () => {
      const t = 1_000_000;
      const p = (c: object) => ({ sub: "s", scopes: [], ...c });
      expect(exceedsLifetime(p({ iat: t, exp: t + 600 }), 600, t)).to.equal(
        false,
      );
      expect(exceedsLifetime(p({ iat: t }), 600, t)).to.equal(true);
      expect(exceedsLifetime(p({ exp: t + 1 }), 600, t)).to.equal(true);
      expect(exceedsLifetime(p({ iat: t, exp: t + 601 }), 600, t)).to.equal(
        true,
      );
      expect(
        exceedsLifetime(p({ iat: t + 61, exp: t + 120 }), 600, t),
      ).to.equal(true);
      expect(
        exceedsLifetime(p({ iat: t + 60, exp: t + 120 }), 600, t),
      ).to.equal(false);
    });
  });

  describe("server", () => {
    /** POST /v2/hash with a Bearer token; returns the status code. */
    async function status(token: string): Promise<number> {
      return withEnv(JWT_ENV, async () => {
        const app = await init();
        try {
          const res = await app.inject({
            method: "POST",
            url: "/v2/hash",
            headers: { authorization: `Bearer ${token}` },
            payload: { algorithm: "sha256", data: "x" },
          });
          return res.statusCode;
        } finally {
          await app.close();
        }
      });
    }

    it("accepts a token that passes every check", async () => {
      expect(await status(mint(good()))).to.equal(200);
    });

    it("accepts an audience array that contains the audience", async () => {
      const claims = { ...good(), aud: ["other", JWT_ENV.JWT_AUDIENCE] };
      expect(await status(mint(claims))).to.equal(200);
    });

    const rejected: Array<[string, () => string]> = [
      ["no exp", () => mint({ ...good(), exp: undefined })],
      ["no iat", () => mint({ ...good(), iat: undefined })],
      ["an expired exp", () => mint({ ...good(), exp: now() - 10 })],
      [
        "a lifetime above JWT_MAX_AGE",
        () => mint({ ...good(), exp: now() + 601 }),
      ],
      [
        "an iat older than JWT_MAX_AGE",
        () => mint({ ...good(), iat: now() - 700, exp: now() - 101 + 200 }),
      ],
      [
        "an iat in the future",
        () => mint({ ...good(), iat: now() + 3600, exp: now() + 3900 }),
      ],
      ["the wrong issuer", () => mint({ ...good(), iss: "https://evil" })],
      ["no issuer", () => mint({ ...good(), iss: undefined })],
      ["the wrong audience", () => mint({ ...good(), aud: "other" })],
      ["no audience", () => mint({ ...good(), aud: undefined })],
      ["HS512", () => mint(good(), { alg: "HS512", typ: "JWT" }, "sha512")],
      [
        "alg none",
        () => `${b64url({ alg: "none", typ: "JWT" })}.${b64url(good())}.`,
      ],
    ];
    for (const [label, token] of rejected) {
      it(`rejects a token with ${label} (401)`, async () => {
        expect(await status(token())).to.equal(401);
      });
    }
  });
});
