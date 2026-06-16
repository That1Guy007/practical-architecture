---
title: "Post-Quantum Cryptography, Demystified. Part 2"
date: 2026-06-15
lastmod: 2026-06-15
draft: true
description: "Part 2 - Quantum cryptohraphy vs classical cryptography and the path towards adoption."
summary: "Part 2 - Understanding the current state of PQC, the threats, and how to start to mitigate those risks"
# series: ["Demystified"]
series_order: 2
tags: ["cryptography", "pqc", "security", "quantum"]
categories: ["demystified"]
showComments: true
showTableOfContents: false
showReadingTime: true
showHero: true
heroStyle: "big"
---

<!-- My idea for this post is to help people understand what is PQC, what I am seeing in the industry and how they can start to prepare for PQC.  -->

#### TL;DR

*Cryptographically Relevant Quantum Computers, or CRQCs, are on the horizon. When they arrive, they will threaten many of the public-key cryptography algorithms that secure today’s digital world.*

*The time has come to prepare.*

*Organizations need to enable their teams, ask better vendor questions, inventory their cryptographic ecosystem, prioritize the highest-risk systems, create a course of action, execute migrations, automate certificate and key lifecycle management, and build crypto agility so they can transition from classical cryptography to quantum-resistant cryptography without treating every future algorithm change like a once-in-a-generation fire drill.*


## Practical Architecture Considerations

This is where PQC becomes real.

It is easy to say, "We need to migrate to quantum-resistant cryptography."

It is much harder to answer:

* Where is cryptography being used?
* Which systems use RSA, ECDSA, ECDH, or other quantum-vulnerable algorithms?
* Which data has a long confidentiality lifetime?
* Which vendors are responsible for cryptographic implementation?
* Which certificates, keys, APIs, devices, and applications are affected?
* Which systems cannot support larger keys or signatures?
* Which systems are externally exposed?
* Which systems are regulated?
* Who owns the migration?

That is why I think organizations should treat PQC as a practical architecture program, not as a narrow cryptography upgrade.

### Implementation

The first implementation step is not replacing algorithms.

The first step is inventory.

Organizations need a Cryptographic Bill of Materials, or CBOM, that identifies where cryptography exists across software, infrastructure, devices, certificates, protocols, APIs, SaaS platforms, identity systems, and vendor products.

A useful CBOM should answer more than "what algorithm is used?" It should also capture:

* System name
* Business owner
* Technical owner
* Data classification
* Algorithm
* Key size
* Certificate authority
* Certificate expiration
* Protocol
* Library or product implementing the cryptography
* Vendor dependency
* Exposure level
* Data confidentiality lifetime
* Migration readiness
* Compensating controls
* Replacement path

Without this inventory, teams are guessing.

After inventory, organizations can begin testing PQC-capable libraries, platforms, gateways, PKI tools, HSMs, service mesh capabilities, and vendor products. The goal is not to flip everything to PQC overnight. The goal is to understand what is possible, what breaks, and what needs sequencing.

### Migration

The migration should be phased.

A practical sequence might look like this:

1. **Educate teams**
   Start with security, architecture, platform, infrastructure, procurement, and application leaders. PQC cannot be owned by one person in a corner of the security team.

2. **Inventory cryptography**
   Build or buy discovery capabilities. Prioritize high-value assets, externally exposed systems, regulated systems, and systems that protect long-lived data.

3. **Classify risk**
   Not every system has the same urgency. A public marketing website and a healthcare records system do not carry the same HNDL risk.

4. **Create vendor requirements**
   Add PQC readiness questions to procurement. Ask vendors about algorithm support, roadmaps, certificate handling, TLS support, HSM support, hybrid modes, FIPS alignment, and migration timelines.

5. **Test hybrid approaches**
   In many environments, the transition will involve hybrid cryptography where classical and post-quantum mechanisms are used together during the migration period.

6. **Modernize PKI and certificate lifecycle management**
   If your organization cannot reliably rotate certificates today, PQC will expose that weakness.

7. **Pilot before broad rollout**
   Start with controlled systems. Measure performance, compatibility, certificate size impacts, application behavior, logging, monitoring, and rollback procedures.

8. **Automate**
   Manual cryptographic migration does not scale. Automation is the path to crypto agility.

### Cost

PQC will cost money.

That cost may include:

* Software upgrades
* Vendor licensing
* Professional services
* HSM upgrades
* PKI modernization
* Certificate lifecycle automation
* Application remediation
* Testing environments
* Architecture time
* Security engineering time
* Training
* Program management
* Compliance documentation

