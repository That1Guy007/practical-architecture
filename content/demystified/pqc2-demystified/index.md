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
showTableOfContents: false
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

In Part 1: PQC Demystified we went through what PQC is, why it matters, risks associated with not achieving PQC, and the PQC timeline. Here in Part 2, we will discuss some of the nuances with PQC, the algorithms and their intentions, what has been done for you versus what you need to focus on.

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

[ML-KEM (FIPS-203)](https://csrc.nist.gov/pubs/fips/203/final), [ML-DSA (FIPS-204)](https://csrc.nist.gov/pubs/fips/204/final), and [SLH-DSA (FIPS-205)](https://csrc.nist.gov/pubs/fips/205/final) are the NIST-approved PQC standards discussed here. ML-KEM and ML-DSA are module-lattice-based, while SLH-DSA is hash-based. ML-DSA and SLH-DSA are used for digital signatures and authentication, while ML-KEM is used for key establishment.

Traditional TLS within HTTPS has three distinct jobs: key establishment, authentication, and encryption. ML-KEM is intended for key establishment, while ML-DSA and SLH-DSA are intended for authentication. Notice that none of these algorithms directly encrypts the application data. That distinction is one of the most common sources of confusion when discussing PQC.

### TLS Comparison: Traditional, Hybrid, and Post-Quantum

TLS performs the same three jobs in every model. What changes is the public-key algorithm used for **key establishment** and **authentication**. The final data-encryption phase continues to use efficient symmetric encryption. Use the view buttons to compare each model on demand, then read the selected diagram from top to bottom: establish secret material, authenticate the server and handshake, then protect application data. On smaller screens, scroll horizontally to keep the nodes readable rather than shrinking the entire diagram.

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
  "width": 1200,
  "height": 420,
  "legend": {
    "client": "GREEN · Key establishment: public keys open; shared secret local",
    "raft": "PURPLE · Encrypted certificate authentication",
    "application": "YELLOW · Encrypted application traffic"
  },
  "nodes": [
    {"id": "traditionalBrowserKey", "x": 20, "y": 25, "w": 170, "h": 86, "title": "Browser", "sub": "Ephemeral X25519 key", "tone": "white", "desc": "Creates an ephemeral X25519 private key and sends its public share."},
    {"id": "traditionalKey", "x": 260, "y": 25, "w": 680, "h": 86, "title": "1 · Key establishment", "sub": "OPEN: exchange X25519 public keys · LOCAL: derive matching secret", "tone": "green", "desc": "The browser and server exchange public X25519 keys and independently calculate the same classical shared secret. The private keys and shared secret are never transmitted."},
    {"id": "traditionalServerKey", "x": 1010, "y": 25, "w": 170, "h": 86, "title": "Server", "sub": "Ephemeral X25519 key", "tone": "white", "desc": "Creates an ephemeral X25519 private key, sends its public share, and calculates the same shared secret."},
    {"id": "traditionalBrowserAuth", "x": 20, "y": 162, "w": 170, "h": 86, "title": "Browser", "sub": "Verifies identity", "tone": "white", "desc": "Validates the certificate chain and the server's CertificateVerify signature."},
    {"id": "traditionalAuth", "x": 260, "y": 162, "w": 680, "h": 86, "title": "2 · Authentication", "sub": "ENCRYPTED: RSA or ECDSA certificate + handshake signature", "tone": "purple", "desc": "The certificate chain identifies the server, and the signature binds that identity to the current TLS handshake and key-establishment messages. In TLS 1.3, this server authentication flight is encrypted after ServerHello."},
    {"id": "traditionalServerAuth", "x": 1010, "y": 162, "w": 170, "h": 86, "title": "Server", "sub": "Signs the handshake", "tone": "white", "desc": "Presents its certificate chain and signs the TLS transcript using RSA or ECDSA."},
    {"id": "traditionalBrowserData", "x": 20, "y": 299, "w": 170, "h": 86, "title": "Browser", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses its directional traffic keys to encrypt outgoing records and decrypt incoming records."},
    {"id": "traditionalData", "x": 260, "y": 299, "w": 680, "h": 86, "title": "3 · Data encryption", "sub": "ENCRYPTED: HKDF-derived keys → AES-GCM or ChaCha20-Poly1305", "tone": "yellow", "desc": "Both endpoints run the TLS key schedule and derive matching directional traffic keys and initialization vectors. Those values protect the actual HTTP data."},
    {"id": "traditionalServerData", "x": 1010, "y": 299, "w": 170, "h": 86, "title": "Server", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses its corresponding directional traffic keys to decrypt incoming records and encrypt responses."}
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
  "width": 1200,
  "height": 420,
  "legend": {
    "client": "GREEN · Key establishment: public values open; both secrets local",
    "raft": "PURPLE · Encrypted classical certificate authentication",
    "application": "YELLOW · Encrypted application traffic"
  },
  "nodes": [
    {"id": "hybridBrowserKey", "x": 20, "y": 25, "w": 170, "h": 86, "title": "Browser", "sub": "Creates both key pairs", "tone": "white", "desc": "Creates an ML-KEM encapsulation and decapsulation key pair plus an ephemeral X25519 key pair. ClientHello sends the ML-KEM public encapsulation key and X25519 public key."},
    {"id": "hybridKey", "x": 260, "y": 25, "w": 680, "h": 86, "title": "1 · Key establishment", "sub": "OPEN: public keys + ciphertext · LOCAL: derive two matching secrets", "tone": "green", "desc": "The X25519 exchange produces a matching classical secret at both endpoints. ML-KEM encapsulation and decapsulation produce a matching post-quantum secret. TLS combines both contributions before deriving keys."},
    {"id": "hybridServerKey", "x": 1010, "y": 25, "w": 170, "h": 86, "title": "Server", "sub": "Creates both secrets", "tone": "white", "desc": "Uses the browser's ML-KEM public encapsulation key to create a post-quantum shared secret and ciphertext, and also calculates the X25519 shared secret."},
    {"id": "hybridBrowserAuth", "x": 20, "y": 162, "w": 170, "h": 86, "title": "Browser", "sub": "Verifies identity", "tone": "white", "desc": "Validates the existing classical certificate chain and CertificateVerify signature."},
    {"id": "hybridAuth", "x": 260, "y": 162, "w": 680, "h": 86, "title": "2 · Authentication", "sub": "ENCRYPTED: RSA or ECDSA certificate + handshake signature", "tone": "purple", "desc": "Most hybrid TLS deployments retain classical authentication. The signature authenticates the server and covers the hybrid key-establishment transcript. In TLS 1.3, this server authentication flight is encrypted after ServerHello."},
    {"id": "hybridServerAuth", "x": 1010, "y": 162, "w": 170, "h": 86, "title": "Server", "sub": "Signs the handshake", "tone": "white", "desc": "Presents its existing certificate chain and signs the hybrid TLS transcript using RSA or ECDSA."},
    {"id": "hybridBrowserData", "x": 20, "y": 299, "w": 170, "h": 86, "title": "Browser", "sub": "Uses traffic keys", "tone": "white", "desc": "Encrypts and decrypts records using keys derived from the combined X25519 and ML-KEM secret material."},
    {"id": "hybridData", "x": 260, "y": 299, "w": 680, "h": 86, "title": "3 · Data encryption", "sub": "ENCRYPTED: HKDF-derived keys → AES-GCM or ChaCha20-Poly1305", "tone": "yellow", "desc": "The encryption algorithm does not become ML-KEM. Both endpoints run the TLS key schedule and independently derive matching directional keys and initialization vectors for the negotiated encryption algorithm."},
    {"id": "hybridServerData", "x": 1010, "y": 299, "w": 170, "h": 86, "title": "Server", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses the corresponding directional traffic keys to decrypt requests and encrypt responses."}
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
  "width": 1200,
  "height": 420,
  "legend": {
    "client": "GREEN · Key establishment: public values open; shared secret local",
    "raft": "PURPLE · Encrypted post-quantum certificate authentication",
    "application": "YELLOW · Encrypted application traffic"
  },
  "nodes": [
    {"id": "pqcBrowserKey", "x": 20, "y": 25, "w": 170, "h": 86, "title": "Browser", "sub": "Creates ML-KEM key pair", "tone": "white", "desc": "Creates an ephemeral ML-KEM public encapsulation key and private decapsulation key, then sends only the public key."},
    {"id": "pqcKey", "x": 260, "y": 25, "w": 680, "h": 86, "title": "1 · Key establishment", "sub": "OPEN: public key + ciphertext · LOCAL: derive matching PQ secret", "tone": "green", "desc": "The server encapsulates using the browser's public encapsulation key and keeps the resulting post-quantum shared secret. The browser decapsulates the returned ciphertext to reproduce that same secret."},
    {"id": "pqcServerKey", "x": 1010, "y": 25, "w": 170, "h": 86, "title": "Server", "sub": "Creates secret + ciphertext", "tone": "white", "desc": "Uses the browser's public encapsulation key to create a post-quantum shared secret and ciphertext, keeps the secret, and sends the ciphertext to the browser."},
    {"id": "pqcBrowserAuth", "x": 20, "y": 162, "w": 170, "h": 86, "title": "Browser", "sub": "Verifies PQ identity", "tone": "white", "desc": "Validates the post-quantum certificate path and verifies the ML-DSA or SLH-DSA handshake signature."},
    {"id": "pqcAuth", "x": 260, "y": 162, "w": 680, "h": 86, "title": "2 · Authentication", "sub": "ENCRYPTED: ML-DSA or SLH-DSA certificate + handshake signature", "tone": "purple", "desc": "A quantum-resistant certificate chain identifies the server, and a post-quantum signature binds that identity to the TLS transcript and ML-KEM exchange. In TLS 1.3, this server authentication flight is encrypted after ServerHello."},
    {"id": "pqcServerAuth", "x": 1010, "y": 162, "w": 170, "h": 86, "title": "Server", "sub": "Uses PQ signature", "tone": "white", "desc": "Presents a post-quantum certificate chain and signs the TLS transcript using ML-DSA or SLH-DSA."},
    {"id": "pqcBrowserData", "x": 20, "y": 299, "w": 170, "h": 86, "title": "Browser", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses symmetric traffic keys derived from the ML-KEM secret to encrypt and decrypt application records."},
    {"id": "pqcData", "x": 260, "y": 299, "w": 680, "h": 86, "title": "3 · Data encryption", "sub": "ENCRYPTED: HKDF-derived keys → AES-GCM or ChaCha20-Poly1305", "tone": "yellow", "desc": "Both endpoints independently derive matching directional traffic keys and initialization vectors. Symmetric encryption remains the efficient data-protection layer; Shor's algorithm does not break AES or ChaCha20 in the way it breaks today's public-key algorithms."},
    {"id": "pqcServerData", "x": 1010, "y": 299, "w": 170, "h": 86, "title": "Server", "sub": "Uses traffic keys", "tone": "white", "desc": "Uses the corresponding directional traffic keys to decrypt requests and encrypt responses."}
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

### Inside a Hybrid TLS 1.3 Handshake

The comparison diagrams show **what** changes between traditional, hybrid, and post-quantum TLS. This sequence shows **when** each operation happens in a full, server-authenticated TLS 1.3 handshake using [X25519MLKEM768](https://www.rfc-editor.org/rfc/rfc10024.html). It intentionally omits client-certificate authentication, session resumption, 0-RTT, and the `HelloRetryRequest` path so the main path stays readable. The browser is assumed to send an acceptable hybrid key share in its first `ClientHello`. The Browser and Server lanes contain only local work; the Network lane contains only transmitted messages.

The critical ML-KEM relationship is: **Encaps(browser ML-KEM public key) → ciphertext + shared secret** on the server, followed by **Decaps(browser ML-KEM private key, ciphertext) → the same shared secret** in the browser. The ciphertext is public; the matching shared secret is never transmitted.

```flow
{
  "title": "Inside X25519MLKEM768 in TLS 1.3",
  "desc": "A complete three-lane hybrid TLS 1.3 sequence. It follows the ML-KEM and X25519 contributions separately, shows the offers in ClientHello and the corresponding selections in ServerHello, EncryptedExtensions, and CertificateVerify, and continues through Finished and protected application data.",
  "caption": "Figure 4. A complete full-handshake path with an acceptable first ClientHello key share. ClientHello offers capabilities and sends both client contributions. ServerHello returns the selected version, cipher suite, hybrid group, ML-KEM ciphertext, and server X25519 share. EncryptedExtensions and CertificateVerify carry the remaining server selections. Both endpoints then reproduce the same two secrets, combine them, authenticate the transcript, and derive directional application keys.",
  "wide": true,
  "width": 1200,
  "height": 3400,
  "legend": {
    "client": "GREEN · Sent openly before handshake encryption",
    "store": "TEAL · Calculated locally; secret values are never sent",
    "raft": "PURPLE · Encrypted handshake and authentication",
    "application": "YELLOW · Encrypted application data"
  },
  "lanes": [
    {"title": "Browser · local work", "x": 10, "y": 20, "w": 360, "h": 3360},
    {"title": "Network · transmitted messages", "x": 420, "y": 20, "w": 360, "h": 3360},
    {"title": "Server · local work", "x": 830, "y": 20, "w": 360, "h": 3360}
  ],
  "nodes": [
    {"id": "seqClientKemKeys", "x": 30, "y": 90, "w": 320, "h": 115, "title": "1A · Generate ML-KEM-768 keys", "lines": ["Create the browser's ML-KEM public key", "Create the browser's ML-KEM private key", "Keep the private key in the browser"], "tone": "teal", "desc": "The browser runs ML-KEM-768 key generation. It will send its public encapsulation key but keeps its private decapsulation key local."},
    {"id": "seqClientXKeys", "x": 30, "y": 240, "w": 320, "h": 115, "title": "1B · Generate X25519 keys", "lines": ["Create the browser's X25519 public share", "Create the browser's X25519 private key", "Keep the private key in the browser"], "tone": "teal", "desc": "The browser generates an ephemeral X25519 private key and its corresponding public share. Only the browser's X25519 public share will be transmitted."},
    {"id": "seqClientHello", "x": 440, "y": 405, "w": 320, "h": 150, "title": "2 · ClientHello: offers + key share", "lines": ["Offer TLS 1.3 and cipher suites", "Offer the X25519MLKEM768 group", "Offer supported signature methods", "Send the browser's ML-KEM public key", "Send the browser's X25519 public share"], "tone": "green", "desc": "One unencrypted ClientHello carries the browser's offers and hybrid client share. The hybrid share contains the 1184-byte browser ML-KEM public key followed by the 32-byte browser X25519 public share. No private key or shared secret is sent."},
    {"id": "seqServerSelect", "x": 850, "y": 605, "w": 320, "h": 125, "title": "3 · Match the client's offers", "lines": ["Select TLS 1.3", "Select one offered cipher suite", "Select the X25519MLKEM768 group", "Select compatible certificate signing"], "tone": "teal", "desc": "The server selects TLS 1.3, one offered TLS 1.3 cipher suite, and the X25519MLKEM768 group. It also identifies a certificate and handshake-signature method compatible with the browser's offer; the chosen handshake-signature method is disclosed later in CertificateVerify."},
    {"id": "seqServerKem", "x": 850, "y": 770, "w": 320, "h": 145, "title": "4A · Complete the ML-KEM path", "lines": ["Validate the browser's ML-KEM public key", "Encapsulate to create a ciphertext", "Create the ML-KEM shared secret", "Send the ciphertext", "Keep the shared secret local"], "tone": "teal", "desc": "The server validates the browser's ML-KEM public key and runs ML-KEM-768 encapsulation. Encapsulation returns a ciphertext and a 32-byte ML-KEM shared secret. The server retains the shared secret and places the ciphertext in its hybrid server share."},
    {"id": "seqServerX", "x": 850, "y": 935, "w": 320, "h": 145, "title": "4B · Complete the X25519 path", "lines": ["Create the server's X25519 key pair", "Use both sides' X25519 key material", "Create the X25519 shared secret", "Send the server's public share", "Keep the private key and secret local"], "tone": "teal", "desc": "The server generates an ephemeral X25519 private key and public share. It combines its private key with the browser's public share to calculate the 32-byte X25519 shared secret. The server retains its private key and shared secret and places its public share in the hybrid server share."},
    {"id": "seqServerHello", "x": 440, "y": 1110, "w": 320, "h": 165, "title": "5 · ServerHello: selections + key share", "lines": ["Confirm TLS 1.3", "Return the selected cipher suite", "Return the X25519MLKEM768 group", "Send the ML-KEM ciphertext", "Send the server's X25519 public share", "End the unencrypted part of the handshake"], "tone": "green", "desc": "ServerHello returns the selected protocol version and cipher suite. Its hybrid key share selects X25519MLKEM768 and contains the 1088-byte ML-KEM ciphertext followed by the 32-byte server X25519 public share. ServerHello is the final unencrypted handshake message."},
    {"id": "seqClientKem", "x": 30, "y": 1305, "w": 320, "h": 145, "title": "6A · Finish the ML-KEM path", "lines": ["Validate the received ML-KEM ciphertext", "Use the browser's ML-KEM private key", "Decapsulate the received ciphertext", "Recreate the same ML-KEM shared secret", "Keep the private key and secret local"], "tone": "teal", "desc": "The browser checks the ciphertext length and runs ML-KEM-768 decapsulation with its ML-KEM private key and the received ciphertext. The result is the same ML-KEM shared secret held by the server."},
    {"id": "seqClientX", "x": 30, "y": 1470, "w": 320, "h": 145, "title": "6B · Finish the X25519 path", "lines": ["Validate the server's X25519 public share", "Use both sides' X25519 key material", "Recreate the same X25519 shared secret", "Keep the private key and secret local"], "tone": "teal", "desc": "The browser validates the server's X25519 public share and combines it with the browser's private key. The result is the same X25519 shared secret held by the server."},
    {"id": "seqBrowserHybrid", "x": 30, "y": 1645, "w": 320, "h": 110, "title": "7A · Build the hybrid secret", "lines": ["Place the ML-KEM shared secret first", "Append the X25519 shared secret", "Produce a 64-byte hybrid secret"], "tone": "teal", "desc": "For X25519MLKEM768, the browser concatenates the 32-byte ML-KEM shared secret followed by the 32-byte X25519 shared secret, producing the 64-byte hybrid shared secret input."},
    {"id": "seqServerHybrid", "x": 850, "y": 1645, "w": 320, "h": 110, "title": "7B · Build the same hybrid secret", "lines": ["Place the ML-KEM shared secret first", "Append the X25519 shared secret", "Produce the same 64-byte hybrid secret"], "tone": "teal", "desc": "The server concatenates its matching ML-KEM and X25519 shared secrets in the same required order. Its 64-byte result is identical to the browser's."},
    {"id": "seqBrowserHandshakeKeys", "x": 30, "y": 1805, "w": 320, "h": 125, "title": "8A · Derive handshake protection", "lines": ["Use the hybrid secret and handshake record", "Run the TLS 1.3 key schedule", "Derive both handshake encryption keys", "Derive both initialization vectors"], "tone": "teal", "desc": "The browser feeds the hybrid shared secret and handshake record through the TLS 1.3 key schedule. It derives separate client and server handshake traffic secrets, encryption keys, and initialization vectors."},
    {"id": "seqServerHandshakeKeys", "x": 850, "y": 1805, "w": 320, "h": 125, "title": "8B · Derive matching protection", "lines": ["Use the same secret and handshake record", "Run the same TLS 1.3 key schedule", "Derive the same handshake keys", "Derive the same initialization vectors"], "tone": "teal", "desc": "The server performs the same key-schedule calculations and obtains matching client and server handshake encryption keys and initialization vectors. Every subsequent handshake message is encrypted."},
    {"id": "seqServerAuthPrepare", "x": 850, "y": 1965, "w": 320, "h": 145, "title": "9A · Create the server flight", "lines": ["Select the application protocol", "Attach the server certificate chain", "Sign using a supported method", "Create the server Finished proof", "Encrypt the entire server flight"], "tone": "teal", "desc": "The server selects encrypted parameters such as the application protocol, attaches its certificate chain, chooses a CertificateVerify signature method from the browser's offer, signs the handshake record, and calculates Finished. It encrypts the flight with the server handshake encryption key and initialization vector."},
    {"id": "seqEncryptedExtensions", "x": 440, "y": 2145, "w": 320, "h": 100, "title": "9B · EncryptedExtensions", "lines": ["Return the selected application protocol", "Return other server parameters"], "tone": "purple", "desc": "EncryptedExtensions returns negotiated parameters that are not required to establish the handshake keys, such as whether the connection will carry HTTP/2 or HTTP/1.1. The server encrypts these parameters with its handshake encryption key."},
    {"id": "seqServerProof", "x": 440, "y": 2295, "w": 320, "h": 115, "title": "9C · Certificate → Finished", "lines": ["Send the server certificate chain", "Send the signature method and signature", "Send the server Finished proof"], "tone": "purple", "desc": "Certificate identifies the server. CertificateVerify explicitly carries the compatible signature method the server chose and its signature over the handshake record. Finished proves possession of the handshake secret and confirms that the record was not changed."},
    {"id": "seqBrowserVerify", "x": 30, "y": 2460, "w": 320, "h": 125, "title": "10 · Authenticate the server", "lines": ["Decrypt the server flight", "Validate the certificate chain and hostname", "Verify the server's handshake signature", "Verify the server Finished proof"], "tone": "teal", "desc": "The browser decrypts the server flight, validates the certificate chain and hostname, verifies the CertificateVerify signature, and verifies Finished. ML-KEM and X25519 established secrets; the certificate and signature authenticate the server."},
    {"id": "seqBrowserApplicationKeys", "x": 30, "y": 2630, "w": 320, "h": 125, "title": "11A · Derive application protection", "lines": ["Use the record through server Finished", "Derive the browser-to-server key", "Derive the server-to-browser key", "Derive an initialization vector for each"], "tone": "teal", "desc": "Using the handshake record through server Finished, the browser advances the TLS key schedule. It derives separate browser-to-server and server-to-browser application encryption keys and an initialization vector for each direction."},
    {"id": "seqServerApplicationKeys", "x": 850, "y": 2630, "w": 320, "h": 125, "title": "11B · Derive matching protection", "lines": ["Use the record through server Finished", "Derive the same two application keys", "Derive the same initialization vectors", "Keep these separate from handshake keys"], "tone": "teal", "desc": "After calculating server Finished, the server derives the same two directional application encryption keys and initialization vectors. These application values are distinct from the handshake keys and initialization vectors."},
    {"id": "seqBrowserFinishedPrepare", "x": 30, "y": 2790, "w": 320, "h": 100, "title": "12A · Create client Finished", "lines": ["Create proof of the client's handshake record", "Encrypt it with client handshake protection"], "tone": "teal", "desc": "The browser calculates its Finished value to confirm the handshake record and possession of the handshake secret. It encrypts that proof with the client handshake key and initialization vector."},
    {"id": "seqBrowserFinished", "x": 440, "y": 2935, "w": 320, "h": 100, "title": "12B · Client Finished", "lines": ["Send the encrypted Finished proof", "Use client handshake protection"], "tone": "purple", "desc": "The encrypted client Finished message crosses the network. It is still a handshake record, so it uses client handshake protection rather than an application key."},
    {"id": "seqServerVerify", "x": 850, "y": 3080, "w": 320, "h": 90, "title": "13 · Verify client Finished", "lines": ["Decrypt and verify the client's proof", "Mark the full handshake complete"], "tone": "teal", "desc": "The server decrypts client Finished using the matching client handshake protection and verifies its value. The full handshake is now complete."},
    {"id": "seqBrowserRecords", "x": 30, "y": 3230, "w": 320, "h": 100, "title": "14A · Browser application data", "lines": ["Encrypt requests", "Decrypt responses", "Use the correct directional application key"], "tone": "yellow", "desc": "The browser encrypts requests with the browser-to-server application key and decrypts responses with the server-to-browser application key."},
    {"id": "seqNetworkRecords", "x": 440, "y": 3230, "w": 320, "h": 100, "title": "14B · Protected HTTP records ↔", "lines": ["Use AES-GCM or ChaCha20-Poly1305", "Use the suite selected in ServerHello"], "tone": "yellow", "desc": "Only protected HTTP records cross the network. The selected TLS 1.3 cipher suite determines the authenticated-encryption algorithm and key-derivation hash; it does not select ML-KEM, X25519, or the signature method."},
    {"id": "seqServerRecords", "x": 850, "y": 3230, "w": 320, "h": 100, "title": "14C · Server application data", "lines": ["Decrypt requests", "Encrypt responses", "Use the correct directional application key"], "tone": "yellow", "desc": "The server decrypts requests with the browser-to-server application key and encrypts responses with the server-to-browser application key."}
  ],
  "edges": [
    {"from": "seqClientKemKeys", "to": "seqClientHello", "kind": "client"},
    {"from": "seqClientXKeys", "to": "seqClientHello", "kind": "client"},
    {"from": "seqClientHello", "to": "seqServerSelect", "kind": "client"},
    {"from": "seqServerSelect", "to": "seqServerKem", "kind": "store"},
    {"from": "seqServerSelect", "to": "seqServerX", "kind": "store", "path": "M1170 668 C1184 668 1184 998 1170 998"},
    {"from": "seqServerKem", "to": "seqServerHello", "kind": "client"},
    {"from": "seqServerX", "to": "seqServerHello", "kind": "client"},
    {"from": "seqServerHello", "to": "seqClientKem", "kind": "client"},
    {"from": "seqServerHello", "to": "seqClientX", "kind": "client", "path": "M440 1182 C395 1182 395 1532 350 1532"},
    {"from": "seqClientKem", "to": "seqBrowserHybrid", "kind": "store"},
    {"from": "seqClientX", "to": "seqBrowserHybrid", "kind": "store"},
    {"from": "seqServerKem", "to": "seqServerHybrid", "kind": "store", "path": "M1170 832 C1184 832 1184 1700 1170 1700"},
    {"from": "seqServerX", "to": "seqServerHybrid", "kind": "store"},
    {"from": "seqBrowserHybrid", "to": "seqBrowserHandshakeKeys", "kind": "store"},
    {"from": "seqServerHybrid", "to": "seqServerHandshakeKeys", "kind": "store"},
    {"from": "seqServerHandshakeKeys", "to": "seqServerAuthPrepare", "kind": "raft"},
    {"from": "seqServerAuthPrepare", "to": "seqEncryptedExtensions", "kind": "raft"},
    {"from": "seqEncryptedExtensions", "to": "seqServerProof", "kind": "raft"},
    {"from": "seqServerProof", "to": "seqBrowserVerify", "kind": "raft"},
    {"from": "seqBrowserVerify", "to": "seqBrowserApplicationKeys", "kind": "store"},
    {"from": "seqServerAuthPrepare", "to": "seqServerApplicationKeys", "kind": "store"},
    {"from": "seqBrowserHandshakeKeys", "to": "seqBrowserFinishedPrepare", "kind": "raft", "path": "M350 1860 C395 1860 395 2840 350 2840"},
    {"from": "seqBrowserFinishedPrepare", "to": "seqBrowserFinished", "kind": "raft"},
    {"from": "seqBrowserFinished", "to": "seqServerVerify", "kind": "raft"},
    {"from": "seqBrowserApplicationKeys", "to": "seqBrowserRecords", "kind": "application", "path": "M30 2685 C16 2685 16 3280 30 3280"},
    {"from": "seqServerApplicationKeys", "to": "seqServerRecords", "kind": "application", "path": "M1170 2685 C1184 2685 1184 3280 1170 3280"},
    {"from": "seqServerVerify", "to": "seqServerRecords", "kind": "store"},
    {"from": "seqBrowserRecords", "to": "seqNetworkRecords", "kind": "application", "bidirectional": true},
    {"from": "seqNetworkRecords", "to": "seqServerRecords", "kind": "application", "bidirectional": true}
  ]
}
```

#### Key establishment

Key establishment allows the browser and server to independently arrive at the same secret without sending that secret across the network. TLS then feeds that secret into HKDF, its key-derivation function, to derive the keys and initialization vectors used by the negotiated encryption algorithm. In simple terms: key establishment creates the shared raw material; the TLS key schedule turns that material into usable encryption keys.

Current browser deployments commonly use the hybrid group [X25519MLKEM768](https://www.rfc-editor.org/rfc/rfc10024.html). It combines two independent contributions:

* **X25519** provides the established classical shared secret.
* **ML-KEM** provides a shared secret designed to resist both classical and quantum attacks.

Both must succeed to recreate the combined secret. This protects the transition: the connection retains the protection of X25519 while adding ML-KEM's post-quantum protection.

ML-KEM encapsulation is not a wrapper around arbitrary data. The browser first runs `KeyGen`, keeps the private decapsulation key, and sends the public encapsulation key in `ClientHello`. The server runs `Encaps` with that public key and gets two matching outputs: an ML-KEM shared secret and a ciphertext. The server sends only the ciphertext back. The browser runs `Decaps` with its private key and the ciphertext to recreate the same shared secret. The server's private key, an AES key, and the application data are never placed "inside" that ciphertext.

The values visible on the network are the two X25519 public shares, the browser's ML-KEM public encapsulation key, and the server's ML-KEM ciphertext. The private keys, shared secrets, and derived TLS traffic keys are not transmitted.


#### Authentication

Authentication answers a different question: *Am I really talking to the server named in this certificate?* The server presents a certificate chain and signs the TLS handshake. The browser validates the chain and signature, which prevents an attacker from silently replacing the server's public handshake values with their own.

ML-DSA and SLH-DSA are post-quantum signature algorithms for this job. [ML-DSA](https://csrc.nist.gov/pubs/fips/204/final) is the more practical general-purpose option because its signatures are smaller and faster. [SLH-DSA](https://csrc.nist.gov/pubs/fips/205/final) is hash-based and provides valuable design diversity, but its larger signatures and additional performance cost make it more likely to serve specialized or backup roles.

Signatures authenticate the server and the handshake; they do not encrypt the HTTP data. After the handshake, the authenticated-encryption algorithm protects each TLS record's confidentiality and integrity.

#### Encryption

The actual application data is still encrypted with a fast symmetric algorithm such as AES-GCM or ChaCha20-Poly1305. The browser offers TLS 1.3 cipher suites, and the server selects one that both sides support. Key exchange groups, signature algorithms, and cipher suites are negotiated separately.

Shor's algorithm threatens the public-key mathematics behind RSA, elliptic-curve key exchange, and elliptic-curve signatures; it does not break symmetric encryption in the same way. Grover's algorithm gives a theoretical quadratic speedup against brute-force key search, which is why AES-256 is commonly treated as a conservative choice for long-term protection. NIST's initial PQC standards therefore focus on key establishment and digital signatures rather than replacing AES.

The short version is:

| TLS job | Purpose | Common classical algorithm | Post-quantum direction |
|---|---|---|---|
| Key establishment | Create matching secret material on both endpoints | X25519 | ML-KEM, currently combined with X25519 |
| Authentication | Prove server identity and bind it to the handshake | RSA or ECDSA signatures | ML-DSA or SLH-DSA signatures |
| Data protection | Encrypt and authenticate the actual application data | AES-GCM or ChaCha20-Poly1305 | Keep strong symmetric encryption and derive fresh keys from the hybrid secret |

### PQC quirks

One terminology correction matters here: when a browser supports `X25519MLKEM768`, it is normally supporting **hybrid key establishment**, not an "ML-KEM certificate." ML-KEM cannot sign a certificate or the TLS `CertificateVerify` message because it is a KEM, not a signature algorithm.

Hybrid key establishment was easier for browsers and servers to deploy first because it is largely contained within the TLS supported-group and key-share machinery. The existing certificate, public CA, Certificate Transparency, trust-store, and server-authentication ecosystem can remain in place while ML-KEM protects the creation of new traffic keys.

Pure ML-DSA or SLH-DSA authentication changes much more of that ecosystem. Browsers, TLS libraries, web servers, certificate authorities, Certificate Transparency logs, HSMs, ACME clients, security appliances, and operating-system trust stores all need compatible algorithm and certificate support. Larger public keys and signatures must also fit through protocols, middleboxes, and operational tooling that were designed around smaller classical certificates.

The standards are progressing: [RFC 9881](https://www.rfc-editor.org/rfc/rfc9881.html) defines ML-DSA identifiers for X.509 certificates, [RFC 9909](https://www.rfc-editor.org/rfc/rfc9909.html) does the same for SLH-DSA, and [RFC 9935](https://www.rfc-editor.org/rfc/rfc9935.html) defines ML-KEM keys in X.509. That does not make ML-KEM a signing algorithm, and standardization alone does not instantly create a universally trusted public-PKI deployment path.

#### Considerations
<!-- TAlk about MTCs and Hybrid certs -->

### What needs to be done
<!-- Talk about the implementation of ML-KEM within public TLS to mitigate HNDL, talk about home networks and packet captures, talk about internal private communications for companies, and talking PIV or CAC cards? -->





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

#### Key establishment
<!-- Explain how this is the root of the encryption keys and through this attackers can recreate your encryption keys and decrypt your data -- HNDL -->


#### Authentication
<!-- Explain the impact of vulnerable signatures and signing authorities -->

#### Encryption
<!-- AES and asymmetric algorithms not being vulnerable to CRQC or shors algorithm -->

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



