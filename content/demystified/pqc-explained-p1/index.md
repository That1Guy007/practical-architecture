---
title: "Post-Quantum Cryptography, Demystified. Part 1"
date: 2026-06-03
lastmod: 2026-06-03
draft: false
description: "Part 1 - Quantum cryptography vs classical cryptography and the path towards adoption."
summary: "Part 1 - Understanding the current state of PQC, the threats, and how to start to mitigate those risks."
# series: ["Demystified"]
series_order: 1
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

## Q-Day

Quantum computers; It sounds like science fiction, but the security threat they create is very real.

The concern is not that every quantum computer will magically break every encryption system. The concern is that a sufficiently powerful quantum computer, often called a Cryptographically Relevant Quantum Computer, could break many of the public-key cryptographic algorithms that modern systems depend on.

> ℹ️ **Cryptographically Relevant Quantum Computer (CRQC)**
>
> A CRQC is a quantum computer powerful enough to attack real-world cryptographic systems that would be infeasible to break with classical computers. This term distinguishes abstract physics experiments from machines that present an actual security risk

Even though at its most basic level we are just talking about math, the math that today serves as the foundation for cryptography is at risk. This is because the math that is securing our resources today is essentially too hard for classical computers to reverse engineer in a realistic timeframe. More specifically there are still challenges with current classical computers and solving math problems such as prime number factorization.

This matters because much of today’s digital trust depends on math, but these math problems are difficult for classical computers to solve in a realistic timeframe. RSA, for example, relies on the difficulty of factoring very large numbers. Even elliptic curve cryptography (ECC) relies on similar but different math, but the theme is the same: these systems are secure because the reverse math operation is computationally impractical for classical machines.