But the cost of doing nothing is not zero.

Doing nothing creates a deferred liability. It increases the chance that sensitive data captured today becomes readable later. It increases the chance that future compliance requirements arrive before your architecture is ready. It also increases the chance that your organization is forced into rushed, expensive, poorly tested migrations later.

In other words, PQC is like most architecture debt: the longer you wait, the fewer good options you have.

### Ownership

One of the hardest questions is: who owns PQC?

Security will often raise the concern. Architecture will often define the target state. Platform teams may own certificate automation and shared services. Application teams will own code and runtime changes. Infrastructure teams may own appliances, HSMs, and network devices. Procurement will own vendor pressure. Compliance will own evidence.

That means PQC needs an operating model.

My recommendation is to create a small cross-functional crypto agility working group with clear executive sponsorship. This group should not become a bureaucracy. Its purpose should be to define standards, maintain the inventory, prioritize migrations, create vendor requirements, and remove blockers.

If ownership is unclear, PQC will become everyone’s problem and no one’s responsibility.

### Operational Impact

The operational impact of PQC is significant because it forces organizations to confront how poorly they understand their own cryptography.

The future state should be crypto agility.

> ℹ️ **Crypto Agility**
>
> Crypto agility is the ability to identify, replace, rotate, and govern cryptographic algorithms, certificates, keys, and protocols without redesigning the entire system each time cryptographic guidance changes.

Crypto agility requires:

* Accurate inventory
* Central policy
* Automated certificate lifecycle management
* Standardized cryptographic libraries
* Strong PKI governance
* Vendor accountability
* Repeatable testing
* Clear ownership
* Continuous discovery
* Drift detection

This is where automation becomes essential.

If a team has to manually inspect every application, certificate, and dependency each time guidance changes, they are not agile. They are exposed.

### Security Tradeoffs

PQC should not be treated as a magic security blanket.

A poorly implemented PQC migration can create new risks. Larger certificates may break legacy systems. Unsupported libraries may introduce vulnerabilities. Unclear hybrid configurations may create a false sense of security. Mismanaged keys are still mismanaged keys, even if the algorithm is quantum-resistant.

There is also a zero trust angle.

Zero trust depends heavily on strong identity, strong authentication, encrypted communication, policy enforcement, and continuous verification. If the cryptographic foundation under those controls is vulnerable or poorly managed, then the zero trust architecture is weaker than it appears.

You cannot claim to be serious about long-term zero trust while ignoring cryptographic agility.

---

## What I Would Do

<!-- Give a clear, opinionated recommendation. Don't hedge into uselessness.
     "If I were the architect on this team, here is exactly what I would do." -->

---

## Final Takeaway

<!-- One memorable sentence that captures the entire post.
     This is what the reader will remember, share, or quote. -->

## Acronyms and Definitions

| Term | Definition |
|----------|----------|
| CRQC   | **Cryptographically Relevant Quantum Computer** A quantum computer powerful enough to attack real-world cryptographic systems that are infeasible to break with classical computers.    |
| Classical Computer | The type of computer most people use today. Classical computers process information using bits, which represent either 0 or 1. |
| Quantum Computer | A computer that uses quantum mechanical properties to process information in ways that can be dramatically more efficient for certain classes of problems. |
| Q-Day | The point in time when a CRQC exists that can practically break widely used public-key cryptography.|
| PQC | **Post-Quantum Cryptography.** Cryptographic algorithms designed to resist attacks from both classical and quantum computers. |
| HNDL | **Harvest Now, Decrypt Later.** The strategy of collecting encrypted data today with the expectation that it can be decrypted in the future when quantum capabilities mature. |
| CBOM | **Cryptographic Bill of Materials.** An inventory of cryptographic assets, algorithms, keys, certificates, protocols, libraries, and dependencies used across systems.|
| PKI | **Public Key Infrastructure.** The systems, policies, certificate authorities, keys, and processes used to issue, manage, validate, and revoke digital certificates. |
| ML-KEM | **Module-Lattice-Based Key-Encapsulation Mechanism.** The algorithm standardized in FIPS 203 for key establishment. |
| ML-DSA | **Module-Lattice-Based Digital Signature Algorithm.** The algorithm standardized in FIPS 204 for digital signatures. |
| SLH-DSA | **Stateless Hash-Based Digital Signature Algorithm.** The algorithm standardized in FIPS 205 for digital signatures. |



