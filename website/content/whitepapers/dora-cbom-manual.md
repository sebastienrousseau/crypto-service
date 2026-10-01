---
title: "CBOM Manual: Cryptographic Inventories for DORA Work"
description: "Implementation guide for generating CycloneDX 1.6 Cryptographic Bills of Materials (CBOM) with crypto-cbom, auditing them for weak algorithms, and using them as inventory input for EU DORA ICT risk work."
eyebrow: "Implementation Guide · DORA & CBOM"
headline: "CBOM Manual: Cryptographic Inventories for DORA Work"
lead: "How to generate CycloneDX 1.6 Cryptographic Bills of Materials with crypto-cbom and use them as inventory input for Digital Operational Resilience Act (DORA) work. A CBOM does not by itself establish compliance."
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
<div class="book-meta">Sebastien Rousseau · Governance, Risk &amp; Compliance</div>
<div class="whitepaper-doc-meta font-mono">
<span>Document ID: CSS-COMP-2026-005</span>
<span>Classification: Implementation Guide</span>
<span>Context: EU DORA (Regulation 2022/2554) ICT risk management</span>
<span>Standard: CycloneDX v1.6 CBOM · SPDX 3.0</span>
</div>
</div>

<div class="whitepaper-doc-abstract">
<h3>Executive Abstract</h3>
<p>
The EU <strong>Digital Operational Resilience Act (DORA)</strong> requires financial entities to maintain an ICT risk management framework, and its regulatory technical standards include requirements on encryption and cryptographic key management. Knowing which algorithms your systems use is a practical first step.
</p>
<p>
This guide shows how to produce that inventory as a <strong>CycloneDX 1.6 Cryptographic Bill of Materials (CBOM)</strong> with <code>@sebastienrousseau/crypto-cbom</code>, and how to flag weak algorithms in CI. It is not legal advice. Generating a CBOM does not make a system DORA compliant, and the tool has not been assessed by any supervisor or auditor. An earlier version of this guide attributed specific obligations and penalties to DORA Articles 13 and 14 and described features (SARIF output, evidence bundles, key-rotation proofs) that do not exist; those statements have been withdrawn.
</p>
</div>

<div class="research-toc-box">
<h3>Table of Contents</h3>
<ol>
<li><a href="#dora-mandates">1. Where a Cryptographic Inventory Fits</a></li>
<li><a href="#cbom-anatomy">2. What a CBOM Contains</a></li>
<li><a href="#automated-pipeline">3. Generating and Auditing a CBOM in CI</a></li>
<li><a href="#deprecation-rules">4. Algorithm Classification Used by the Audit</a></li>
<li><a href="#third-party-risk">5. Third-Party Providers</a></li>
<li><a href="#evidence-generation">6. What the Tool Produces</a></li>
<li><a href="#checklist">7. A Practical Starting Checklist</a></li>
</ol>
</div>

<hr class="section-divider">

<section id="dora-mandates" class="research-section">
<h2>1. Where a Cryptographic Inventory Fits</h2>
<p class="lead-text">
DORA's ICT risk management requirements, and the regulatory technical standards made under it, expect financial entities to manage encryption and cryptographic keys deliberately. Check the regulation and the standards themselves, or your legal and compliance teams, for the exact obligations that apply to you.
</p>
<p>
Whatever the precise obligations, you cannot manage algorithms you have not inventoried. A CBOM gives a machine-readable list of the algorithms found in your code that you can review, track over time and feed into your own risk processes.
</p>
</section>

<hr class="section-divider">

<section id="cbom-anatomy" class="research-section">
<h2>2. What a CBOM Contains</h2>
<p>
A CycloneDX 1.6 CBOM lists cryptographic assets as components with <code>crypto-properties</code>, such as the primitive, parameter set and the functions used. crypto-cbom builds these entries from the algorithm names it finds when scanning source files. The <code>/v2/compliance/cbom</code> endpoint of crypto-server returns a CBOM of the algorithms that service implements.
</p>
</section>

<hr class="section-divider">

