# @sebastienrousseau/crypto-react

React hooks for client-side cryptography -- key generation, encryption, signing, and hashing in a single import.

## Install

```bash
pnpm add @sebastienrousseau/crypto-react react
```

`react` (^18.0.0 or ^19.0.0) is a peer dependency.

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
```

## CryptoProvider

Wrap your component tree with `<CryptoProvider>` to supply shared
configuration to all hooks.

| Prop         | Type        | Description                              |
| ------------ | ----------- | ---------------------------------------- |
| `defaultKey` | `string`    | Hex-encoded 256-bit key for `useEncrypt` |
| `serverUrl`  | `string`    | Server URL for SDK-backed operations     |
| `apiKey`     | `string`    | API key for server authentication        |
| `children`   | `ReactNode` | Child components                         |

Access the context from any child via `useCryptoContext()`.

## Hooks Reference

| Hook           | Purpose                              | Returns                                                        |
| -------------- | ------------------------------------ | -------------------------------------------------------------- |
| `useKeypair`   | Key pair generation (all algorithms) | `{ publicKey, privateKey, algorithm, generate, isGenerating }` |
| `useEncrypt`   | Symmetric encryption (secretbox)     | `{ encrypt, decrypt, ciphertext, plaintext, isProcessing }`    |
| `useHash`      | Cryptographic hashing                | `{ hash, digest, isHashing }`                                  |
| `useSignature` | Digital signatures (sign + verify)   | `{ sign, verify, signature, isValid, isProcessing }`           |

## Usage Examples

### Generate a key pair

```tsx
import { useKeypair } from "@sebastienrousseau/crypto-react";

function KeygenPage() {
  const { publicKey, generate } = useKeypair("ed25519");

  return (
    <div>
      <button onClick={() => generate()}>Generate</button>
      {publicKey && <code>{publicKey}</code>}
    </div>
  );
}
```

### Encrypt and decrypt

```tsx
import { useEncrypt } from "@sebastienrousseau/crypto-react";

function EncryptPage() {
  const { encrypt, decrypt, ciphertext, plaintext } = useEncrypt();

  return (
    <div>
      <button onClick={() => encrypt("secret message")}>Encrypt</button>
      {ciphertext && (
        <button onClick={() => decrypt(ciphertext)}>Decrypt</button>
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
  const { hash, digest } = useHash("sha3-256");

  return (
    <div>
      <button onClick={() => hash("Hello")}>Hash</button>
      {digest && <code>{digest}</code>}
    </div>
  );
}
```

### Sign and verify

```tsx
import { useKeypair, useSignature } from "@sebastienrousseau/crypto-react";

function SignPage() {
  const { publicKey, privateKey, generate } = useKeypair();
  const { sign, verify, signature, isValid } = useSignature();

  return (
    <div>
      <button onClick={() => generate()}>Keygen</button>
      {privateKey && (
        <button onClick={() => sign(privateKey, "msg")}>Sign</button>
      )}
      {signature && publicKey && (
        <button onClick={() => verify(publicKey, "msg", signature)}>
          Verify
        </button>
      )}
      {isValid !== null && <p>Valid: {isValid ? "Yes" : "No"}</p>}
    </div>
  );
}
```

## Security

**Client-side key handling warnings:**

- Private keys held in React state live in browser memory and are
  vulnerable to XSS, browser extensions, and memory inspection. Never
  persist private keys in `localStorage` or cookies.
- Prefer server-side key management for production workloads. Use the
  companion `@sebastienrousseau/crypto-sdk` to delegate operations to a
  trusted backend.
- These hooks are best suited for ephemeral operations (one-time
  encryption, signature verification, hashing) where the key material
  is short-lived.
- Always clear sensitive state when components unmount.
- Use `Content-Security-Policy` headers to limit script injection risks.

## License

MIT OR Apache-2.0
