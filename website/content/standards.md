---
title: "Standards & Regulatory Alignment — Post-Quantum Financial Architecture"
description: "Which standards Crypto Service Suite implements (NIST FIPS 203/204/205 algorithms, RFC 9180, CycloneDX) and how it relates to EU DORA and NSA CNSA 2.0. Implemented algorithms are not a certification."
eyebrow: "Global Standards & Invariants"
headline: "Cryptographic Standards Implementation Matrix"
lead: "The algorithms and formats Crypto Service Suite implements, mapped to the standards that define them, with the limits of what that implementation claims."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2026-11-15"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Pastel morphing gradient with organic glass droplets"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<div class="standards-bar standards-bar-spaced">
<span class="standard-pill"><span class="pill-dot"></span> NIST FIPS 203 (ML-KEM)</span>
<span class="standard-pill"><span class="pill-dot"></span> NIST FIPS 204 (ML-DSA)</span>
<span class="standard-pill"><span class="pill-dot"></span> NIST FIPS 205 (SLH-DSA)</span>
<span class="standard-pill"><span class="pill-dot"></span> RFC 9180 (HPKE)</span>
<span class="standard-pill"><span class="pill-dot"></span> EU DORA (CONTEXT)</span>
<span class="standard-pill"><span class="pill-dot"></span> US NSA CNSA 2.0</span>
<span class="standard-pill"><span class="pill-dot"></span> CYCLONEDX 1.6 CBOM</span>
</div>

<section class="standards-matrix-section">
<h2>The Global Standards &amp; Regulatory Alignment Matrix</h2>
<p class="lead-text">
This matrix lists the standards whose algorithms or formats Crypto Service Suite implements. "Implemented" means the algorithm is available in the code; it is not a certification. No module in the suite is FIPS 140-3 validated, and the post-quantum algorithms come from <code>@noble/post-quantum</code>, which is not independently audited.
</p>

<div class="table-responsive">
<table class="comparison-table">
<thead>
<tr>
<th>Standard / Regulation</th>
<th>Authority</th>
<th>Mandate &amp; Scope</th>
<th>Implementation in Suite</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr id="fips203">
<td><strong>NIST FIPS 203</strong></td>
<td>NIST (United States)</td>
<td>Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)</td>
<td><code>@sebastienrousseau/crypto-lib</code> (512, 768, 1024)</td>
<td><span class="badge-status">Implemented (not validated)</span></td>
</tr>
<tr id="fips204">
<td><strong>NIST FIPS 204</strong></td>
<td>NIST (United States)</td>
<td>Module-Lattice-Based Digital Signature Algorithm (ML-DSA)</td>
<td><code>@sebastienrousseau/crypto-lib</code> (ML-DSA-44, 65, 87)</td>
<td><span class="badge-status">Implemented (not validated)</span></td>
</tr>
<tr id="fips205">
<td><strong>NIST FIPS 205</strong></td>
<td>NIST (United States)</td>
<td>Stateless Hash-Based Digital Signature Algorithm (SLH-DSA)</td>
<td><code>@sebastienrousseau/crypto-lib</code> (SHA-2 &amp; SHAKE variants)</td>
<td><span class="badge-status">Implemented (not validated)</span></td>
</tr>
<tr id="symmetric">
<td><strong>NIST SP 800-38D &amp; RFC 8439</strong></td>
<td>NIST &amp; IETF</td>
<td>Authenticated symmetric ciphers (AES-GCM; ChaCha20-Poly1305 in HPKE; XChaCha20-Poly1305 in crypto-lib, crypto-prisma and crypto-typeorm)</td>
<td><code>@sebastienrousseau/crypto-lib</code>, <code>crypto-prisma</code>, <code>crypto-typeorm</code></td>
<td><span class="badge-status">Implemented (not validated)</span></td>
</tr>
<tr id="hpke">
<td><strong>RFC 9180</strong></td>
<td>IETF</td>
<td>Hybrid Public Key Encryption (HPKE), base and PSK modes, checked against the RFC 9180 test vectors. The post-quantum suite is X-Wing (KEM <code>0x647A</code>, draft-connolly-cfrg-xwing-kem), tested against the draft's vectors; the earlier <code>x25519-ml-kem-768</code> suite is deprecated.</td>
<td><code>@sebastienrousseau/crypto-lib</code> (X-Wing, X25519, P-256)</td>
<td><span class="badge-status">Implemented (not validated)</span></td>
</tr>
<tr id="composite">
<td><strong>Composite ML-DSA (IETF draft)</strong></td>
<td>IETF LAMPS</td>
<td>Hybrid signatures in which neither half verifies alone (draft-ietf-lamps-pq-composite-sigs, revision 19)</td>
<td><code>@sebastienrousseau/crypto-lib</code> (ML-DSA-44 and ML-DSA-65 with Ed25519)</td>
<td><span class="badge-status">Implemented against a draft (not validated)</span></td>
</tr>
<tr id="hybrid-kem">
<td><strong>Hybrid KEM combiner (project ADR 0004)</strong></td>
<td>Crypto Service</td>
<td>X25519 + ML-KEM-768 secrets combined once (v2), binding both ciphertexts and both public keys; used by the sealed box, multi-recipient envelope and post-quantum streams. RFC 10024's TLS group names are exported as reference constants only and are not implemented.</td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
<td><span class="badge-status">Project-specific construction</span></td>
</tr>
<tr id="dora">
<td><strong>EU DORA (Regulation 2022/2554)</strong></td>
<td>European Commission (EBA/ESMA)</td>
<td>ICT risk management framework and related technical standards (including encryption and key management)</td>
<td><code>@sebastienrousseau/crypto-cbom</code> &amp; <code>crypto-kms</code></td>
<td><span class="badge-status">Supporting tools only; no compliance claim</span></td>
</tr>
<tr id="cnsa">
<td><strong>NSA CNSA 2.0</strong></td>
<td>National Security Agency</td>
<td>Commercial National Security Algorithm Suite requirements (2025–2030)</td>
<td><code>@sebastienrousseau/crypto-lib</code> (ML-KEM-1024, ML-DSA-87 available)</td>
<td><span class="badge-status">Algorithms available; not validated</span></td>
</tr>
<tr id="cbom">
<td><strong>CycloneDX 1.6 &amp; SPDX 3.0</strong></td>
<td>OWASP Foundation / Linux Foundation</td>
<td>Cryptographic Bill of Materials (CBOM) machine-readable spec</td>
<td><code>@sebastienrousseau/crypto-cbom</code> CLI &amp; API</td>
<td><span class="badge-status">Generator available (not run in CI)</span></td>
</tr>
</tbody>
</table>
</div>
</section>

