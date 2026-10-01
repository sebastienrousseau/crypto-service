---
title: "Harvest-Now-Decrypt-Later (HNDL): Defending Long-Dated Enterprise Assets"
description: "Authoritative threat intelligence white paper analyzing Harvest-Now-Decrypt-Later attacks against enterprise financial records, corporate secrets, and long-dated customer archives."
eyebrow: "Threat Intelligence White Paper · HNDL"
headline: "Harvest-Now-Decrypt-Later: Defending Long-Dated Enterprise Assets"
lead: "An exhaustive architectural analysis detailing adversarial traffic interception, long-term cryptographic decay, and immediate hybrid post-quantum defenses."
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
<div class="book-meta">Published September 28, 2026 · Sebastien Rousseau · Threat Intelligence &amp; Vulnerability Directorate</div>
<div class="whitepaper-doc-meta font-mono">
<span>Document ID: CSS-THREAT-2026-002</span>
<span>Classification: Threat Intelligence Treatise</span>
<span>Threat Actor Tier: Advanced Persistent Threat (APT) / Sovereign Signals Intelligence</span>
<span>Primary Countermeasure: Hybrid Key Encapsulation (X25519 + ML-KEM-768)</span>
</div>
</div>

<div class="whitepaper-doc-abstract">
<h3>Executive Abstract</h3>
<p>
The most dangerous vector in modern cyber warfare does not involve immediate ransomware deployment, unauthorized database exfiltration, or denial-of-service disruptions. It is entirely silent. Under the <strong>Harvest-Now-Decrypt-Later (HNDL)</strong> attack paradigm, adversary state actors and cyber syndicates are systematically intercepting and archiving petabytes of encrypted corporate traffic traversing public transit networks, cloud cross-connects, and undersea optical cables.
</p>
<p>
Because financial transactions, sovereign debt portfolios, clinical healthcare data, and proprietary intellectual property possess legal and competitive lifespans exceeding 10 to 30 years, communications harvested today will remain catastrophic liabilities when early Cryptanalytically Relevant Quantum Computers (CRQCs) become operational. This technical paper models adversarial storage costs, quantum cryptanalytic timelines, and concrete mathematical engineering patterns to eliminate retroactive exposure today.
</p>
</div>

<div class="research-toc-box">
<h3>Table of Contents</h3>
<ol>
<li><a href="#adversarial-doctrine">1. Adversary Doctrine: Petabyte-Scale Harvesting Economics</a></li>
<li><a href="#long-dated-exposure">2. The Exposure Calculus of Long-Dated Enterprise Assets</a></li>
<li><a href="#cryptanalytic-decay">3. Cryptographic Decay Curves: Classical Diffie-Hellman vs. Shor's Algorithm</a></li>
<li><a href="#hybrid-encapsulation">4. Mathematical Architecture of Hybrid Dual-Key Encapsulation</a></li>
<li><a href="#database-at-rest">5. Defending Data-at-Rest: Retroactive Decryption of Encrypted Database Backups</a></li>
<li><a href="#implementation-patterns">6. Implementation Patterns Using Crypto Service Suite</a></li>
<li><a href="#executive-takeaways">7. Executive Takeaways &amp; Priority Remediation Checklist</a></li>
</ol>
</div>

<hr class="section-divider">

<section id="adversarial-doctrine" class="research-section">
<h2>1. Adversary Doctrine: Petabyte-Scale Harvesting Economics</h2>
<p class="lead-text">
State intelligence agencies operate with decades-long planning horizons. The economic cost of capturing and storing encrypted enterprise traffic has plummeted over the past decade:
</p>
<ul>
<li><strong>Storage Commodity Costs:</strong> High-density tape libraries and object storage allow archiving raw ciphertext at less than $0.001 per gigabyte per month.</li>
<li><strong>Targeted Interception Chokepoints:</strong> Traffic traversing major Internet Exchange Points (IXPs), cloud interconnects, and inter-datacenter fiber links is passively tapped via optical splitters without disrupting line-rate latency.</li>
<li><strong>Automated Metadata Indexing:</strong> Intercepted packets are classified by domain, TLS Server Name Indication (SNI), certificates, and target institution, creating an indexed catalog awaiting future quantum cryptanalytic compute.</li>
</ul>
<p>
Adversaries do not need to break encryption in real time; they need only wait until quantum factorization costs fall below the intelligence value of the stored data.
</p>
</section>

<hr class="section-divider">

