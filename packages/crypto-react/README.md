<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-react-logo.svg" alt="crypto-react" width="128" />
</p>

<h1 align="center">crypto-react</h1>

<p align="center">
  React hooks for client-side cryptography -- key generation, encryption, signing, and hashing in a single import.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/crypto-service/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/crypto-service/ci.yml?branch=main&style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/crypto-react"><img src="https://img.shields.io/npm/v/@sebastienrousseau/crypto-react?style=for-the-badge&logo=npm" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen?style=for-the-badge" alt="Coverage 100%" />
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-417e38?style=for-the-badge&logo=node.js" alt="Node >= 22" />
</p>

---

## Contents

- [Install](#install) — add the package and its peer dependency
- [Quick Start](#quick-start) — wrap your app and use a hook in five lines
- [CryptoProvider](#cryptoprovider) — shared configuration via React context
- [Hooks Reference](#hooks-reference) — every hook at a glance
- [Usage](#usage) — generate keys, encrypt, hash, sign, and verify
- [Examples](#examples) — runnable scripts in `examples/`
- [Security](#security) — client-side key handling guidelines
- [License](#license) — Apache-2.0 OR MIT

---

## Install

```bash
pnpm add @sebastienrousseau/crypto-react react
# or
npm install @sebastienrousseau/crypto-react react
```

`react` (>= 18.0.0) is a **peer dependency**. Both React 18 and React 19 are supported.

Requires **Node >= 22**.

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Quick Start

```tsx
import {
  CryptoProvider,
  useKeypair,
  useEncrypt,
  useHash,
  useSignature,
} from "@sebastienrousseau/crypto-react";

function App() {
  return (
    <CryptoProvider defaultKey="deadbeef...64-hex-chars">
      <MyComponent />
    </CryptoProvider>
  );
}

function MyComponent() {
  const { generate, publicKey } = useKeypair("ed25519");
  const { encrypt, decrypt } = useEncrypt();
  const { hash, digest } = useHash("sha3-256");
  const { sign, verify } = useSignature();

  return (
    <div>
      <button onClick={() => generate()}>Generate Ed25519 Key Pair</button>
      {publicKey && <code>{publicKey}</code>}
    </div>
  );
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## CryptoProvider

Wrap your component tree with `<CryptoProvider>` to supply shared configuration to all hooks.

```tsx
<CryptoProvider
  defaultKey="a1b2c3d4...64-hex-chars"
  serverUrl="https://crypto.example.com"
  apiKey="my-api-key"
>
  <App />
</CryptoProvider>
```

| Prop         | Type        | Description                              |
| ------------ | ----------- | ---------------------------------------- |
| `defaultKey` | `string`    | Hex-encoded 256-bit key for `useEncrypt` |
| `serverUrl`  | `string`    | Server URL for SDK-backed operations     |
| `apiKey`     | `string`    | API key for server authentication        |
| `children`   | `ReactNode` | Child components                         |

Access the context from any child via `useCryptoContext()`:

```tsx
import { useCryptoContext } from "@sebastienrousseau/crypto-react";

function Status() {
  const { serverUrl, defaultKey } = useCryptoContext();
  return <span>Server: {serverUrl ?? "none"}</span>;
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Hooks Reference

| Hook           | Purpose                              | Returns                                                        |
| -------------- | ------------------------------------ | -------------------------------------------------------------- |
| `useKeypair`   | Key pair generation (all algorithms) | `{ publicKey, privateKey, algorithm, generate, isGenerating }` |
| `useEncrypt`   | Symmetric encryption (secretbox)     | `{ encrypt, decrypt, ciphertext, plaintext, isProcessing }`    |
| `useHash`      | Cryptographic hashing                | `{ hash, digest, isHashing }`                                  |
| `useSignature` | Digital signatures (sign + verify)   | `{ sign, verify, signature, isValid, isProcessing }`           |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Usage

### Generate a key pair

```tsx
import { useKeypair } from "@sebastienrousseau/crypto-react";

function KeygenPage() {
  const { publicKey, privateKey, algorithm, generate, isGenerating } =
    useKeypair("ed25519");

  return (
    <div>
      <button onClick={() => generate()} disabled={isGenerating}>
        Generate Ed25519
      </button>
      <button onClick={() => generate("ml-dsa-65")} disabled={isGenerating}>
        Generate ML-DSA-65
      </button>
      {algorithm && <p>Algorithm: {algorithm}</p>}
      {publicKey && <code>{publicKey.slice(0, 64)}...</code>}
    </div>
  );
}
```

### Encrypt and decrypt

```tsx
import { useEncrypt } from "@sebastienrousseau/crypto-react";

function EncryptPage() {
  const { encrypt, decrypt, ciphertext, plaintext, isProcessing } =
    useEncrypt();

  return (
    <div>
      <button onClick={() => encrypt("secret message")} disabled={isProcessing}>
        Encrypt
      </button>
      {ciphertext && (
        <button onClick={() => decrypt(ciphertext)} disabled={isProcessing}>
          Decrypt
        </button>
      )}
      {plaintext && <p>Decrypted: {plaintext}</p>}
    </div>
  );
}
```

### Hash data

```tsx
import { useHash } from "@sebastienrousseau/crypto-react";

function HashPage() {
  const { hash, digest, isHashing } = useHash("sha3-256");

  return (
    <div>
      <button onClick={() => hash("Hello")} disabled={isHashing}>
        SHA3-256
      </button>
      <button onClick={() => hash("Hello", "blake3")} disabled={isHashing}>
        BLAKE3
      </button>
      {digest && <code>{digest}</code>}
    </div>
  );
}
```

### Sign and verify

```tsx
import { useKeypair, useSignature } from "@sebastienrousseau/crypto-react";

function SignPage() {
  const { publicKey, privateKey, generate } = useKeypair("ed25519");
  const { sign, verify, signature, isValid, isProcessing } = useSignature();

  return (
    <div>
      <button onClick={() => generate()}>Generate Keys</button>
      {privateKey && (
        <button
          onClick={() => sign(privateKey, "my message")}
          disabled={isProcessing}
        >
          Sign
        </button>
      )}
      {signature && publicKey && (
        <button
          onClick={() => verify(publicKey, "my message", signature)}
          disabled={isProcessing}
        >
          Verify
        </button>
      )}
      {isValid !== null && <p>Valid: {isValid ? "Yes" : "No"}</p>}
    </div>
  );
}
```

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Examples

All examples are self-contained TypeScript files in the `examples/` directory. They demonstrate hook logic outside of a React render tree using plain TypeScript. Run any example with:

```bash
npx ts-node examples/<name>.ts
```

| Category       | Example                             | Purpose                                       |
| -------------- | ----------------------------------- | --------------------------------------------- |
| Provider       | [provider.ts](examples/provider.ts) | CryptoProvider context setup and access       |
| Key Generation | [keygen.ts](examples/keygen.ts)     | Generate Ed25519 and ML-DSA-65 key pairs      |
| Encryption     | [encrypt.ts](examples/encrypt.ts)   | Secretbox encrypt and decrypt round-trip      |
| Hashing        | [hash.ts](examples/hash.ts)         | SHA-256, SHA3-256, and BLAKE3 hashing         |
| Signing        | [sign.ts](examples/sign.ts)         | Ed25519 sign and verify with tamper detection |
| Helpers        | [support.ts](examples/support.ts)   | Shared display helpers for example output     |

<p align="right"><a href="#contents">Back to Top</a></p>

---

## Security

**Client-side key handling warnings:**

- Private keys held in React state live in browser memory and are vulnerable to XSS, browser extensions, and memory inspection. Never persist private keys in `localStorage` or cookies.
- Prefer server-side key management for production workloads. Use the companion `@sebastienrousseau/crypto-sdk` to delegate operations to a trusted backend.
- These hooks are best suited for ephemeral operations (one-time encryption, signature verification, hashing) where the key material is short-lived.
- Always clear sensitive state when components unmount.
- Use `Content-Security-Policy` headers to limit script injection risks.

**Responsible disclosure.** Report vulnerabilities via [GitHub Security Advisories](https://github.com/sebastienrousseau/crypto-service/security/advisories).

<p align="right"><a href="#contents">Back to Top</a></p>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) or [MIT](https://opensource.org/licenses/MIT), at your option.

Copyright (c) 2022-2026 Sebastien Rousseau and The Crypto Service Suite contributors.

<p align="right"><a href="#contents">Back to Top</a></p>
