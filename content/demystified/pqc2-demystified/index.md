---
title: "Post-Quantum Cryptography, Demystified. Part 2"
date: 2026-06-15
lastmod: 2026-10-21
draft: true
description: "Part 2 - Quantum cryptography vs classical cryptography and what you need to do."
summary: "Part 2 - Understanding the current state of PQC, the threats, and how to start to mitigate those risks"
# series: ["Demystified"]
series_order: 2
tags: ["cryptography", "pqc", "security", "quantum"]
categories: ["demystified"]
showComments: true
showTableOfContents: true
showReadingTime: true
showHero: true
heroStyle: "big"
---

<!-- My idea for this post is to help people understand what is PQC, what I am seeing in the industry and how they can start to prepare for PQC.  -->

#### TL;DR

*Mitigating the risks of PQC is an organization-wide task with practical architecture considerations.*

*Mitigation via ML-KEM and Hybrid solutions is the first step for reducing the attack surface.*

*Organizations need to enable their teams, ask better informed questions, inventory their cryptographic ecosystem, prioritize the highest-risk systems, create a course of action, execute migrations, automate certificate and key lifecycle management, and build crypto agility so they can transition from classical cryptography to quantum-resistant cryptography without treating every future algorithm change like a once-in-a-generation fire drill.*


## Practical Architecture

In [Post-Quantum Cryptography, Demystified: Part 1]({{< ref "/demystified/pqc-explained-p1" >}}). we went through what PQC is, why it matters, risks associated with not achieving PQC, and the PQC timeline. Here in Part 2, we will discuss the algorithms and their intentions, some of the nuances with PQC, and what has been done for you versus what you need to focus on.

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

