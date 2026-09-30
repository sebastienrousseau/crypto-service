---
title: "About Us & Institutional Governance — Crypto Service Suite"
description: "Institutional governance, engineering philosophy, and architectural standards behind the 18 lockstep packages in Crypto Service Suite."
eyebrow: "Governance & Engineering Philosophy"
headline: "Sovereign Cryptographic Infrastructure for Modern Enterprise & Cloud Stacks"
lead: "Crypto Service Suite is an open-source TypeScript monorepo with enforced test coverage gates, a small set of well-known runtime dependencies, and self-hostable deployment."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2026-09-28"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Pastel morphing gradient with organic glass droplets"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<section class="about-hero-section" id="mandate">
<h2>The Sovereign Infrastructure Mandate</h2>
<p class="lead-text">
Modern enterprise architectures cannot outsource their foundational cryptographic trust to third-party hosted black-boxes or custodial intermediaries. Custodial dependency introduces counterparty solvency risk, regulatory exposure, and single points of operational failure.
</p>
<p>
Crypto Service Suite is open-source software you can run on your own infrastructure, on-premises or in a private cloud. It does not integrate with hardware security modules (HSMs): the crypto-kms PKCS#11 provider is an in-memory software simulation for tests.
</p>
</section>

<hr class="section-divider">

<section class="about-architecture-section" id="zero-dependency">
<h2>The Four-Layer Monorepo Architecture</h2>
<p>
The suite is divided into 18 specialized, decoupled packages maintained in a strict monorepo moving in lockstep semantic versioning:
</p>

<div class="grid-2x2">
<div class="card">
<span class="solution-badge font-mono">LAYER 1 // FOUNDATION</span>
<h3>Core Primitives</h3>
<p>
<code>@sebastienrousseau/crypto-lib</code> implements FIPS 203/204/205 algorithms (via <code>@noble/post-quantum</code>; not a validated cryptographic module) and classical ciphers built on the <code>@noble/*</code> libraries and OpenPGP.js. <code>@sebastienrousseau/crypto-wasm</code> is a placeholder and contains no WebAssembly code yet.
</p>
</div>
<div class="card">
<span class="solution-badge font-mono">LAYER 2 // INFRASTRUCTURE &amp; ORM</span>
<h3>KMS, Edge &amp; Database Field Encryption</h3>
<p>
<code>@sebastienrousseau/crypto-kms</code>, <code>crypto-edge</code>, <code>crypto-prisma</code>, and <code>crypto-typeorm</code> provide a unified KMS interface (AWS and local providers implemented; GCP, Azure and Vault are stubs), edge runtime support (Cloudflare Workers, Vercel Edge, Deno, Bun, browsers), and transparent database column encryption.
</p>
</div>
<div class="card" id="versioning">
<span class="solution-badge font-mono">LAYER 3 // PROTOCOLS &amp; CLIENTS</span>
<h3>Servers, APIs, SDK &amp; UI Integrations</h3>
<p>
<code>@sebastienrousseau/crypto-server</code>, <code>crypto-api</code>, <code>crypto-cli</code>, <code>crypto-sdk</code>, <code>crypto-react</code>, and <code>crypto-vue</code> expose a Fastify REST service, a zero-dependency fetch-based SDK client, an interactive CLI, and reactive frontend hooks.
</p>
</div>
<div class="card">
<span class="solution-badge font-mono">LAYER 4 // ASSURANCE &amp; AI</span>
<h3>Regulatory Auditing, IDE Static Analysis &amp; AI Tooling</h3>
<p>
<code>@sebastienrousseau/crypto-cbom</code>, <code>crypto-lsp</code>, <code>crypto-mcp</code>, <code>crypto-benchmarks</code>, and <code>crypto-testing</code> deliver CycloneDX 1.6 and SPDX 3.0 cryptographic bills of materials, Language Server Protocol linting, Model Context Protocol server tools, benchmarking harnesses, and test fixtures.
</p>
</div>
</div>
</section>

<hr class="section-divider">

<section class="about-governance-section" id="coverage">
<h2>Engineering Discipline &amp; Verification Gates</h2>

<div class="callout-box">
<h3>Quality Gates and Known Limits</h3>
<ul>
<li id="invariants"><strong>Coverage gates:</strong> CI enforces 100% line and function coverage in every package (mocha and c8), and 100% branch coverage in every package except crypto-lib (99.5%).</li>
<li id="verification"><strong>Memory zeroization is limited:</strong> crypto-lib exports <code>wipeMemory()</code> and <code>SecureBuffer</code>, but its own APIs do not call them, and keys passed as hex strings cannot be wiped.</li>
<li id="disclosure"><strong>No constant-time guarantee:</strong> The implementations have not been formally verified against timing side channels. <code>@noble/post-quantum</code> does not guarantee constant-time execution.</li>
<li id="licensing"><strong>Licensing and supply chain:</strong> Dual-licensed under Apache 2.0 and MIT. CI generates a software bill of materials (SBOM) and runs <code>pnpm audit</code> and CodeQL.</li>
<li id="dora"><strong>Regulation:</strong> The suite provides building blocks, such as a CycloneDX CBOM generator, that can support DORA (EU 2022/2554) work. Using it does not make a system DORA compliant.</li>
</ul>
</div>
</section>

<hr class="section-divider">

<section class="about-cta-section text-center">
<h2>Engage with the Maintainers</h2>
<p class="lead-text">
Learn how fintechs, banks, and enterprise engineering teams leverage Crypto Service Suite for sovereign cryptographic operations.
</p>
<div class="hero-cta-group">
<a class="btn btn-swift-mint btn-lg" href="/contact/">Request Architecture Briefing →</a>
<a class="btn btn-secondary btn-lg" href="https://github.com/sebastienrousseau/crypto-service" target="_blank" rel="noopener">GitHub Specifications →</a>
</div>
</section>
