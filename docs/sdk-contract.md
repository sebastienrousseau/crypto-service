<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# SDK contract

What every Crypto Service SDK does, in every language: the TypeScript
`@sebastienrousseau/crypto-sdk` in this repository and the six language
SDKs listed in [`docs/ecosystem.json`](ecosystem.json). The API itself is
defined by [`openapi/crypto-service.openapi.yaml`](../openapi/crypto-service.openapi.yaml)
and checked by the vectors in [`conformance/`](../conformance).

## Scope

- **A thin client.** An SDK implements no cryptography. Every operation is
  one HTTP call to crypto-server; the server holds the keys.
- **The v2 API.** One method per v2 operation in the OpenAPI document,
  plus the probes (`/health`, `/ready`), `/v2/algorithms` and the
  compliance documents. v1 (deprecated, sunset 1 January 2027) and
  `/metrics` are out of scope.
- **The server's encodings, exactly.** Keys and signatures are hex; AEAD
  and stream ciphertexts are base64; plaintexts and messages are UTF-8
  text; KMS takes an explicit encoding; HPKE and KMS decryption return
  both `utf8` and `hex`. An SDK never guesses an encoding.

## Options

| Option        | Meaning                                                          | Default        |
| :------------ | :--------------------------------------------------------------- | :------------- |
| `baseUrl`     | The crypto-server URL                                            | (required)     |
| `apiKey`      | Sent as `x-api-key`                                              | none           |
| `token`       | A JWT, sent as `Authorization: Bearer`                           | none           |
| `timeout`     | Per attempt                                                      | 30 s           |
| `deadline`    | Over all attempts of one call                                    | none           |
| `retry`       | `maxRetries`, `initialDelay`, `maxDelay`                         | 0, 200 ms, 2 s |
| `traceparent` | A W3C `traceparent` to send, or generate a fresh one per request | none           |
| transport     | An injected HTTP client or transport, for tests                  | built in       |

Every SDK sends `User-Agent: crypto-service-sdk-<language>/<version>`.

## Retries

- Exponential backoff with full jitter, from `initialDelay` up to
  `maxDelay`. `Retry-After` (seconds or an HTTP date) is honoured; when it
  asks for longer than `maxDelay`, the SDK gives up instead of waiting.
- Idempotent and pure operations retry on 429, 503, 504 and connection
  errors.
- Stateful operations (`/v2/keys/generate`, `/v2/keys/delete`, every
  `*/keygen`, `/v2/kms/create-key`, `/v2/opaque/register/*`) retry only
  after 429 or 503, which the server sends before doing any work. After a
  504 or a lost connection the work may have happened, so they do not
  retry. `packages/crypto-sdk/src/request.ts` holds the reference table.

## Connections, concurrency and cancellation

- One pooled HTTP client per SDK client, with keep-alive, and HTTP/2
  where the language's stack supports it. A client is created once and
  shared; each SDK documents exactly which of its types are safe to share
  across threads or tasks.
- Async is the primary API: `CompletableFuture` (Java), `async fn` on
  tokio (Rust), `context.Context` (Go), `std::future` (C++), `Task` with
  `CancellationToken` (.NET), `asyncio` (Python), `Promise` (TypeScript).
  Where the language has a blocking idiom, a blocking API sits beside it.
- Cancellation uses the language's own mechanism and aborts the HTTP
  request.

## Security

- Redirects are refused, so credentials never reach another origin.
- TLS verification is always on; no option turns it off.
- Credentials, keys, plaintexts and request or response bodies never
  appear in logs, error messages or debug output.

## Errors

- `ApiError`: the server answered with an error. It carries the HTTP
  status and the RFC 9457 problem: `type`
  (`urn:crypto-service:problem:<slug>`), `title`, `status`, `detail`,
  `instance`, crypto-lib's `code` when present, and `errors[]` for
  `validation-failed`. A body that is not a problem becomes an
  `about:blank` problem.
- `TransportError`: no response arrived. It says whether the attempt
  timed out.
- Both share one base type.

## Conformance

Each SDK vendors `conformance/` byte-identical, checks its `SHA256SUMS`,
and runs every vector against a live crypto-server in CI through its
public methods. `ci/server.ref` in each SDK names the crypto-service
commit that server is built from; a release pins it to the release tag.

## Benchmarks

The same scenario names in every SDK: `encode_request`, `decode_response`,
`decode_problem` and `round_trip_hash` (loopback, only when a server URL
is given). Published figures come only from these benchmarks, with the
hardware they ran on.