<hr class="section-divider">

<section class="standards-detail-section">
<h2>Deep Technical Invariants &amp; Assurance Floors</h2>

<div class="grid-2x2">
<div class="card">
<div class="card-icon-header">
<span class="font-mono card-kpi">100%</span>
<h3>Coverage Gates</h3>
</div>
<p>
All 18 packages enforce 100% <strong>statement, branch, function and line</strong> coverage in CI (c8 with mocha). Coverage shows what the tests execute, not that the code is correct.
</p>
</div>

<div class="card">
<div class="card-icon-header">
<span class="font-mono card-kpi">7</span>
<h3>Small, Known Runtime Dependencies</h3>
</div>
<p>
<code>@sebastienrousseau/crypto-lib</code> has seven runtime dependencies: <code>@noble/ciphers</code>, <code>@noble/curves</code>, <code>@noble/hashes</code>, <code>@noble/post-quantum</code>, <code>openpgp</code>, <code>@openpgp/web-stream-tools</code> and <code>eckey-utils</code> (which OpenPGP.js needs for Brainpool curves). Lattice operations, NTTs and hash functions come from these libraries, or from the runtime's OpenSSL where Node.js 24.7 and later provides them; they are not implemented in crypto-lib.
</p>
</div>

<div class="card">
<div class="card-icon-header">
<span class="font-mono card-kpi">!</span>
<h3>No Constant-Time Guarantee</h3>
</div>
<p>
The suite makes no constant-time guarantee and has not been evaluated against timing side channels. <code>@noble/post-quantum</code> does not guarantee constant-time execution, and not every secret comparison in crypto-lib is constant-time.
</p>
</div>

<div class="card">
<div class="card-icon-header">
<span class="font-mono card-kpi">0x00</span>
<h3>Limited Memory Hygiene</h3>
</div>
<p>
crypto-lib exports <code>wipeMemory()</code> and <code>SecureBuffer</code> for callers, but its own APIs do not call them. Keys are mostly handled as hex strings, which JavaScript cannot wipe, so key material can remain on the heap until garbage collection.
</p>
</div>
</div>
</section>

<hr class="section-divider">

<section class="standards-cta-section text-center">
<h2>Plan Your Post-Quantum Migration</h2>
<p class="lead-text">
Talk to the maintainers about architecture reviews, cryptographic inventories for DORA work, and deploying hybrid post-quantum key exchange.
</p>
<div class="hero-cta-group">
<a class="btn btn-swift-mint btn-lg" href="/contact/">Request Architecture Assessment →</a>
<a class="btn btn-secondary btn-lg" href="/research/">Read 2027 Research White Paper →</a>
</div>
</section>
