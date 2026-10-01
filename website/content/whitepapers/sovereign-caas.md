---
title: "Sovereign CaaS: Eliminating Custodial Counterparty Risk in Financial Institutions"
description: "Architecture white paper on running a self-hosted Cryptography-as-a-Service (CaaS) tier with crypto-server inside a private VPC, what the suite provides today, and how it fits EU DORA ICT risk work."
eyebrow: "Architecture Blueprint · Sovereign CaaS"
headline: "Sovereign CaaS: Eliminating Custodial Counterparty Risk in Financial Institutions"
lead: "An architecture pattern for running a self-hosted cryptography service inside private VPCs, with an honest account of what Crypto Service Suite provides today."
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
<div class="book-meta">Sebastien Rousseau · Crypto Service Core Architecture Group</div>
<div class="whitepaper-doc-meta font-mono">
<span>Document ID: CSS-ARCH-2026-004</span>
<span>Classification: Technical Architecture Blueprint</span>
<span>Standards: NIST FIPS 203/204 algorithms (not a validated module)</span>
<span>Reference Implementation: @sebastienrousseau/crypto-server v0.0.7</span>
</div>
</div>

<div class="whitepaper-doc-abstract">
<h3>Executive Abstract</h3>
<p>
Engineering teams that rely only on multi-tenant cloud Key Management Services accept a dependency on a third party for key custody and availability. Teams that build their own cryptographic services take on the burden of getting the primitives, interfaces and operations right.
</p>
<p>
This paper describes a middle path: a <strong>self-hosted Cryptography-as-a-Service (CaaS) tier</strong> built on <code>@sebastienrousseau/crypto-server</code>, deployed inside an institution's own VPC or data centre. It states what the suite provides today and what it does not. An earlier version of this paper claimed more than 100,000 operations per second, sub-millisecond signatures over HTTP/2 and gRPC, a WebAssembly SIMD engine, HSM abstraction and DORA compliance; none of those claims was supported by the code, and they have been withdrawn.
</p>
</div>

<div class="research-toc-box">
<h3>Table of Contents</h3>
<ol>
<li><a href="#custodial-risk">1. Why Self-Host Cryptographic Services</a></li>
<li><a href="#caas-topology">2. Service Topology &amp; Isolation Boundaries</a></li>
<li><a href="#performance-engine">3. Performance</a></li>
<li><a href="#multi-cloud-kms">4. Key Management Backends</a></li>
<li><a href="#envelope-architecture">5. Envelope Encryption (DEK/KEK)</a></li>
<li><a href="#dora-compliance">6. Relationship to EU DORA</a></li>
<li><a href="#production-rollout">7. Production Deployment</a></li>
</ol>
</div>

<hr class="section-divider">

<section id="custodial-risk" class="research-section">
<h2>1. Why Self-Host Cryptographic Services</h2>
<p class="lead-text">
When applications delegate key storage and signing to a third-party cloud provider, they take on risks that some institutions prefer to control directly:
</p>
<ul>
<li><strong>Jurisdiction:</strong> providers subject to foreign law (such as the US CLOUD Act) may be compelled to provide access to customer data.</li>
<li><strong>Vendor lock-in:</strong> each provider's KMS API differs, which complicates multi-cloud redundancy.</li>
<li><strong>Quotas and latency:</strong> cloud KMS endpoints apply request quotas and add a network round trip to every operation.</li>
</ul>
<p>
A self-hosted service keeps key material on infrastructure the institution controls while exposing a standard interface to microservices.
</p>
</section>

<hr class="section-divider">

<section id="caas-topology" class="research-section">
<h2>2. Service Topology &amp; Isolation Boundaries</h2>
<p>
<code>@sebastienrousseau/crypto-server</code> is a Fastify REST service that exposes crypto-lib operations. What it provides today:
</p>

<div class="grid-2x2">
<div class="card">
<h3>1. Ingress</h3>
<p>REST endpoints with JSON schema validation, rate limiting, security headers, and API-key or HS256 JWT authentication. There is no gRPC, HTTP/2 or built-in mTLS; terminate TLS at a proxy or load balancer.</p>
</div>
<div class="card">
<h3>2. Cryptographic Execution</h3>
<p>crypto-lib in the same Node.js process: FIPS 203/204/205 algorithms via <code>@noble/post-quantum</code> (not a validated module, no constant-time guarantee) and AES-GCM or XChaCha20-Poly1305 via <code>@noble/ciphers</code>. There is no WebAssembly engine.</p>
</div>
<div class="card">
<h3>3. Key Management</h3>
<p>No HSM integration. crypto-kms offers AWS KMS and local in-memory providers; its GCP, Azure and Vault providers are stubs and its PKCS#11 provider is a software simulation for tests.</p>
</div>
<div class="card">
<h3>4. Telemetry &amp; Inventory</h3>
<p>Optional OpenTelemetry export, a Prometheus-format <code>/metrics</code> endpoint, structured JSON logs, and a <code>/v2/compliance/cbom</code> endpoint returning a CycloneDX 1.6 CBOM of the algorithms the service implements.</p>
</div>
</div>
</section>