<section id="long-dated-exposure" class="research-section">
<h2>2. The Exposure Calculus of Long-Dated Enterprise Assets</h2>
<p>
Most enterprise security architectures mistakenly treat data confidentiality as an ephemeral requirement. In reality, data value persists far longer than cryptographic algorithm longevity:
</p>

<div class="table-responsive">
<table class="comparison-table">
<thead>
<tr>
<th>Enterprise Asset Category</th>
<th>Statutory Retention Lifespan</th>
<th>Current Protection Mechanism</th>
<th>Quantum Compromise Impact</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Interbank Settlement &amp; SWIFT Logs</strong></td>
<td>20–30 Years (Basel III / AML)</td>
<td>RSA-2048 / ECDSA P-256</td>
<td>Complete retroactive ledger exposure; sovereign currency destabilization</td>
</tr>
<tr>
<td><strong>Corporate M&amp;A &amp; Strategic Deal Rooms</strong></td>
<td>10–15 Years</td>
<td>Classical TLS 1.3 (ECDHE)</td>
<td>Insider trading exposure; corporate espionage</td>
</tr>
<tr>
<td><strong>Institutional Custody &amp; Master Keys</strong></td>
<td>Indefinite / Permanent</td>
<td>PKCS#11 HSM RSA-4096</td>
<td>Exfiltration of digital asset reserves and sovereign key material</td>
</tr>
<tr>
<td><strong>Health Records &amp; Clinical Trials</strong></td>
<td>25–50 Years (HIPAA / GDPR)</td>
<td>AES-GCM with RSA-wrapped KEK</td>
<td>Catastrophic breach of patient privacy and biopharmaceutical IP</td>
</tr>
</tbody>
</table>
</div>
</section>

<hr class="section-divider">

<section id="cryptanalytic-decay" class="research-section">
<h2>3. Cryptographic Decay Curves: Classical Diffie-Hellman vs. Shor's Algorithm</h2>
<p>
When an enterprise exchanges keys using classical Diffie-Hellman (DH) or Elliptic Curve Diffie-Hellman (ECDH), the shared secret $K$ is computed as:
</p>
$$K = g^{ab} \pmod p \quad \text{or} \quad K = a \cdot (b \cdot G)$$
<p>
An adversary observing public keys $A = g^a$ and $B = g^b$ records these values alongside the encrypted payload. On a classical computer, extracting $a$ or $b$ requires solving the discrete logarithm problem—computationally infeasible ($\sim 2^{128}$ operations for secp256r1).
</p>
<p>
However, Shor's quantum algorithm evaluates modular exponentiation across quantum superpositions:
</p>
$$\mathcal{O}((\log N)^2 \cdot \log(\log N) \cdot \log(\log(\log N)))$$
<p>
With approximately 4,000 logical qubits operating under fault-tolerant quantum error correction, an adversary will reconstruct the private exponent $a$ in mere seconds. Every historic session key derived from that exchange is instantly compromised, retroactively decrypting the entire recorded session.
</p>
</section>

<hr class="section-divider">

<section id="hybrid-encapsulation" class="research-section">
<h2>4. Mathematical Architecture of Hybrid Dual-Key Encapsulation</h2>
<p class="lead-text">
To defeat HNDL attacks immediately without waiting for global classical deprecation, Crypto Service Suite implements a <strong>hybrid key encapsulation mechanism</strong> (X25519 + ML-KEM-768). Its combiner is specific to this library: it is neither the RFC 10024 TLS 1.3 key exchange nor X-Wing, so it does not interoperate with them. For TLS, use X25519MLKEM768 as specified in RFC 10024.
</p>
<p>
The hybrid scheme executes two concurrent key encapsulations:
</p>
<ol>
<li><strong>Classical Component:</strong> Elliptic curve key exchange using <code>X25519</code> generating shared secret $ss_{\text{classical}}$.</li>
<li><strong>Post-Quantum Component:</strong> Module-LWE lattice encapsulation using <code>ML-KEM-768</code> generating shared secret $ss_{\text{pqc}}$.</li>
</ol>
<p>
The final symmetric key $K_{\text{session}}$ is derived using an extract-and-expand Key Derivation Function (HKDF-SHA256):
</p>
$$K_{\text{session}} = \text{HKDF-SHA256}(\text{IKM} = ss_{\text{classical}} \mathbin{\Vert} ss_{\text{pqc}},\ \text{info} = \text{lp}(\texttt{label}) \mathbin{\Vert} \text{lp}(ct_{\text{classical}}) \mathbin{\Vert} \text{lp}(pk_{\text{classical}}) \mathbin{\Vert} \text{lp}(ct_{\text{pqc}}) \mathbin{\Vert} \text{lp}(pk_{\text{pqc}}),\ L = 32)$$
<p>
where $\text{lp}$ prefixes each value with its 4-byte big-endian length and $\texttt{label}$ is <code>crypto-service/hybrid-kem/v2/x25519-ml-kem-768</code>. Binding both ciphertexts and public keys means a substituted ciphertext or key changes the derived secret.
</p>
<p>
<strong>The design goal:</strong> an adversary must break <em>both</em> the classical elliptic-curve problem and the post-quantum lattice problem to recover the session key. If a quantum computer breaks X25519, ML-KEM-768 still protects the key; if lattice cryptanalysis advances unexpectedly, X25519 still provides classical security. This relies on correct implementations of both components; crypto-lib uses <code>@noble/curves</code> and <code>@noble/post-quantum</code>, and the latter is not independently audited and does not guarantee constant-time execution.
</p>
</section>

