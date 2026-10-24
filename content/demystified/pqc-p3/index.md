---
title: "TOPIC, Demystified: What It Is, Why It Matters, and What Teams Should Do Now"
date: 2026-10-24T13:04:49-04:00
lastmod: 2026-10-24T13:04:49-04:00
draft: true
description: ""
summary: ""
series: ["Demystified"]
series_order: 1
tags: []
categories: ["demystified"]
showComments: true
showTableOfContents: true
showReadingTime: true
showHero: true
heroStyle: "big"
---

<!--
  TEMPLATE: Demystified — Conceptual
  USE FOR:  Topics where the core value is clarity of thought, not protocol mechanics.
            Examples: PQC, Zero Trust, Secret Management, Threat Modeling, Supply Chain Security.
  COMMAND:  hugo new --kind demystified-concept demystified/your-topic-here/
-->

## Opening Hook

---------------------------------

In Part 1: PQC Demystified we went through what PQC is, why it matters, risks associuated with not achieving PQC, and the PQC timeline. Here in Part 2, we will discuss some of the nuances with PQC, the algorithms and their intentions, what has been done for you versus what you need to focus on. 

 <!-- we will go through some of the implimentation designs, costs, migration expecatations, operational impacts, trade offs, and lastly my approach for success.  -->

<!-- This is where PQC becomes real.

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

That is why I think organizations should treat PQC as a practical architecture program, not as a narrow cryptography upgrade.-->

### The Algorithms

[ML-KEM (FIPS-203)](https://csrc.nist.gov/pubs/fips/203/final), [ML-DSA (FIPS-204)](https://csrc.nist.gov/pubs/fips/204/final), [SLH-DSA (FIPS-205)](https://csrc.nist.gov/pubs/fips/205/final) as of this publication are the only NIST approved PQC algorithms. Each of the algorithms have their own uniqueness, ML-KEM and ML-DSA both are Module Lattice based solutions (ML), while SLH-DSA is Hash based. SLH-DSA and ML-DSA are both for authentication being used for cryptographic signatures, while ML-KEM is used for key establishment. 

Traditional TLS within HTTPS has three parts, key establishment, authentication, and encryption. ML-KEM is intended for the key establishment, while ML-DSA and SLH-DSA are intended for authentication. If you notice, we havent actaully touched the encryption part of TLS which is a common misconception that the PQC algorithms are used directly for encryption. 



### PQC quirks
<!-- Going to talk about lack of browser support for pure PQC, OpenSSL support for internal communication, sizes of the keys, signatures, algorithms -->

#### Considerations
<!-- TAlk about MTCs and Hybrid certs -->

### What needs to be done
<!-- Talk about the implementation of ML-KEM within public TLS to mitigate HNDL, talk about home networks and packet captures, talk about internal private communications for companies, and talking PIV or CAC cards? -->












<!-- I want to bring up HSM back cryptographic material vs software based cryptographic material, maybe bring up how software is not very random? And then I want to discuss how the material is the "prerequisite", then you need to use that material for PKI, Encryption, Signing, etc. The first step is really figuring out how you plan on getting a CBOM or inventory of your ecosystem (prpobably with references to the OSS CBOM provided by CISA?). -->

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

---------------------------------

<!-- Start with the confusion or misconception your reader probably walks in with.
     One or two sentences. Make it sting a little. -->

TOPIC sounds like [common misconception], but in practice it is [reframe that resets their mental model].

---

## Plain-English Definition

<!-- Explain the topic without vendor language, acronyms without definitions, or jargon.
     One tight paragraph. A non-technical colleague should be able to read this and nod. -->

TOPIC is...

---

## Why This Matters

<!-- Connect it to real stakes. Answer: "So what? Why should my team care right now?"
     Use the subsections that apply — delete the rest. -->

### Business risk

### Security risk

### Architecture risk

### Operational risk

---

## The Mental Model

<!-- Give the reader one analogy or framing that makes the whole concept click.
     This is the section they will quote. Keep it to one tight metaphor or diagram.
     Avoid "it's like a [overused analogy]" — find something fresh and specific. -->

Think of TOPIC like...

---

## How It Works

<!-- Explain the core mechanics. Depth over breadth.
     Three to five subsections max. Link out for deep dives rather than trying to cover everything. -->

### [Core concept 1]

### [Core concept 2]

### [Core concept 3]

---

## Where Teams Get It Wrong

<!-- This is where your experience shows. Be specific and honest.
     Avoid generic "teams often overlook X" — name the actual failure mode you've seen. -->

### [Mistake 1 — give it a label]

### [Mistake 2 — give it a label]

### [Mistake 3 — give it a label]

---

## Practical Architecture Considerations

### Implementation

<!-- What does it actually take to implement this? Dependencies, prerequisites, integration points. -->

### Migration

<!-- What does the transition look like for a team that has nothing in place yet?
     What breaks? What has to be sequenced carefully? -->

### Cost

<!-- Licensing, engineering time, operational overhead. Be honest about the real number. -->

### Ownership

<!-- Who owns this? Platform team? Security team? App teams? What happens when ownership is unclear? -->

### Operational impact

<!-- What changes about day-to-day operations? On-call surface? Runbooks? Monitoring? -->

### Security tradeoffs

<!-- What does this make better — and what does it introduce or leave unresolved? -->

---

## What I Would Do

<!-- Give a clear, opinionated recommendation. Don't hedge into uselessness.
     "If I were the architect on this team, here is exactly what I would do." -->

---

## Final Takeaway

<!-- One memorable sentence that captures the entire post.
     This is what the reader will remember, share, or quote. -->