<hr class="section-divider">

<section id="performance-engine" class="research-section">
<h2>3. Performance</h2>
<p class="lead-text">
No throughput or latency figures are published for crypto-server yet. The table in earlier versions of this paper (104,200 ops/sec, 0.72 ms P99 signing, comparisons with cloud KMS and hardware HSMs) was not produced by committed benchmark code and has been withdrawn.
</p>
<p>
To measure primitive latency on your own hardware, run <code>node benchmarks/crypto-bench.ts</code> from the repository after <code>pnpm -r run build</code>. Load-test the REST service in your target environment before sizing a deployment.
</p>
</section>

<hr class="section-divider">

<section id="multi-cloud-kms" class="research-section">
<h2>4. Key Management Backends</h2>
<p>
<code>@sebastienrousseau/crypto-kms</code> defines one <code>KmsProvider</code> interface. There is no multi-cloud broker or automatic failover.
</p>
<pre><code>import { AwsKmsProvider } from "@sebastienrousseau/crypto-kms";

const kms = new AwsKmsProvider({ region: "eu-west-1" });
const key = await kms.createKey("aes-256-gcm", "encrypt");
const { plaintext, ciphertext } = await kms.generateDataKey(key.keyId);</code></pre>
<p>
AWS KMS and the local in-memory provider are implemented. The GCP, Azure and HashiCorp Vault providers reject every call with <code>Not implemented</code>.
</p>
</section>

<hr class="section-divider">

<section id="envelope-architecture" class="research-section">
<h2>5. Envelope Encryption (DEK/KEK)</h2>
<p>
Envelope encryption avoids encrypting large volumes of data directly under a long-lived key:
</p>
<ol>
<li><strong>Data key generation:</strong> <code>generateDataKey()</code> returns a fresh 256-bit data encryption key (DEK) in plaintext and wrapped under the provider's key encryption key (KEK).</li>
<li><strong>Data encryption:</strong> the application encrypts the record locally, for example with AES-256-GCM (96-bit nonce, 128-bit tag).</li>
<li><strong>Storage:</strong> the application stores the wrapped DEK next to the ciphertext and unwraps it through the KMS when needed.</li>
<li><strong>Memory:</strong> JavaScript cannot guarantee that a plaintext DEK is wiped from memory; drop references promptly and keep process lifetimes and core-dump policies in mind.</li>
</ol>
</section>

<hr class="section-divider">

<section id="dora-compliance" class="research-section">
<h2>6. Relationship to EU DORA</h2>
<p>
The EU Digital Operational Resilience Act (Regulation 2022/2554) requires financial entities to maintain an ICT risk management framework, and its regulatory technical standards include requirements on encryption and cryptographic key management.
</p>
<p>
Crypto Service Suite can supply building blocks for that work, such as a cryptographic inventory (CBOM), algorithm choices and key management interfaces. Deploying it does not make an institution DORA compliant, and the suite has not been assessed by any regulator or auditor.
</p>
</section>

<hr class="section-divider">

<section id="production-rollout" class="research-section">
<h2>7. Production Deployment</h2>
<p>
If you deploy crypto-server, we suggest:
</p>
<ul>
<li>Run several instances across independent availability zones behind an internal load balancer.</li>
<li>Use the <code>/live</code> and <code>/ready</code> probe endpoints for health checks.</li>
<li>Terminate TLS in front of the service, enable authentication, and supply secrets through Kubernetes Secrets or an equivalent secret store.</li>
</ul>

<div class="whitepaper-citation">
<strong>Preferred Citation:</strong><br>
Rousseau, S. (2026). <em>Sovereign CaaS: Eliminating Custodial Counterparty Risk in Financial Institutions</em>. Crypto Service Architecture Blueprints. Reference Code: CSS-ARCH-2026-004. Canonical URI: https://docs.crypto-service.co/whitepapers/sovereign-caas/
</div>

<div class="book-actions">
<a class="pill primary" href="/solutions/#caas-server">Explore the CaaS Service</a>
<a class="pill ghost" href="/whitepapers/">Back to Publications Shelf</a>
</div>
</section>
