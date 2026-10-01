/**
 * Fail-closed authentication, key custody and work-factor bounds.
 *
 * Every case here passed (insecurely) before these defences existed:
 * the server allowed anonymous callers when no credential was configured,
 * ignored JWT_SECRET on every route, returned the revoked private key, and
 * accepted unbounded KDF and Argon2 costs.
 */
import { expect } from "chai";
import path from "path";
import { createRequire } from "module";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import { authenticate } from "../src/lib/auth";
import { validateApiKey } from "../src/utils/validation";
import { authConfigError } from "../src/config/auth-policy";
import type { FastifyReply, FastifyRequest } from "fastify";

// The keystore cache is internal to crypto-lib and not part of its
// package exports. Load the module by file path next to the package
// entry, which is the same module instance the server uses, so the
// tests can clear the cache after changing CRYPTO_KEY_DIR.
const { _resetKeystoreForTests } = createRequire(__filename)(
  path.join(
    path.dirname(require.resolve("@sebastienrousseau/crypto-lib")),
    "key",
    "keystore.js",
  ),
) as { _resetKeystoreForTests: () => void };

const FIXTURE_KEYS = path.resolve(
  __dirname,
  "..",
  "..",
  "crypto-lib",
  "__tests__",
  "fixtures",
  "keys",
);

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

const NO_AUTH = {
  CRYPTO_API_KEY: undefined,
  JWT_SECRET: undefined,
  ALLOW_ANONYMOUS: undefined,
};

describe("Fail-closed security defaults", function () {
  this.timeout(30000);

  describe("configuration", () => {
    it("rejects production without credentials", () => {
      expect(authConfigError({ NODE_ENV: "production" })).to.match(
        /CRYPTO_API_KEY or JWT_SECRET/,
      );
    });

    it("rejects a JWT secret shorter than 32 bytes", () => {
      expect(authConfigError({ JWT_SECRET: "short" })).to.match(/32/);
    });

    it("accepts production with an API key, or with explicit anonymous access", () => {
      expect(
        authConfigError({ NODE_ENV: "production", CRYPTO_API_KEY: "k" }),
      ).to.equal(null);
      expect(
        authConfigError({ NODE_ENV: "production", ALLOW_ANONYMOUS: "1" }),
      ).to.equal(null);
    });
  });

  describe("unit checks", () => {
    it("validateApiKey denies when no key is configured and anonymous access is off", async () => {
      await withEnv(NO_AUTH, async () => {
        expect(validateApiKey("anything", undefined)).to.equal(false);
      });
    });

    it("authenticate sends 401 when nothing is configured and anonymous access is off", async () => {
      await withEnv(NO_AUTH, async () => {
        const state = { code: 0 };
        const reply = {
          status(code: number) {
            state.code = code;
            return { send: () => undefined };
          },
        } as unknown as FastifyReply;
        const result = await authenticate(
          { headers: {} } as unknown as FastifyRequest,
          reply,
        );
        expect(result).to.equal(null);
        expect(state.code).to.equal(401);
      });
    });
  });

  describe("server", () => {
    it("refuses requests when no credential is configured", async () => {
      await withEnv(NO_AUTH, async () => {
        const app = await init();
        try {
          const res = await app.inject({
            method: "POST",
            url: "/v2/hash",
            payload: { algorithm: "sha256", data: "x" },
          });
          expect(res.statusCode).to.equal(401);
          const live = await app.inject({ method: "GET", url: "/live" });
          expect(live.statusCode).to.equal(200);
        } finally {
          await app.close();
        }
      });
    });

    it("enforces JWT when only JWT_SECRET is configured", async () => {
      const secret = "j".repeat(32);
      await withEnv({ ...NO_AUTH, JWT_SECRET: secret }, async () => {
        const app: FastifyInstance = await init();
        try {
          const denied = await app.inject({
            method: "POST",
            url: "/v2/hash",
            payload: { algorithm: "sha256", data: "x" },
          });
          expect(denied.statusCode).to.equal(401);

          const token = (
            app as unknown as {
              jwt: { sign: (p: object, o: object) => string };
            }
          ).jwt.sign(
            { sub: "svc", scopes: ["crypto:hash"] },
            { expiresIn: "1h" },
          );
          const allowed = await app.inject({
            method: "POST",
            url: "/v2/hash",
            headers: { authorization: `Bearer ${token}` },
            payload: { algorithm: "sha256", data: "x" },
          });
          expect(allowed.statusCode).to.equal(200);
        } finally {
          await app.close();
        }
      });
    });

    it("never returns private key material from /v1/revoke", async () => {
      await withEnv(
        { CRYPTO_KEY_DIR: FIXTURE_KEYS, ALLOW_ANONYMOUS: "1" },
        async () => {
          _resetKeystoreForTests();
          const app = await init();
          try {
            const res = await app.inject({
              method: "POST",
              url: "/v1/revoke",
              payload: { passphrase: "123456789abcdef", flag: 0, reason: "t" },
            });
            expect(res.statusCode).to.equal(200);
            expect(res.payload).to.not.include("PRIVATE KEY");
            expect(Object.keys(JSON.parse(res.payload).data)).to.deep.equal([
              "publicKey",
            ]);
          } finally {
            await app.close();
            _resetKeystoreForTests();
          }
        },
      );
    });

    it("rejects KDF and Argon2 costs above the caps with 400", async () => {
      const saved = process.env["ALLOW_ANONYMOUS"];
      process.env["ALLOW_ANONYMOUS"] = "1";
      const app = await init();
      try {
        const cases = [
          {
            url: "/v2/kdf",
            payload: {
              algorithm: "scrypt",
              password: "pw",
              params: { N: 1048576, r: 8, p: 1 },
            },
          },
          {
            url: "/v2/kdf",
            payload: {
              algorithm: "pbkdf2-sha256",
              password: "pw",
              params: { iterations: 5000000 },
            },
          },
          {
            url: "/v2/password/hash",
            payload: { password: "pw", timeCost: 1, memoryCost: 1048576 },
          },
          {
            url: "/v2/password/verify",
            payload: {
              password: "pw",
              hash: "00",
              salt: "00",
              params: { t: 1000, m: 1024, p: 1 },
            },
          },
        ];
        for (const c of cases) {
          const res = await app.inject({ method: "POST", ...c });
          expect(res.statusCode, c.url).to.equal(400);
        }
      } finally {
        await app.close();
        if (saved === undefined) delete process.env["ALLOW_ANONYMOUS"];
        else process.env["ALLOW_ANONYMOUS"] = saved;
      }
    });
  });
});
