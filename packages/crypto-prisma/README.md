# @sebastienrousseau/crypto-prisma

Transparent field-level encryption for Prisma ORM, powered by XChaCha20-Poly1305 and Argon2id.

## Install

```bash
pnpm add @sebastienrousseau/crypto-prisma @prisma/client
```

## Quick Start

### 1. Define your Prisma schema

```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   // will be encrypted at rest
  phone     String?  // will be encrypted at rest
  name      String
  createdAt DateTime @default(now())
}

model Patient {
  id        Int    @id @default(autoincrement())
  ssn       String // will be encrypted at rest
  diagnosis String // will be encrypted at rest
  name      String
}
```

### 2. Set up the middleware

```ts
import { PrismaClient } from "@prisma/client";
import { createEncryptionMiddleware } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient();

prisma.$use(
  createEncryptionMiddleware({
    key: process.env.FIELD_ENCRYPTION_KEY!, // 64-char hex (256-bit)
    encryptedFields: [
      { model: "User", fields: ["email", "phone"] },
      { model: "Patient", fields: ["ssn", "diagnosis"] },
    ],
  }),
);

// Usage is completely transparent:
const user = await prisma.user.create({
  data: { name: "Alice", email: "alice@example.com", phone: "+1-555-0100" },
});
// email and phone are encrypted in the database
// but returned as plaintext to your application
console.log(user.email); // "alice@example.com"
```

### 3. Or use the Client Extension (Prisma 4.16+)

```ts
import { PrismaClient } from "@prisma/client";
import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";

const prisma = new PrismaClient().$extends(
  createFieldEncryptionExtension({
    key: process.env.FIELD_ENCRYPTION_KEY!,
    encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
  }),
);
```

## Configuration

| Option                | Type                                    | Required | Default                | Description                                    |
| --------------------- | --------------------------------------- | -------- | ---------------------- | ---------------------------------------------- |
| `key`                 | `string`                                | Yes      | --                     | 64-character hex string (256-bit key)          |
| `encryptedFields`     | `FieldConfig[]`                         | Yes      | --                     | Models and their fields to encrypt             |
| `algorithm`           | `"xchacha20-poly1305" \| "aes-256-gcm"` | No       | `"xchacha20-poly1305"` | Encryption algorithm                           |
| `deterministicFields` | `string[]`                              | No       | `[]`                   | Fields that use HMAC for searchable encryption |

### `FieldConfig`

| Property | Type       | Description                                      |
| -------- | ---------- | ------------------------------------------------ |
| `model`  | `string`   | Prisma model name (e.g. `"User"`, `"Patient"`)   |
| `fields` | `string[]` | Field names to encrypt (e.g. `["email", "ssn"]`) |

## How It Works

### Encrypt on Write

When you call `create`, `update`, or `upsert`, the middleware/extension intercepts the operation and encrypts the configured fields using XChaCha20-Poly1305 (secretbox) before the data reaches the database. Each encryption uses a fresh random 24-byte nonce, so identical plaintext values produce different ciphertexts.

### Decrypt on Read

When you call `findUnique`, `findFirst`, or `findMany`, the middleware/extension decrypts the configured fields before returning the result to your application. Your code never sees ciphertext.

### Graceful Fallback

If decryption fails (e.g. a field contains plaintext data from before encryption was enabled), the original value is returned as-is. This makes migration from plaintext to encrypted storage seamless.

## Searchable Encryption

For fields you need to query by exact match (e.g. looking up a user by email), use deterministic encryption via HMAC-SHA-256:

```ts
const prisma = new PrismaClient();

prisma.$use(
  createEncryptionMiddleware({
    key: process.env.FIELD_ENCRYPTION_KEY!,
    encryptedFields: [{ model: "User", fields: ["email", "phone"] }],
    deterministicFields: ["email"], // email is searchable
  }),
);

// This works because email is hashed deterministically:
const user = await prisma.user.findFirst({
  where: { email: "alice@example.com" },
});
```

**Trade-off:** Deterministic fields reveal when two rows have the same value for that field. Use this only for fields where exact-match search is essential.

## Examples

See the `examples/` directory for complete usage patterns:

- **[middleware.ts](./examples/middleware.ts)** -- Basic middleware setup and usage
- **[extension.ts](./examples/extension.ts)** -- Client extension approach
- **[searchable.ts](./examples/searchable.ts)** -- Deterministic encryption for search
- **[migration.ts](./examples/migration.ts)** -- Migrating existing plaintext data to encrypted

## License

MIT -- see [LICENSE](../../LICENSE) for details.