<hr class="section-divider">

<section id="database-at-rest" class="research-section">
<h2>5. Defending Data-at-Rest: Retroactive Decryption of Database Backups</h2>
<p>
HNDL is not restricted to network packets. Offsite database backups, Amazon S3 glacier snapshots, and disaster recovery archives represent prime targets for physical and logical theft.
</p>
<p>
A common mitigation pattern is <strong>envelope key re-wrapping</strong>. Crypto Service Suite does not automate it today; you can build it from crypto-lib primitives:
</p>
<ul>
<li>Existing data stays encrypted under its original data encryption keys (DEKs).</li>
<li>The DEKs, or the key encryption key (KEK) that wraps them, are re-wrapped under a key established with a hybrid X25519 + ML-KEM-768 KEM.</li>
<li>Record in the backup metadata which algorithms and parameters were used, so the inventory can be audited without decrypting customer data.</li>
</ul>
</section>

<hr class="section-divider">

<section id="implementation-patterns" class="research-section">
<h2>6. Implementation Patterns Using Crypto Service Suite</h2>
<p>
Establishing a hybrid X25519 + ML-KEM-768 shared secret with `@sebastienrousseau/crypto-lib`:
</p>
<pre><code>import {
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
} from "@sebastienrousseau/crypto-lib";

// 1. Alice generates an X25519 + ML-KEM-768 key pair
const alice = hybridKemKeygen(768);

// 2. Bob encapsulates a shared secret to Alice's public keys
const sent = hybridKemEncapsulate(768, alice.x25519PublicKey, alice.mlKemPublicKey);

// 3. Alice decapsulates with her private keys
const received = hybridKemDecapsulate(
768,
alice.x25519PrivateKey,
alice.mlKemSecretKey,
sent.x25519EphemeralPublic,
sent.mlKemCiphertext,
);

// received.sharedSecret === sent.sharedSecret</code></pre>
</section>

<hr class="section-divider">

<section id="executive-takeaways" class="research-section">
<h2>7. Executive Takeaways &amp; Priority Remediation Checklist</h2>
<ol>
<li><strong>Audit Traffic Egress Points:</strong> Identify all internet-facing endpoints transporting data with a confidentiality lifespan of $>5\text{ years}$.</li>
<li><strong>Upgrade Internal API Gateways:</strong> Mandate hybrid post-quantum key exchange (X25519 + ML-KEM-768) on all microservice service mesh boundaries.</li>
<li><strong>Re-wrap Long-Term Database Secrets:</strong> Ensure encrypted database backups and offline cold storage vaults are protected with post-quantum Key Encryption Keys.</li>
<li><strong>Deploy Sovereign CaaS:</strong> Centralize cryptographic operations within private network boundaries using `@sebastienrousseau/crypto-server`.</li>
</ol>

<div class="whitepaper-citation">
<strong>Preferred Citation:</strong><br>
Rousseau, S. (2026). <em>Harvest-Now-Decrypt-Later (HNDL): Defending Long-Dated Enterprise Assets</em>. Crypto Service Threat Intelligence Series. Reference: CSS-THREAT-2026-002. Canonical URI: https://docs.crypto-service.co/whitepapers/hndl-threat-model/
</div>

<div class="book-actions">
<a class="pill primary" href="/research/#threat-model">Inspect Threat Models</a>
<a class="pill ghost" href="/whitepapers/">Back to Publications Shelf</a>
</div>
</section>