[ML-KEM (FIPS-203)](https://csrc.nist.gov/pubs/fips/203/final), [ML-DSA (FIPS-204)](https://csrc.nist.gov/pubs/fips/204/final), and [SLH-DSA (FIPS-205)](https://csrc.nist.gov/pubs/fips/205/final) are the only NIST-approved PQC standards at the time of this writing. The algorithms have similarities and also distinctions; ML-KEM and ML-DSA are module-lattice-based, while SLH-DSA is hash-based. ML-DSA and SLH-DSA are used for digital signatures and authentication, while ML-KEM is used for key establishment.

The intention of the algorithms matter becuase traditional TLS 1.3 within HTTPS has three distinct jobs: key establishment, authentication, and encryption. ML-KEM is intended for key establishment, while ML-DSA and SLH-DSA are intended for authentication. Notice that none of these algorithms directly encrypts the data in transit and that distinction is one of the most common sources of confusion when discussing PQC.

### Traditional, Hybrid, and Post-Quantum TLS

The three phases of TLS 1.3 are consistent in the traditional, hybrid and post quantum workflows. The primary difference is the public-key algorithm used for **key establishment** and **authentication**. The final data-encryption phase continues to use efficient symmetric encryption algorithms (AES, ChaCha, etc).

```flow
{
  "title": "Traditional TLS 1.3",
  "desc": "Traditional TLS uses X25519 public shares to establish a classical shared secret, RSA or ECDSA certificates and signatures to authenticate the server, and HKDF-derived traffic keys with AES-GCM or ChaCha20-Poly1305 to protect application data.",
  "caption": "Figure 1. Traditional TLS: classical key establishment and authentication lead to symmetric data encryption.",
  "view": {
    "set": "tls-comparison",
    "setLabel": "TLS comparison views",
    "label": "Traditional",
    "summary": "Traditional TLS commonly uses X25519 for key establishment and RSA or ECDSA signatures for authentication. Both public-key operations are vulnerable to a sufficiently capable quantum computer running Shor's algorithm."
  },
  "wide": true,
  "width": 900,
  "height": 260,
  "legend": {
    "client": "GREEN · Key establishment: public keys open; shared secret local",
    "raft": "PURPLE · Encrypted certificate authentication",
    "application": "YELLOW · Encrypted application traffic"
  },
  "nodes": [
    {"id": "traditionalBrowserKey", "x": 12, "y": 12, "w": 190, "h": 68, "title": "Browser", "sub": "Ephemeral X25519 key", "tone": "white", "desc": "Creates an ephemeral X25519 private key and sends its public share."},
    {"id": "traditionalKey", "x": 235, "y": 12, "w": 430, "h": 68, "title": "Key establishment", "sub": "OPEN: exchange X25519 public keys · LOCAL: derive matching secret", "tone": "green", "desc": "The browser and server exchange public X25519 keys and independently calculate the same classical shared secret. The private keys and shared secret are never transmitted."},
    {"id": "traditionalServerKey", "x": 698, "y": 12, "w": 190, "h": 68, "title": "Server", "sub": "Ephemeral X25519 key", "tone": "white", "desc": "Creates an ephemeral X25519 private key, sends its public share, and calculates the same shared secret."},
    {"id": "traditionalBrowserAuth", "x": 12, "y": 96, "w": 190, "h": 68, "title": "Browser", "sub": "Verifies identity", "tone": "white", "desc": "Validates the certificate chain and the server's CertificateVerify signature."},
    {"id": "traditionalAuth", "x": 235, "y": 96, "w": 430, "h": 68, "title": "Authentication", "sub": "ENCRYPTED: RSA or ECDSA certificate + handshake signature", "tone": "purple", "desc": "The certificate chain identifies the server, and the signature binds that identity to the current TLS handshake and key-establishment messages. In TLS 1.3, this server authentication flight is encrypted after ServerHello."},
    {"id": "traditionalServerAuth", "x": 698, "y": 96, "w": 190, "h": 68, "title": "Server", "sub": "Signs the handshake", "tone": "white", "desc": "Presents its certificate chain and signs the TLS transcript using RSA or ECDSA."},
    {"id": "traditionalBrowserData", "x": 12, "y": 180, "w": 190, "h": 68, "title": "Browser", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses its directional traffic keys to encrypt outgoing records and decrypt incoming records."},
    {"id": "traditionalData", "x": 235, "y": 180, "w": 430, "h": 68, "title": "Data encryption", "sub": "ENCRYPTED: HKDF-derived keys → AES-GCM or ChaCha20-Poly1305", "tone": "yellow", "desc": "Both endpoints run the TLS key schedule and derive matching directional traffic keys and initialization vectors. Those values protect the actual HTTP data."},
    {"id": "traditionalServerData", "x": 698, "y": 180, "w": 190, "h": 68, "title": "Server", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses its corresponding directional traffic keys to decrypt incoming records and encrypt responses."}
  ],
  "edges": [
    {"from": "traditionalBrowserKey", "to": "traditionalKey", "kind": "client", "dots": 3},
    {"from": "traditionalKey", "to": "traditionalServerKey", "kind": "client", "dots": 3},
    {"from": "traditionalServerAuth", "to": "traditionalAuth", "kind": "raft", "dots": 3},
    {"from": "traditionalAuth", "to": "traditionalBrowserAuth", "kind": "raft", "dots": 3},
    {"from": "traditionalBrowserData", "to": "traditionalData", "kind": "application", "bidirectional": true, "dots": 2},
    {"from": "traditionalData", "to": "traditionalServerData", "kind": "application", "bidirectional": true, "dots": 2}
  ]
}
```

```flow
{
  "title": "Hybrid post-quantum TLS",
  "desc": "Hybrid TLS combines an X25519 shared secret with an ML-KEM shared secret during key establishment, keeps today's RSA or ECDSA certificate authentication during the transition, and continues to use HKDF-derived keys with AES-GCM or ChaCha20-Poly1305 for application data.",
  "caption": "Figure 2. Hybrid TLS today: post-quantum protection is added to key establishment while authentication and symmetric encryption remain compatible with today's ecosystem.",
  "view": {
    "set": "tls-comparison",
    "setLabel": "TLS comparison views",
    "label": "Hybrid",
    "summary": "Hybrid TLS changes the first phase. X25519 and ML-KEM each contribute a shared secret, and TLS combines them before deriving traffic keys. Authentication can remain classical during the transition, which is why browsers and servers can deploy hybrid key establishment without replacing the entire public-PKI ecosystem at once."
  },
  "wide": true,
  "width": 900,
  "height": 260,
  "legend": {
    "client": "GREEN · Key establishment: public values open; both secrets local",
    "raft": "PURPLE · Encrypted classical certificate authentication",
    "application": "YELLOW · Encrypted application traffic"
  },
  "nodes": [
    {"id": "hybridBrowserKey", "x": 12, "y": 12, "w": 190, "h": 68, "title": "Browser", "sub": "Creates both key pairs", "tone": "white", "desc": "Creates an ML-KEM encapsulation and decapsulation key pair plus an ephemeral X25519 key pair. ClientHello sends the ML-KEM public encapsulation key and X25519 public key."},
    {"id": "hybridKey", "x": 235, "y": 12, "w": 430, "h": 68, "title": "Key establishment", "sub": "OPEN: public keys + ciphertext · LOCAL: derive two matching secrets", "tone": "green", "desc": "The X25519 exchange produces a matching classical secret at both endpoints. ML-KEM encapsulation and decapsulation produce a matching post-quantum secret. TLS combines both contributions before deriving keys."},
    {"id": "hybridServerKey", "x": 698, "y": 12, "w": 190, "h": 68, "title": "Server", "sub": "Creates both secrets", "tone": "white", "desc": "Uses the browser's ML-KEM public encapsulation key to create a post-quantum shared secret and ciphertext, and also calculates the X25519 shared secret."},
    {"id": "hybridBrowserAuth", "x": 12, "y": 96, "w": 190, "h": 68, "title": "Browser", "sub": "Verifies identity", "tone": "white", "desc": "Validates the existing classical certificate chain and CertificateVerify signature."},
    {"id": "hybridAuth", "x": 235, "y": 96, "w": 430, "h": 68, "title": "Authentication", "sub": "ENCRYPTED: RSA or ECDSA certificate + handshake signature", "tone": "purple", "desc": "Most hybrid TLS deployments retain classical authentication. The signature authenticates the server and covers the hybrid key-establishment transcript. In TLS 1.3, this server authentication flight is encrypted after ServerHello."},
    {"id": "hybridServerAuth", "x": 698, "y": 96, "w": 190, "h": 68, "title": "Server", "sub": "Signs the handshake", "tone": "white", "desc": "Presents its existing certificate chain and signs the hybrid TLS transcript using RSA or ECDSA."},
    {"id": "hybridBrowserData", "x": 12, "y": 180, "w": 190, "h": 68, "title": "Browser", "sub": "Uses traffic keys", "tone": "white", "desc": "Encrypts and decrypts records using keys derived from the combined X25519 and ML-KEM secret material."},
    {"id": "hybridData", "x": 235, "y": 180, "w": 430, "h": 68, "title": "Data encryption", "sub": "ENCRYPTED: HKDF-derived keys → AES-GCM or ChaCha20-Poly1305", "tone": "yellow", "desc": "The encryption algorithm does not become ML-KEM. Both endpoints run the TLS key schedule and independently derive matching directional keys and initialization vectors for the negotiated encryption algorithm."},
    {"id": "hybridServerData", "x": 698, "y": 180, "w": 190, "h": 68, "title": "Server", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses the corresponding directional traffic keys to decrypt requests and encrypt responses."}
  ],
  "edges": [
    {"from": "hybridBrowserKey", "to": "hybridKey", "kind": "client", "dots": 3},
    {"from": "hybridKey", "to": "hybridServerKey", "kind": "client", "bidirectional": true, "dots": 3},
    {"from": "hybridServerAuth", "to": "hybridAuth", "kind": "raft", "dots": 3},
    {"from": "hybridAuth", "to": "hybridBrowserAuth", "kind": "raft", "dots": 3},
    {"from": "hybridBrowserData", "to": "hybridData", "kind": "application", "bidirectional": true, "dots": 2},
    {"from": "hybridData", "to": "hybridServerData", "kind": "application", "bidirectional": true, "dots": 2}
  ]
}
```

```flow
{
  "title": "Post-quantum TLS target",
  "desc": "A post-quantum TLS target uses ML-KEM for key establishment, ML-DSA or SLH-DSA certificates and handshake signatures for authentication, and HKDF-derived symmetric keys with AES-GCM or ChaCha20-Poly1305 for application data.",
  "caption": "Figure 3. Post-quantum target: both public-key phases become quantum-resistant; efficient symmetric encryption continues to protect the application data.",
  "view": {
    "set": "tls-comparison",
    "setLabel": "TLS comparison views",
    "label": "Post-Quantum",
    "summary": "A fully post-quantum-authenticated connection also changes the second phase. ML-DSA or SLH-DSA replaces quantum-vulnerable certificate signatures. AES-GCM or ChaCha20-Poly1305 still protects the application data; its traffic keys now originate from quantum-resistant key establishment and the handshake is authenticated with a quantum-resistant signature."
  },
  "wide": true,
  "width": 900,
  "height": 260,
  "legend": {
    "client": "GREEN · Key establishment: public values open; shared secret local",
    "raft": "PURPLE · Encrypted post-quantum certificate authentication",
    "application": "YELLOW · Encrypted application traffic"
  },
  "nodes": [
    {"id": "pqcBrowserKey", "x": 12, "y": 12, "w": 190, "h": 68, "title": "Browser", "sub": "Creates ML-KEM key pair", "tone": "white", "desc": "Creates an ephemeral ML-KEM public encapsulation key and private decapsulation key, then sends only the public key."},
    {"id": "pqcKey", "x": 235, "y": 12, "w": 430, "h": 68, "title": "Key establishment", "sub": "OPEN: public key + ciphertext · LOCAL: derive matching PQ secret", "tone": "green", "desc": "The server encapsulates using the browser's public encapsulation key and keeps the resulting post-quantum shared secret. The browser decapsulates the returned ciphertext to reproduce that same secret."},
    {"id": "pqcServerKey", "x": 698, "y": 12, "w": 190, "h": 68, "title": "Server", "sub": "Creates secret + ciphertext", "tone": "white", "desc": "Uses the browser's public encapsulation key to create a post-quantum shared secret and ciphertext, keeps the secret, and sends the ciphertext to the browser."},
    {"id": "pqcBrowserAuth", "x": 12, "y": 96, "w": 190, "h": 68, "title": "Browser", "sub": "Verifies PQ identity", "tone": "white", "desc": "Validates the post-quantum certificate path and verifies the ML-DSA or SLH-DSA handshake signature."},
    {"id": "pqcAuth", "x": 235, "y": 96, "w": 430, "h": 68, "title": "Authentication", "sub": "ENCRYPTED: ML-DSA or SLH-DSA certificate + handshake signature", "tone": "purple", "desc": "A quantum-resistant certificate chain identifies the server, and a post-quantum signature binds that identity to the TLS transcript and ML-KEM exchange. In TLS 1.3, this server authentication flight is encrypted after ServerHello."},
    {"id": "pqcServerAuth", "x": 698, "y": 96, "w": 190, "h": 68, "title": "Server", "sub": "Uses PQ signature", "tone": "white", "desc": "Presents a post-quantum certificate chain and signs the TLS transcript using ML-DSA or SLH-DSA."},
    {"id": "pqcBrowserData", "x": 12, "y": 180, "w": 190, "h": 68, "title": "Browser", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses symmetric traffic keys derived from the ML-KEM secret to encrypt and decrypt application records."},
    {"id": "pqcData", "x": 235, "y": 180, "w": 430, "h": 68, "title": "Data encryption", "sub": "ENCRYPTED: HKDF-derived keys → AES-GCM or ChaCha20-Poly1305", "tone": "yellow", "desc": "Both endpoints independently derive matching directional traffic keys and initialization vectors. Symmetric encryption remains the efficient data-protection layer; Shor's algorithm does not break AES or ChaCha20 in the way it breaks today's public-key algorithms."},
    {"id": "pqcServerData", "x": 698, "y": 180, "w": 190, "h": 68, "title": "Server", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses the corresponding directional traffic keys to decrypt requests and encrypt responses."}
  ],
  "edges": [
    {"from": "pqcBrowserKey", "to": "pqcKey", "kind": "client", "dots": 3},
    {"from": "pqcKey", "to": "pqcServerKey", "kind": "client", "bidirectional": true, "dots": 3},
    {"from": "pqcServerAuth", "to": "pqcAuth", "kind": "raft", "dots": 3},
    {"from": "pqcAuth", "to": "pqcBrowserAuth", "kind": "raft", "dots": 3},
    {"from": "pqcBrowserData", "to": "pqcData", "kind": "application", "bidirectional": true, "dots": 2},
    {"from": "pqcData", "to": "pqcServerData", "kind": "application", "bidirectional": true, "dots": 2}
  ]
}
```

> ℹ️ **TLS deep dive**
>
> Understanding TLS at a high level facilitates our understanding of the impact of what changes between traditional, hybrid, and post-quantum TLS. Taking a deeper view of TLS can be benficial for the right audience, so if that is you, there is another post on [The TLS story]({{< ref "/demystified/TLS" >}})

#### Key establishment {#tls-hla-key-establishment}
<!-- Explain how this is the root of the encryption keys and through this attackers can recreate your encryption keys and decrypt your data -- HNDL -->
Think of this as the method or mechanism that allows different parties (Ex. the server and the client) to derive a secret, and this secret is used as an input in the [encryption phase]({{< ref "/demystified/pqc2-demystified" >}}#tls-hla-encryption). This is the first line of defense against a CRQC and where ML-KEM is leveraged with x25519 for hybrid key exchange. When you hear about Harvest Now, Decrypt Later; this is the phase that is vulnerable. If someone were to capture your traffic using a non-PQC algorithm such as x25519, with a CRQC, they would be able to efficiently determine the derived secret and in turn determine the encryption key used in the encryption phase and decrypt all of the data.


#### Authentication {#tls-hla-authn}
<!-- Explain the impact of vulnerable signatures and signing authorities -->
Think of this as the method or mechanism that allows a party to trust the other (ex. client trusting the server). This allows clients to maintain confidentiality, and integrity by making sure the encryption keys are established with the intended server and prevents a man in the middle (MITM) attack. This is the second line of defense against a CRQC and where ML-DSA & SLH-DSA are leveraged. Using non PQC algorithms such as RSA or ECDSA for signing, allows for a CRQC to recover the private key used to sign messages and essentially impersonate the server. This exposes you to being vulnerable to a MITM attack where the impersonater could intercept traffic, modify/alter the data, and redirect the traffic. 

> ℹ️ **Mutual TLS (mTLS)**
>
> We discuss TLS 1.3 a lot as it relates to a client and server but there are also other components such as mTLS which we dive into in [The TLS story]({{< ref "/demystified/TLS" >}})

#### Encryption {#tls-hla-encryption}
<!-- AES and asymmetric algorithms not being as vulnerable to CRQC or shors algorithm -->
Encryption, most people understand; but think of this as the method of protecting the data sent between different parties. Secure communication between parties is important to prevent people from capturing and using or leveraging sensative information. As of today there are three symmetric algorithm families AES-GCM, AES-CCM, and ChaCha within TLS 1.3. AES-GCM and ChaCha are the only two that have 256-bit keys which make these algorithms quantum resistent.

> ℹ️ **Shors vs Grovers Algorithm**
>
> It should be noted that the PQC NIST approved algorithms are all trying to mitigate Shors algorithm, which proves in theory that a CRQC can break traditional asymetric algorithms used in the [key establishment phase]({{< ref "/demystified/pqc2-demystified" >}}#tls-hla-key-establishment) and the [authentication phase]({{< ref "/demystified/pqc2-demystified" >}}##tls-hla-authn) within TLS. Grovers algorithm does also in theory prove that symmetric algorithms such as AES and ChaCha are vulnerable to a CRQC by reducing the complexity of an exhaustive search but the risk at the time of writing is not as severe. This does not mean that symmetric algorithms such as AES wont become more vulnerable to a CRQC, we just havent proven it yet.

### PQC quirks
<!-- Going to talk about lack of browser support for pure PQC, sizes of the keys, signatures, algorithms -->
<!-- Dropping packets becuase of hardcoded expectation of packet sizes such as 10KB. -->
<!-- TLS 1.2 not supported for PQC -->
As with any technology that is becoming standard, there are a few quirks to be aware of. The two items that are top of mind; lack of support for pure PQC workflows, and the significant increase in data (signature, keys, etc). 

<!-- , and PQC is only supported by TLS 1.3. This needs to be verified -->

Lack of support for example with browsers can be a significant hurdle. Take for example, if you were to create an application and its server certificate were to leverage an ML-DSA signed certificate, even with the root existing in the clients CA store, the browser would not be able to trust the certificate becuase it does not know how to validate ML-DSA public key, signatures, and the TLS handshake. 

There are other quirks I am sure, and please mention them in the chat for others to learn what you have discovered as well.
One terminology correction matters here: when a browser supports `X25519MLKEM768`, it is normally supporting **hybrid key establishment**, not an "ML-KEM certificate." ML-KEM cannot sign a certificate or the TLS `CertificateVerify` message because it is a KEM, not a signature algorithm.

Hybrid key establishment was easier for browsers and servers to deploy first because it is largely contained within the TLS supported-group and key-share machinery. The existing certificate, public CA, Certificate Transparency, trust-store, and server-authentication ecosystem can remain in place while ML-KEM protects the creation of new traffic keys.

Pure ML-DSA or SLH-DSA authentication changes much more of that ecosystem. Browsers, TLS libraries, web servers, certificate authorities, Certificate Transparency logs, HSMs, ACME clients, security appliances, and operating-system trust stores all need compatible algorithm and certificate support. Larger public keys and signatures must also fit through protocols, middleboxes, and operational tooling that were designed around smaller classical certificates.

The standards are progressing: [RFC 9881](https://www.rfc-editor.org/rfc/rfc9881.html) defines ML-DSA identifiers for X.509 certificates, [RFC 9909](https://www.rfc-editor.org/rfc/rfc9909.html) does the same for SLH-DSA, and [RFC 9935](https://www.rfc-editor.org/rfc/rfc9935.html) defines ML-KEM keys in X.509. That does not make ML-KEM a signing algorithm, and standardization alone does not instantly create a universally trusted public-PKI deployment path.

#### Considerations
<!-- TAlk about MTCs and Hybrid certs, OpenSSL support for internal communication-->


### What needs to be done
<!-- Talk about the implementation of ML-KEM within public TLS to mitigate HNDL, talk about home networks and packet captures, talk about internal private communications for companies, and talking PIV or CAC cards? -->

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



