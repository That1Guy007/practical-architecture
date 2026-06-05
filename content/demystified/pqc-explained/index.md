---
title: "Post-Quantum Cryptography, Demystified."
date: 2026-06-03
lastmod: 2026-06-03
draft: true
description: "Quantum cryptohraphy vs classical cryptography and the path towards adoption."
summary: "Understanding the current state of PQC, the threats, and how to start to mitigate those risks."
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

<!--
  TEMPLATE: Demystified — Conceptual
  USE FOR:  Topics where the core value is clarity of thought, not protocol mechanics.
            Examples: PQC, Zero Trust, Secret Management, Threat Modeling, Supply Chain Security.
  COMMAND:  hugo new --kind demystified-concept demystified/your-topic-here/
-->

## Q-Day is coming

<!-- Start with the confusion or misconception your reader probably walks in with.
     One or two sentences. Make it sting a little. -->

Quantum computers, it sounds like science fiction, but in reality we are running out of time before a CRQC is online and breaks the cryptography that is the foundation of our current world.

> ℹ️ Cryptographically Relevant Quantum Computer (CRQC)
>
> This term distinguishes abstract physics experiments from machines that present an actual security risk.

Even though at its most basic level we are just talking about math, specifically the math that serves as the foundation for cryptography. As fun and beautiful as math can be, there are still challenges with current classical computers and solving math problems such as prime number factorization. 

<!-- I want to add the sources on the IBM 2Billion of funding for PQC -->

> ℹ️ Prime Numbers
>
> Remember a prime number is only divisble by itself and 1. 
>
> Prime number factorization is finding the two prime numbers that when multiplied, create the very large composite number that is "encrypting" your system

---

## Why This Matters
For the cryptography we have had for the past decade securing our emails, banking systems, crypto, and even military communications, there was not a viable way to break the cryptography when using a large enough composite number (eg RSA-1024 or RSA-2048) for the classical computers we are familiar with.

A CRQC on the other hand, uses quantum mechanics to essentially "cheat" and solve these mathematical problems in record time. For example, a classical computer like the one your using to read this on, would take **trillions** of years to break the cryptographic encryption, but a CRQC can theoretically break it in hours.

### Business risk
Think SOC2, do I trust you to do business with me? Can I keep my consumers information safe? Respect their privacy?

### Security risk

Harvest Now Decrypt Later. 

### Architecture risk
The size of quantum signitures

### Operational risk

Classical cryptography is already complex and difficult to operationalize. Entire companies have been built trying to make it easier, more resiliant, and cost effective. Without quantum resistent cryptography we are exposed, but with it we have added complexity and another requirement that needs to be met regarding procurement and development. The people, the process, the technology are all at play here.

---

## The Mental Model

Quantum computing is to classical computing as the internet was to postal mail. There is a fundamental shift in the processes of cryptography and computing that is set to force redesigns, standard, and security. Similarly, like postal mail I fully expect classical and quantum computers to live in tandem. For example, you most likely wont be using a quantum computer anytime soon to send an email, or browse the web.

---

## How It Works

### Encryption is everywhere
- PKI
- SSH
- DB encryption
- Financial transactions? Crypto?

### Shor's Algorithm

### 

---

<!-- ## Where Teams Get It Wrong

<!-- This is where your experience shows. Be specific and honest.
     Avoid generic "teams often overlook X" — name the actual failure mode you've seen. 

### [Mistake 1 — give it a label]

### [Mistake 2 — give it a label]

### [Mistake 3 — give it a label] 

--- -->

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

### Acronyms and Definitions

1. CRQC
   1. dasd
2. Clasical Computer
3. Quantum Computer
