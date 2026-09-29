---
title: "Quantum-Safe Payments: Why the Payments Industry Must Act Now"
description: "Authoritative industry white paper produced for the Emerging Payments Association Asia (EPAA) by Sebastien Rousseau, analyzing the quantum threat to wholesale payment rails, SWIFT, RTGS, and instant payments."
eyebrow: "Industry White Paper · EPAA"
headline: "Quantum-Safe Payments: Why the Payments Industry Must Act Now"
lead: "A structural analysis of the threat cryptographically-relevant quantum computers pose to payment infrastructure across SWIFT, real-time gross settlement (RTGS) rails, and instant payments schemes."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2025-09-01"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Pastel morphing gradient with organic glass droplets"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<div class="whitepaper-doc-header">
<div class="book-meta">Published September 2025 · Sebastien Rousseau · Emerging Payments Association Asia (EPAA) Quantum-Safe Working Group</div>
<div class="whitepaper-doc-meta font-mono">
<span>Document ID: EPAA-QSP-2025-01</span>
<span>Classification: Public Industry Treatise</span>
<span>Target Rails: SWIFT · RTGS · ISO 20022 · Instant Payments</span>
<span>Status: Published</span>
</div>
</div>

<div class="whitepaper-doc-abstract">
<h3>Executive Abstract</h3>
<p>
Quantum computing threatens the foundational cryptographic algorithms securing global financial services. From wholesale interbank settlement to domestic instant payments, the infrastructure of commerce relies on asymmetric mathematical primitives—predominantly RSA and elliptic curve cryptography (ECC)—that will be rendered completely obsolete once a Cryptanalytically Relevant Quantum Computer (CRQC) is realized. Because adversaries are actively executing <em>Harvest Now, Decrypt Later (HNDL)</em> attacks against enterprise communication channels, the window for strategic preparation is not ten years away: it is present today.
</p>
<p>
This paper outlines the systemic exposure of payment rails across the Asia-Pacific region and global clearing houses, detailing the structural requirements for post-quantum cryptographic migration aligned with NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA). It argues for immediate industry coordination focused on cryptographic bill of materials (CBOM) inventories, dual-layer hybrid protocol encapsulation, and crypto-agility across core banking settlement engines.
</p>
</div>

<div class="research-toc-box">
<h3>Table of Contents</h3>
<ol>
<li><a href="#threat-horizon">1. The Quantum Threat Horizon to Interbank Rails</a></li>
<li><a href="#vulnerability-analysis">2. Vulnerability Assessment Across Payment Rails (SWIFT, RTGS, ACH)</a></li>
<li><a href="#hndl-mechanics">3. The Harvest Now, Decrypt Later (HNDL) Threat to Settlement Logs</a></li>
<li><a href="#nist-standards">4. NIST PQC Standards &amp; Algorithmic Transitions (FIPS 203/204/205)</a></li>
<li><a href="#payload-constraints">5. Operational Payload Constraints &amp; ISO 20022 Message Engineering</a></li>
<li><a href="#migration-blueprint">6. Actionable Five-Stage Institutional Migration Blueprint</a></li>
<li><a href="#recommendations">7. Policy Recommendations for Central Banks &amp; Scheme Operators</a></li>
</ol>
</div>

<hr class="section-divider">

<section id="threat-horizon" class="research-section">
<h2>1. The Quantum Threat Horizon to Interbank Rails</h2>
<p class="lead-text">
The global financial system transfers over $5 trillion daily across domestic Real-Time Gross Settlement (RTGS) schemes, interbank networks, and cross-border payment corridors. Every transaction, clearing message, and liquidity movement relies upon cryptographic integrity guarantees established in the late 20th century.
</p>
<p>
The mathematical foundation of these guarantees rests upon the computational difficulty of two problems: integer factorisation (the basis of RSA) and the discrete logarithm problem over elliptic curve groups (ECDSA, Ed25519, ECDH). In 1994, Peter Shor formulated a quantum algorithm demonstrating that a quantum computer operating with sufficient coherent physical qubits can solve both problems in polynomial time ($\mathcal{O}((\log N)^3)$).
</p>
<p>
Recent empirical advances in quantum error correction, neutral-atom qubit architectures, and topological qubit designs indicate that the threshold for cryptanalytically relevant quantum computation is compressing. Leading intelligence assessments (including the US NSA CNSA 2.0 timeline and the UK National Cyber Security Centre guidance) project that high-value symmetric and asymmetric infrastructure must transition to post-quantum algorithms between 2025 and 2030 to prevent systemic systemic failure.
</p>
</section>