A CRQC changes that assumption. e.g [Shor's Algorithm](https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/phase-estimation-and-factoring/shor-algorithm).

Granted this does not mean symmetric encryption such as AES instantly becomes useless, and it does not mean every security control fails at the same time. But it does mean many of the mechanisms we use for key exchange, digital signatures, identity, certificates, firmware validation, and secure communications will need to evolve.

That evolution is Post-Quantum Cryptography.

> ℹ️ **Post-Quantum Cryptography (PQC)**
>
> PQC refers to cryptographic algorithms designed to resist attacks from both classical computers and quantum computers.

---

## Why This Matters
The cryptography we have relied on for decades has secured emails, banking systems, cloud services, military communications and more. Throughout this time, the practical assumption was simple: if you used modern algorithms correctly, with appropriate key sizes, attackers could not realistically break the cryptography with classical computing power.

A CRQC changes the risk model.

A classical computer may require an unrealistic amount of time to break certain cryptography but a sufficiently capable quantum computer could theoretically solve some of those cryptography math problems dramatically faster. Creating cryptography that is resistant to CRQCs is the goal of Post Quantum Cryptography (PQC). This is why the industry is moving toward quantum-resistant algorithms such as ML-KEM for key establishment and ML-DSA or SLH-DSA for digital signatures.

> ℹ️ **Quantum computers & quantum mechanics**
>
>  A CRQC uses quantum mechanics to essentially "cheat" and solve the hard math problems that classical computers struggle with.

## The Mental Model

Quantum computing is to classical computing what the internet was to postal mail.

The internet did not make postal mail disappear. It changed the assumptions around speed, scale, and even organizational designs. Quantum computing will not make classical computing disappear. You probably will not use a quantum computer to send an email, write a document, or browse the web. Classical and quantum systems will likely exist together but the existence of quantum computing changes the assumptions that classical cryptography depends on.


This is the shift. PQC is not about replacing every computer with a quantum computer. It is about replacing vulnerable cryptographic assumptions before they become enterprise-wide liabilities.


---

<!-- ### Readiness & Risk
Quantum readiness for organizations fall within two areas, quantum viable, and non-viable solutions. Both of which require stakeholders to make complex decisions to create a course of action when adopting PQC. Solutions that exist within the quantum viable area will generally focus on PKI, and encryption while PIV and CAC may fall under the non viable solutions.


> ℹ️ PIV & CAC
> PIV and CAC are two essential components for organizations and as such there are solutions emerging such as Merkle Tree Certificates (MTCs) that move these components from non viable to the viable area.


Risks associated with not adopting PQC far outweigh the complexities of dealing with the changes. Today organizations are looking to create CBOMs (Cryptographic bill of materials) of their organizations to understand the true scope of their current risks. These risks are directly related to security, architecture, and operations, each with a direct impact to an organization's compliance posture or their bottom line.


As it relates to security, the mainstream risk is HNDL (Harvest Now Decrypt Later)[]. Architecture risks arise from service to service communications and supporting the latest standards (FIPS (203)[], (204)[], (205)[]). Lastly, operational risks come from people. People, process, technology. Firstly people may not fully understand the risks associated with PQC, and if they do, most of the other people in the organization will not. Then let's assume a process is put in place? Most of the time organizations push forward without bringing their people with them, even if they intend not to. Without education, training and support, people will become our largest security risk.  -->


<!-- HNDL (Harvest Now Decrypt Later) and failing to understand the breadth and effort required to effectively implement PQC.


of data (CIA) -- TBD

Traditionally risks such as non FIPS 140-3 algorithms, or meeting non SOC2 compliance was all that most organizations really needed to know.


Just as SOC2 has become a "baseline" security risk mitigator between organizations, adopting PQC


Think SOC2, do I trust you to do business with me? Can I keep my consumers' information safe? Respect their privacy? -->
## What you need to know

When people talk about PQC, the conversation often becomes overly focused on the non-existent viable quantum computer or that vendors will all just deal with the PQC problem. That is understandable, but incomplete.

The risks are already here.

### 1. Harvest Now, Decrypt Later

The most immediate concern is Harvest Now, Decrypt Later (HNDL). Look up wifi sniffing if you want to feel naked at home.

An attacker does not need a CRQC today to create future damage. They can collect encrypted traffic or sensitive encrypted data now and store it until quantum capabilities mature. If the data still has value in five, ten, fifteen, or twenty years, then the organization has a current risk even if the decryption event happens later.

This matters for industries with long-lived sensitive data: healthcare, defense, financial services, government, critical infrastructure, intellectual property, legal records, really anything involving national security or personal privacy.

The question is not simply, "Can someone decrypt my data today?" The real question is, "Will my data still matter when quantum decryption becomes practical?"

### 2. Architecture Risk

PQC is not as simple as swapping algorithms. Post-quantum algorithms can have different key sizes, signature sizes, performance characteristics, protocol & certificate implications, and hardware constraints. Larger signatures can impact certificate chains, size constrained devices, network protocols, TLS handshakes, firmware signing workflows, HSM integrations, smart cards, and legacy applications.

The PQC risk is operational, performance-related, and dependency-driven. You need to know where cryptography is used before you can know what will break. Check out [Cryptography Bill of Materials (CBOM)](https://cyclonedx.org/guides/OWASP_CycloneDX-Authoritative-Guide-to-CBOM-en.pdf)

### 3. Operational Risk

Classical cryptography is already difficult to manage well. Entire companies exist because certificate lifecycle management, PKI operations, key rotation, secrets management, HSM operations, and cryptographic policy enforcement are hard. PQC adds another layer of complexity to a field that many organizations already struggle to operationalize.

Par for the course, the biggest risk may not be the technology. The biggest risk may be the organization’s inability to change. People, process, and technology all matter here.

If security teams understand PQC but application teams do not, migration and adoption stalls. If enterprise architects understand the risk mitigations but procurement teams do not ask the right vendor questions, risk gets reintroduced through new purchases. If platform teams automate certificates but no one owns cryptographic inventory, teams end up modernizing blindly.

PQC is not just a security project. It is an enterprise initiative.

---

## Current Timeline - June 2026

The US executive branch has issued a [federal mandate](https://www.whitehouse.gov/wp-content/uploads/2022/11/M-23-02-M-Memo-on-Migrating-to-Post-Quantum-Cryptography.pdf) in November 2022 to "prioritize the timely and equitable transition of cryptographic systems to quantum-resistant cryptography, with the goal of mitigating as much of the quantum risk as is feasible by 2035."

Then NIST finalized the first three post-quantum cryptography standards in August 2024; FIPS [203](https://csrc.nist.gov/pubs/fips/203/final), [204](https://csrc.nist.gov/pubs/fips/204/final), [205](https://csrc.nist.gov/pubs/fips/205/final).


In May 2026, Google released their [updated timeline](https://blog.google/innovation-and-ai/technology/safety-security/cryptography-migration-timeline/) regarding PQC to 2029. [US Federal guidance](https://csrc.nist.gov/projects/post-quantum-cryptography) has been pushing agencies to inventory cryptographic systems, especially high-value assets and high-impact systems. [CISA](https://www.cisa.gov/topics/risk-management/quantum) and the [NIST National Cybersecurity Center of Excellence](https://www.nccoe.nist.gov/applied-cryptography/migration-to-pqc) have focused on providing information on awareness, preparation, discovery and inventory, risk assessment and planning, migration execution, validation and monitoring in order to mitigate the risks of a CRQC coming before we are ready. See [NIST CCOE FAQ](https://pages.nist.gov/nccoe-migration-post-quantum-cryptography/FAQ/index.html#)


The market is also waking up. [Government RFIs](https://sam.gov/workspace/contract/opp/cefe37153fc54c809ca8274983691bb5/view), vendor roadmaps, hyperscaler experimentation, and [major quantum investments](https://www.ibm.com/quantum/blog/10-billion-investment-faq) are all signals that this is becoming a procurement, compliance, and architecture conversation.

## Takeaway

Post Quantum Cryptography is not simply about mitigating Q Day, but about building a strong foundation through visibility, automation, and enabling crypto agility to adapt with the next generation of quantum computers. To learn more about how to mitigate these risks, check out Part 2 where we dive into more of the implementation, cost, and impact on becoming PQC ready.

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
