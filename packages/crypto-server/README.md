# 🖥️ @sebastienrousseau/crypto-server

A [Fastify](https://www.fastify.io) REST front for the
[Crypto Service Suite](https://github.com/sebastienrousseau/crypto-service).
Eight authenticated `POST /v1/*` endpoints over JWT, schema-validated, with
helmet, CORS default-deny, rate limiting, pino redaction, and zero secret
material in logs.

[![NPM Version](https://img.shields.io/npm/v/@sebastienrousseau/crypto-server.svg?style=flat-square)](https://www.npmjs.com/package/@sebastienrousseau/crypto-server)
[![Coverage](https://img.shields.io/coveralls/github/sebastienrousseau/crypto-service/main.svg?style=flat-square)](https://coveralls.io/github/sebastienrousseau/crypto-service?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

> Part of the [Crypto Service Suite](https://github.com/sebastienrousseau/crypto-service).
> See the root [README](../../README.md) and
> [`docs/architecture.md`](../../docs/architecture.md) for the bigger picture.

---

## Quick Start

```bash
# 1. Mint a 32-character JWT secret. The server refuses to start without one.
export JWT_SECRET="$(openssl rand -hex 32)"

# 2. Start the server (from the repo root, in workspace mode):
pnpm --filter @sebastienrousseau/crypto-server start
# → 🚀 Server listening on http://127.0.0.1:3000/

# 3. From another terminal, mint a tester JWT:
export TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'tester'}, process.env.JWT_SECRET))")

# 4. Smoke-test the welcome route:
curl -s http://127.0.0.1:3000/ | jq .version    # → "0.0.3"
curl -s http://127.0.0.1:3000/health            # → 200 OK
```

Requires **Node.js ≥ 20.18**.

---

## Endpoints

All `/v1/*` endpoints are `POST`, take a JSON body, return a JSON envelope
`{ "data": ... }` or `{ "error": "..." }`, and require a valid JWT in the
`Authorization: Bearer <token>` header.

| Method | Path | Lib function | Body |
|---|---|---|---|
| GET    | `/`            | _(welcome banner)_   | n/a |
| GET    | `/health`      | _(healthcheck)_      | n/a |
| POST   | `/v1/generate` | `generate()`         | `{ name, email, passphrase?, type?, rsaBits?, curve?, keyExpirationTime? }` |
| POST   | `/v1/encrypt`  | `encrypt()`          | `{ message, encryptionKey, signingKey? }` |
| POST   | `/v1/decrypt`  | `decrypt()`          | `{ encryptedMessage, decryptionKey, verificationKey? }` |
| POST   | `/v1/sign`     | `sign()`             | `{ message, signingKey, detached? }` |
| POST   | `/v1/verify`   | `verify()`           | `{ message, verificationKey, signature?, date? }` |
| POST   | `/v1/revoke`   | `revoke()`           | `{ privateKey, reason? }` |
| POST   | `/v1/reformat` | `reformat()`         | `{ privateKey, name, email, keyExpirationTime? }` |
| POST   | `/v1/session`  | `session()`          | `{ encryptionKey, name, email }` |

Body shape, length caps, and exhaustive validation rules live in the per-route
files under [`src/routes/v1/`](src/routes/v1/).

### Auth

Every `/v1/*` route is gated by `requireAuth`, which calls
`request.jwtVerify()`. A missing or invalid JWT returns:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
{"error":"unauthorized"}
```

`crypto-server` does **not** issue JWTs. Mint them out of band with your
existing identity provider, or for local testing:

```bash
node -e "console.log(require('jsonwebtoken').sign({sub:'tester'}, process.env.JWT_SECRET))"
```

---

## Curl examples

> ⚠️ The examples below use placeholder armored keys. In production, never
> embed key material in shell history. Read armored keys from files:
> `--data @body.json`, then `shred -u body.json` when done.

### `POST /v1/generate`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@doe.com",
    "passphrase": "correct horse battery staple",
    "type": "ecc",
    "curve": "curve25519",
    "keyExpirationTime": 31536000
  }' | jq .
```

Response:

```json
{
  "data": {
    "publicKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
    "privateKey": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n...",
    "revocationCertificate": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n..."
  }
}
```

### `POST /v1/encrypt`

```bash
cat > /tmp/encrypt.json <<'JSON'
{
  "message": "Hello Crypto Service Suite!",
  "encryptionKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n... (armored) ...\n-----END PGP PUBLIC KEY BLOCK-----\n"
}
JSON

curl -s -X POST http://127.0.0.1:3000/v1/encrypt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data @/tmp/encrypt.json | jq .

shred -u /tmp/encrypt.json
```

### `POST /v1/decrypt`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/decrypt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data @/tmp/decrypt.json | jq .
```

`/tmp/decrypt.json`:

```json
{
  "encryptedMessage": "-----BEGIN PGP MESSAGE-----\n...",
  "decryptionKey": {
    "armored": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n...",
    "passphrase": "correct horse battery staple"
  },
  "verificationKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n..."
}
```

### `POST /v1/sign`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/sign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "the message",
    "signingKey": {
      "armored": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n...",
      "passphrase": "correct horse battery staple"
    },
    "detached": false
  }' | jq .
```

### `POST /v1/verify`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "-----BEGIN PGP SIGNED MESSAGE-----\n...",
    "verificationKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n..."
  }' | jq .
```

### `POST /v1/revoke`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/revoke \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": {
      "armored": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n...",
      "passphrase": "correct horse battery staple"
    },
    "reason": { "flag": 2, "string": "compromised" }
  }' | jq .
```

Reason flags follow RFC 4880 §5.2.3.23: `0` = no reason, `1` = superseded,
`2` = compromised, `3` = retired, `32` = user ID no longer valid.

### `POST /v1/reformat`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/reformat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": {
      "armored": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n...",
      "passphrase": "correct horse battery staple"
    },
    "name": "Jane D. Roe",
    "email": "jane.roe@example.com",
    "keyExpirationTime": 63072000
  }' | jq .
```

### `POST /v1/session`

```bash
curl -s -X POST http://127.0.0.1:3000/v1/session \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encryptionKey": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
    "name": "Recipient",
    "email": "recipient@example.com"
  }' | jq .
```

Response:

```json
{
  "data": {
    "algorithm": "aes256",
    "data": "ab12cd34..."
  }
}
```

The `data` field is the session key bytes hex-encoded. Raw `Uint8Array`
serialises poorly over JSON, hence the explicit hex encoding.

---

## Environment

| Name             | Default      | Required | Notes |
|------------------|--------------|----------|---|
| `JWT_SECRET`     | _(none)_     | **yes**  | ≥ 32 chars enforced at boot. Server refuses to start otherwise. |
| `HOST`           | `127.0.0.1`  | no       | Bind address. |
| `PORT`           | `3000`       | no       | Listen port. |
| `PROTOCOL`       | `http`       | no       | Cosmetic only — used for the welcome banner. Terminate TLS at your reverse proxy. |
| `CORS_ORIGINS`   | _(deny all)_ | no       | Comma-separated allow-list. Default behaviour is **deny all**. |
| `TRUST_PROXY`    | _(off)_      | no       | Comma-separated CIDR list. Without this, the rate-limiter trusts the socket address verbatim — exactly what you want unless you're behind a known proxy. **Never set this to `true` in production.** |
| `LOG_LEVEL`      | `info`       | no       | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. |

---

## Defenses on every `/v1/*` route

| Layer | What it catches |
|---|---|
| Helmet headers | click-jacking, MIME sniffing, XSS framing |
| CORS default-deny | non-allow-listed browser origins |
| Rate limit (10/min/IP) | brute force, cost amplification |
| JWT preHandler | unauthenticated callers |
| Ajv body schema (`additionalProperties: false`, length caps) | type confusion, oversize bodies, prototype pollution (`onProtoPoisoning: "error"`) |
| Pure-function `crypto-lib` call | returns ciphertext or throws — no side effects |
| Pino redaction | passphrase / Authorization-header leakage in logs |
| `Cache-Control: no-store` on every response | intermediate caches |

See [`docs/architecture.md`](../../docs/architecture.md#3-layered-defenses-on-every-v1-route)
for the full sequence diagram of a request lifecycle.

---

## Local development

```bash
# from the repo root
pnpm install --frozen-lockfile
pnpm --filter @sebastienrousseau/crypto-server run build
pnpm --filter @sebastienrousseau/crypto-server run test
pnpm --filter @sebastienrousseau/crypto-server run lint

# run with hot-reload (TS source via ts-node):
JWT_SECRET="$(openssl rand -hex 32)" \
  pnpm --filter @sebastienrousseau/crypto-server start
```

Source layout:

```
packages/crypto-server/
├── src/
│   ├── @types/types.ts      ← FastifyInstance.requireAuth + body types
│   ├── config/constants.ts  ← Fastify options, redact paths, rate limit
│   ├── lib/logger.ts        ← winston (separate from Fastify's pino)
│   ├── routes/
│   │   ├── index.ts         ← registers every v1 route + welcome
│   │   └── v1/
│   │       ├── decrypt.ts
│   │       ├── encrypt.ts
│   │       ├── generate.ts
│   │       ├── reformat.ts
│   │       ├── revoke.ts
│   │       ├── session.ts
│   │       ├── sign.ts
│   │       ├── verify.ts
│   │       └── index.ts     ← welcome route
│   ├── server.ts            ← init() — Helmet/CORS/JWT/RateLimit registration
│   └── index.ts             ← bin entrypoint
└── __tests__/
    └── server.test.ts       ← bootstrap, JWT, schema, /health, new routes
```

---

## Production deployment

- **Always run behind a TLS-terminating reverse proxy** (nginx, Caddy,
  Cloudflare, AWS ALB). `crypto-server` itself only speaks plain HTTP.
- Set `TRUST_PROXY` to a comma-separated CIDR list of *your* proxies.
  Never set it to `true`.
- Set `CORS_ORIGINS` explicitly if browsers need to call the API.
- Mint `JWT_SECRET` with `openssl rand -hex 32` (or longer) and store it
  in your secrets manager. Rotate by restarting with a new value.
- Keep `LOG_LEVEL=info` in production. Pino redaction is configured to
  drop every passphrase path and the Authorization header.
- Run with a process manager (`systemd`, `pm2`, k8s deployment) and a
  liveness probe against `GET /health`.

---

## Versioning

`crypto-server` follows [semantic versioning](https://semver.org/). The
public API is the `POST /v1/*` HTTP surface. The `GET /` and `GET /health`
routes are stable but informational.

## Changelog

See [GitHub Releases](https://github.com/sebastienrousseau/crypto-service/releases).

## License

MIT — see [LICENSE](LICENSE). Copyright © Sebastien Rousseau.