<section id="automated-pipeline" class="research-section">
<h2>3. Generating and Auditing a CBOM in CI</h2>
<p class="lead-text">
Install <code>@sebastienrousseau/crypto-cbom</code> from npm (0.0.8 or later). Its CLI has two commands: <code>scan</code> writes a CycloneDX (or, with <code>--format spdx</code>, SPDX) CBOM, and <code>audit</code> validates a CBOM and prints an audit.
</p>
<pre><code>crypto-cbom scan src/ --format cyclonedx --output cbom.cdx.json
crypto-cbom audit cbom.cdx.json</code></pre>
<p>
Because <code>audit</code> exits with status 1 when the inventory fails its checks, you can run it as a CI step to stop a pull request that introduces broken algorithms. It prints JSON; it does not produce SARIF or line-level annotations.
</p>
</section>

<hr class="section-divider">

<section id="deprecation-rules" class="research-section">
<h2>4. Algorithm Classification Used by the Audit</h2>
<p>
The audit classifies each asset by name. This is a heuristic based on the algorithm name, not a regulatory classification:
</p>
<div class="table-responsive">
<table class="comparison-table">
<thead>
<tr>
<th>Algorithm names matched</th>
<th>Audit classification</th>
<th>Suggested replacement</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>MD5, SHA-1, DES/3DES, RC4, ECB</strong></td>
<td>Broken or deprecated</td>
<td>SHA-256/SHA-512; AES-256-GCM or ChaCha20-Poly1305</td>
</tr>
<tr>
<td><strong>RSA, ECC, ECDSA, Ed25519</strong></td>
<td>Vulnerable to a future quantum computer</td>
<td>Hybrid or post-quantum KEMs (ML-KEM) and signatures (ML-DSA)</td>
</tr>
<tr>
<td><strong>AES-128, CBC mode</strong></td>
<td>Transitional</td>
<td>AES-256-GCM or ChaCha20-Poly1305</td>
</tr>
<tr>
<td><strong>Other names (for example ML-KEM, ML-DSA)</strong></td>
<td>Not flagged</td>
<td>None</td>
</tr>
</tbody>
</table>
</div>
</section>

<hr class="section-divider">

<section id="third-party-risk" class="research-section">
<h2>5. Third-Party Providers</h2>
<p>
DORA also covers the management of ICT third-party risk. When you depend on external software or service providers, consider asking them for a CBOM with each major release and for their post-quantum migration plans, so their cryptography can be included in your own inventory.
</p>
</section>

<hr class="section-divider">

<section id="evidence-generation" class="research-section">
<h2>6. What the Tool Produces</h2>
<ul>
<li><code>crypto-cbom scan</code>: a CycloneDX 1.6 or SPDX 3.0 CBOM document.</li>
<li><code>crypto-cbom audit</code>: a JSON audit result with findings per asset and a summary score.</li>
</ul>
<p>
There is no evidence bundle, key-rotation proof or auditor package. Treat the output as engineering input to be reviewed by people accountable for your compliance.
</p>
</section>

<hr class="section-divider">

<section id="checklist" class="research-section">
<h2>7. A Practical Starting Checklist</h2>
<ol>
<li><strong>Discover:</strong> run <code>crypto-cbom scan</code> across your repositories and collect the CBOMs.</li>
<li><strong>Review:</strong> check the findings by hand; name-based scanning misses indirect uses and can flag false positives.</li>
<li><strong>Remediate:</strong> remove broken algorithms (DES/3DES, RC4, MD5, SHA-1) from active use.</li>
<li><strong>Plan:</strong> record where quantum-vulnerable public-key algorithms are used and plan their migration with your risk and compliance teams.</li>
</ol>

<div class="whitepaper-citation">
<strong>Preferred Citation:</strong><br>
Rousseau, S. (2026). <em>CBOM Manual: Cryptographic Inventories for DORA Work</em>. Crypto Service Governance Series. Reference: CSS-COMP-2026-005. Canonical URI: https://docs.crypto-service.co/whitepapers/dora-cbom-manual/
</div>

<div class="book-actions">
<a class="pill primary" href="/standards/#cbom">Explore CycloneDX CBOM Tooling</a>
<a class="pill ghost" href="/whitepapers/">Back to Publications Shelf</a>
</div>
</section>