<hr class="section-divider">

<section id="vulnerability-analysis" class="research-section">
<h2>2. Vulnerability Assessment Across Payment Rails</h2>
<p>
To understand the blast radius of quantum cryptanalysis on payments, we must differentiate between data-in-transit, message-level non-repudiation, and long-term cryptographic archives:
</p>

<div class="table-responsive">
<table class="comparison-table">
<thead>
<tr>
<th>Rail / Protocol</th>
<th>Classical Primitive</th>
<th>Vulnerability Mode</th>
<th>Quantum Blast Radius</th>
<th>Remediation Standard</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>SWIFT FIN / InterACT</strong></td>
<td>RSA-2048 / PKI Certificates</td>
<td>Shor's Algorithm (Factorisation)</td>
<td>Total key recovery; transaction spoofing</td>
<td>FIPS 204 (ML-DSA-65) Dual-Signatures</td>
</tr>
<tr>
<td><strong>ISO 20022 XML Payloads</strong></td>
<td>XML-DSig (ECDSA P-256)</td>
<td>Shor's Algorithm (Discrete Log)</td>
<td>Retroactive signature forgery; payload alteration</td>
<td>Hybrid X25519 + ML-KEM-768 Enveloping</td>
</tr>
<tr>
<td><strong>Domestic RTGS Schemes</strong></td>
<td>Hardware Security Modules (PKCS#11)</td>
<td>Firmware classical lock-in</td>
<td>HSM root-of-trust breach; clearing disruption</td>
<td>FIPS 140-3 Level 4 HSM Firmware with PQC</td>
</tr>
<tr>
<td><strong>Interbank TLS 1.3 Tunnels</strong></td>
<td>ECDHE (X25519 / secp256r1)</td>
<td>Passive harvest-now-decrypt-later</td>
<td>Historical packet decryption; credential leak</td>
<td>RFC 10024 Hybrid KEM (X25519 + ML-KEM)</td>
</tr>
</tbody>
</table>
</div>
</section>

<hr class="section-divider">

<section id="hndl-mechanics" class="research-section">
<h2>3. The Harvest Now, Decrypt Later (HNDL) Threat to Settlement Logs</h2>
<p>
The most urgent misconception in financial risk management is that quantum computers present zero immediate threat because hardware is still scaling. This fails to account for adversary operational doctrine:
</p>
<blockquote>
<p><strong>Harvest Now, Decrypt Later (HNDL)</strong> represents a present-day intelligence operation whereby adversary state actors systematically record and archive encrypted wholesale payment communications crossing international fiber optics. When a CRQC becomes operational, all archived historical session keys will be derived, exposing sovereign debt positions, corporate trade secrets, foreign exchange interventions, and beneficial ownership structures.</p>
</blockquote>
<p>
Under international financial regulations (including Basel III records retention rules and EU DORA Article 13), banks must maintain audit trails and non-repudiable settlement records for up to 30 years. Any payment transaction encrypted under classical RSA or ECC today is mathematically guaranteed to become plaintext within the legal lifespan of the contract.
</p>
</section>

<hr class="section-divider">

<section id="nist-standards" class="research-section">
<h2>4. NIST PQC Standards &amp; Algorithmic Transitions</h2>
<p>
In August 2024, the US National Institute of Standards and Technology (NIST) finalized the primary post-quantum cryptographic standards, transitioning them from theoretical candidates into formal Federal Information Processing Standards (FIPS):
</p>
<ul>
<li><strong>FIPS 203: Module-LWE Key Encapsulation Mechanism (ML-KEM)</strong> — Formerly CRYSTALS-Kyber. Standardized across three security parameters: ML-KEM-512, ML-KEM-768, and ML-KEM-1024. ML-KEM-768 provides NIST Security Level 3 (equivalent to AES-192) and serves as the global baseline for session key establishment.</li>
<li><strong>FIPS 204: Module-LWE Digital Signature Algorithm (ML-DSA)</strong> — Formerly CRYSTALS-Dilithium. The primary standard for digital signatures and identity authentication, operating across ML-DSA-44, ML-DSA-65, and ML-DSA-87. ML-DSA-65 provides Level 3 security with deterministic rejection sampling.</li>
<li><strong>FIPS 205: Stateless Hash-Based Digital Signature Algorithm (SLH-DSA)</strong> — Formerly SPHINCS+. Built entirely on cryptographic hash functions (SHAKE-256 / SHA-256), providing an unassailable mathematical alternative should future advances compromise structured lattice problems.</li>
</ul>
</section>

<hr class="section-divider">

<section id="payload-constraints" class="research-section">
<h2>5. Operational Payload Constraints &amp; ISO 20022 Message Engineering</h2>
<p class="lead-text">
While post-quantum lattice algorithms execute with remarkable computational speed, they trade computational cycles for increased key and ciphertext sizes:
</p>
<ul>
<li><strong>Classical ECDSA Signature:</strong> ~64 bytes.</li>
<li><strong>NIST ML-DSA-65 Signature:</strong> 3,309 bytes (a 51x increase in payload size).</li>
<li><strong>Classical ECDH Public Key:</strong> 32 bytes.</li>
<li><strong>NIST ML-KEM-768 Public Key:</strong> 1,184 bytes (a 37x increase).</li>
</ul>
<p>
In high-throughput core banking rails where thousands of messages are processed per second, unconsidered signature concatenation will violate network packet MTU limits (1,500 bytes on standard Ethernet) and trigger IP fragmentation.
</p>
<p>
Crypto Service Suite resolves this structural barrier by implementing an authenticated envelope encryption pattern: rather than attaching post-quantum signatures to every micro-transaction, session-level hybrid ML-KEM-768 key encapsulation authenticates the high-speed channel, while ISO 20022 message blocks (`pacs.008.001.10`) carry constant-time symmetric AEAD tokens (AES-256-GCM) with periodic lattice batch verification.
</p>
</section>

<hr class="section-divider">

<section id="migration-blueprint" class="research-section">
<h2>6. Actionable Five-Stage Institutional Migration Blueprint</h2>
<ol>
<li><strong>Phase 1: Cryptographic Asset Discovery (Q1–Q2 2025)</strong> — Generate continuous Cryptographic Bills of Materials (CBOM) across all payment microservices, API gateways, database schemas, and HSM partitions to catalog every classical curve and key length.</li>
<li><strong>Phase 2: Hybrid Dual-Layer Encapsulation (Q3 2025–Q1 2026)</strong> — Deploy dual-key hybrid schemes (RFC 10024 combining classical X25519 with FIPS 203 ML-KEM-768). If either algorithm fails, security remains intact.</li>
<li><strong>Phase 3: Hardware Security Module (HSM) Firmware Upgrades (Q2–Q4 2026)</strong> — Transition core cryptographic root custody to FIPS 140-3 validated HSM hardware supporting native lattice key generation.</li>
<li><strong>Phase 4: Message Format &amp; Scheme Standardization (Q1–Q4 2027)</strong> — Coordinate with SWIFT, RTGS operators, and central bank clearing authorities to validate post-quantum signature fields in ISO 20022 syntax.</li>
<li><strong>Phase 5: Classical Cryptographic Deprecation (2028–2029)</strong> — Enforce zero-tolerance deprecation of standalone RSA-2048 and ECDSA signatures across all external banking counterparty interfaces.</li>
</ol>
</section>

<hr class="section-divider">

<section id="recommendations" class="research-section">
<h2>7. Policy Recommendations for Central Banks &amp; Scheme Operators</h2>
<p>
Financial market authorities and scheme owners must establish mandatory transition milestones rather than discretionary advisories. We recommend the following actions:
</p>
<ul>
<li>Mandate CBOM compliance reporting under operational resilience frameworks (such as DORA in the EU and CPS 230 in Australia).</li>
<li>Establish sandboxes for testing high-throughput lattice signature verification over SWIFT messaging gateways.</li>
<li>Incentivize early adoption of sovereign Cryptography-as-a-Service (CaaS) architectures to remove third-party custodial counterparty risks.</li>
</ul>

<div class="whitepaper-citation">
<strong>Preferred Citation:</strong><br>
Rousseau, S. (2025). <em>Quantum-Safe Payments: Why the Payments Industry Must Act Now</em>. Emerging Payments Association Asia (EPAA) Quantum-Safe Cryptography Working Group. Canonical Document URI: https://docs.crypto-service.co/whitepapers/quantum-safe-payments/
</div>

<div class="book-actions">
<a class="pill primary" href="https://emergingpaymentsasia.org/wp-content/uploads/2025/09/Quantum-Safe-Payments-Why-the-Payments-Industry-Must-Act-Now.pdf" rel="external noopener">Download Official EPAA PDF (18.9 MB)</a>
<a class="pill ghost" href="/whitepapers/">Back to Publications Shelf</a>
</div>
</section>
