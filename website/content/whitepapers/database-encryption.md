---
title: "Transparent Column-Level Database Encryption with Prisma & TypeORM"
description: "Engineering white paper on transparent field-level authenticated encryption (XChaCha20-Poly1305) with the crypto-prisma and crypto-typeorm adapters: how they work today and what they do not yet do."
eyebrow: "Database Security White Paper · ORM Field Encryption"
headline: "Transparent Column-Level Database Encryption with Prisma & TypeORM"
lead: "An architectural guide to authenticated field-level encryption in application code with the Prisma and TypeORM adapters, including their current limits."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2026-09-28"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Pastel morphing gradient with organic glass droplets"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<div class="whitepaper-doc-header">
<div class="book-meta">Sebastien Rousseau · Architecture Practice</div>
<div class="whitepaper-doc-meta font-mono">
<span>Document ID: CSS-DATA-2026-007</span>
<span>Classification: Technical Engineering White Paper</span>
<span>Supported ORMs: Prisma Client (extensions and middleware) · TypeORM</span>
</div>
</div>

<div class="whitepaper-doc-abstract">
<h3>Executive Abstract</h3>
<p>
Transparent Data Encryption (TDE) at the storage layer protects against theft of disks and snapshots, but anyone who can query the database still reads plaintext. Application-level field encryption closes that gap by encrypting sensitive values before they leave application memory.
</p>
<p>
<code>@sebastienrousseau/crypto-prisma</code> and <code>@sebastienrousseau/crypto-typeorm</code> provide this for Prisma and TypeORM. Both encrypt configured fields with XChaCha20-Poly1305 (crypto-lib's <code>secretbox</code>) under a single 256-bit key supplied by the application. An earlier version of this paper described AES-256-GCM envelope encryption with ML-KEM-768 key wrapping, KMS-backed key rotation, a <code>crypto-cli db rekey</code> command, Drizzle support and measured query overheads; none of that exists in the code, and those claims have been withdrawn.
</p>
</div>

<div class="research-toc-box">
<h3>Table of Contents</h3>
<ol>
<li><a href="#tde-limitations">1. Limits of Disk-Level TDE</a></li>
<li><a href="#envelope-orm-architecture">2. How the Adapters Encrypt Fields</a></li>
<li><a href="#prisma-extension">3. Prisma Client Extension</a></li>
<li><a href="#typeorm-decorators">4. TypeORM Column Decorator</a></li>
<li><a href="#kms-key-rotation">5. Key Management and Rotation</a></li>
<li><a href="#performance-impact">6. Performance</a></li>
<li><a href="#migration-guide">7. Migrating Existing Data</a></li>
</ol>
</div>

<hr class="section-divider">

<section id="tde-limitations" class="research-section">
<h2>1. Limits of Disk-Level TDE</h2>
<p class="lead-text">
Storage-volume encryption and database TDE protect data on disk. They do not protect against:
</p>
<ul>
<li><strong>Over-privileged access:</strong> any account with <code>SELECT</code> permission reads sensitive columns in plaintext.</li>
<li><strong>SQL injection:</strong> the engine decrypts blocks for every query, so an injection returns plaintext rows.</li>
<li><strong>Replicas, logs and dumps:</strong> replication streams, query logs and exports may contain plaintext values.</li>
</ul>
<p>
Encrypting sensitive fields in the application means the database only stores ciphertext for those fields.
</p>
</section>

<hr class="section-divider">

<section id="envelope-orm-architecture" class="research-section">
<h2>2. How the Adapters Encrypt Fields</h2>
<ol>
<li><strong>Key:</strong> the application supplies one 256-bit key as a 64-character hex string. The adapters do not fetch or wrap keys through a KMS.</li>
<li><strong>Encryption:</strong> each configured value is serialised to UTF-8 and sealed with XChaCha20-Poly1305 using a random 24-byte nonce.</li>
<li><strong>Encoding:</strong> the stored value is base64 of <code>nonce || ciphertext || tag</code>, so the column must be a text type large enough to hold it.</li>
<li><strong>Searchable fields (Prisma only):</strong> fields listed as deterministic are stored as an HMAC-SHA256 of the value instead. They support equality lookups but cannot be decrypted.</li>
</ol>
</section>

<hr class="section-divider">

<section id="prisma-extension" class="research-section">
<h2>3. Prisma Client Extension</h2>
<p class="lead-text">
<code>createFieldEncryptionExtension()</code> returns a Prisma Client extension (<code>$extends</code>); <code>createEncryptionMiddleware()</code> offers the older <code>$use</code> style.
</p>
<pre><code>import { PrismaClient } from "@prisma/client";
import { createFieldEncryptionExtension } from "@sebastienrousseau/crypto-prisma";

export const prisma = new PrismaClient().$extends(
createFieldEncryptionExtension({
key: process.env.FIELD_ENCRYPTION_KEY!, // 64 hex characters
encryptedFields: [
{ model: "AccountHolder", fields: ["nationalId", "bankAccountNumber"] },
],
deterministicFields: ["nationalId"], // HMAC, searchable, not decryptable
}),
);</code></pre>
<p>
The <code>algorithm</code> option is accepted but ignored: values are always sealed with XChaCha20-Poly1305.
</p>
</section>

<hr class="section-divider">

<section id="typeorm-decorators" class="research-section">
<h2>4. TypeORM Column Decorator</h2>
<p>
<code>@sebastienrousseau/crypto-typeorm</code> provides an <code>@EncryptedColumn()</code> decorator backed by a column transformer, and an <code>EncryptionSubscriber</code>:
</p>
<pre><code>import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { EncryptedColumn } from "@sebastienrousseau/crypto-typeorm";

@Entity()
export class CorporateTreasuryAccount {
@PrimaryGeneratedColumn("uuid")
id: string;

@Column()
legalEntityName: string;

// Key from options.encrypt.key or the TYPEORM_ENCRYPTION_KEY env var
@EncryptedColumn({ encrypt: { key: process.env.COLUMN_ENCRYPTION_KEY! } })
beneficiaryRoutingNumber: string;
}</code></pre>
</section>

<hr class="section-divider">

<section id="kms-key-rotation" class="research-section">
<h2>5. Key Management and Rotation</h2>
<p class="lead-text">
The adapters take a raw key from the application. They have no KMS integration, no key versioning in the stored value, and no rotation tooling.
</p>
<p>
To rotate a key today, read each row with the old key and write it back with the new one in an application-level migration. If you need envelope encryption, generate and unwrap data keys with <code>@sebastienrousseau/crypto-kms</code> (AWS KMS is implemented) and pass the unwrapped key to the adapter.
</p>
</section>

<hr class="section-divider">

<section id="performance-impact" class="research-section">
<h2>6. Performance</h2>
<p>
No query-overhead measurements are published. The table in earlier versions of this paper did not come from committed benchmark code and has been withdrawn. Measure the overhead in your own environment before adopting the adapters on hot paths.
</p>
</section>

<hr class="section-divider">

<section id="migration-guide" class="research-section">
<h2>7. Migrating Existing Data</h2>
<p>
When the Prisma adapter cannot decrypt a stored value (for example, a legacy plaintext row), it returns the stored value unchanged. That behaviour allows a gradual migration:
</p>
<ol>
<li>Change the target column to a text type large enough for the base64 ciphertext.</li>
<li>Deploy the adapter. New writes are encrypted; unencrypted legacy values are still returned as stored.</li>
<li>Run a batch job that reads and rewrites legacy rows so they are encrypted.</li>
<li>Verify that no plaintext rows remain. Note that a value that fails authentication is also returned unchanged rather than raising an error.</li>
</ol>

<div class="whitepaper-citation">
<strong>Preferred Citation:</strong><br>
Rousseau, S. (2026). <em>Transparent Column-Level Database Encryption with Prisma &amp; TypeORM</em>. Crypto Service Database Architecture Series. Reference: CSS-DATA-2026-007. Canonical URI: https://docs.crypto-service.co/whitepapers/database-encryption/
</div>

<div class="book-actions">
<a class="pill primary" href="/solutions/#field-encryption">Explore Database Field Encryption Solution</a>
<a class="pill ghost" href="/whitepapers/">Back to Publications Shelf</a>
</div>
</section>
