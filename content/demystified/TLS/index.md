---
title: "PROTOCOL, Demystified: What It Is, Why It Matters, and What Teams Should Do Now"
date: 2026-10-24T11:24:52-04:00
lastmod: 2026-10-24T11:24:52-04:00
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
  TEMPLATE: Demystified — Protocol / System
  USE FOR:  Topics built around a specific protocol, standard, or system with defined flows.
            Examples: JWT, OIDC, PKI, Kubernetes RBAC, SPIFFE/SPIRE, mTLS, OAuth 2.0.
  COMMAND:  hugo new --kind demystified-protocol demystified/your-topic-here/
  NOTE:     Place your diagram image as featured.jpg or diagram.png in this folder.
            Mermaid diagrams can be used inline — see section 10.
-->

## Opening Hook

<!-- Start with the specific confusion or misconception engineers have about this protocol.
     Be precise — "most people think JWT is secure by default" is better than "JWT is misunderstood." -->

Most engineers who use PROTOCOL have never read the spec. Here is what that costs them.

---

## Plain-English Definition

<!-- Define the protocol in one paragraph without acronyms, RFCs, or vendor names.
     Then, in a second paragraph, say what it is NOT — this clears the most common conflations. -->

PROTOCOL is...

It is not...

---

#### Inside a Hybrid TLS 1.3 Handshake

Understanding TLS at a high level facilitates our understanding of the impact of **what** changes between traditional, hybrid, and post-quantum TLS. Taking a deeper view of TLS operations can provide further insight but you can skip this This sequence shows **when** each operation happens in a full, server-authenticated TLS 1.3 handshake using [X25519MLKEM768](https://www.rfc-editor.org/rfc/rfc10024.html). It intentionally omits client-certificate authentication, session resumption, 0-RTT, and the `HelloRetryRequest` path so the main path stays readable. The browser is assumed to send an acceptable hybrid key share in its first `ClientHello`. The Browser and Server lanes contain only local work; the Network lane contains only transmitted messages.

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

## Why This Matters

<!-- Protocol topics often have concrete, well-documented failure cases.
     Use those. Name CVEs or incident post-mortems if relevant. -->

### Security risk

### Architecture risk

### Operational risk

---

## The Mental Model

<!-- Protocols often click when you map them to a real-world process: a passport check, a key exchange at a hotel, a notary stamp.
     Find the one analogy that makes the handshake or token flow obvious. -->

Think of PROTOCOL like...

---

## Key Components

<!-- Protocols have named parts. Define each one clearly before explaining how they interact.
     One subsection per component. Keep each to 2-3 sentences. -->

### [Component 1]

### [Component 2]

### [Component 3]

### [Component 4]

---

## How It Works

<!-- Walk through the protocol flow step by step.
     Use numbered steps so readers can trace the sequence. Reference the diagram below. -->

1. [Step 1 — what happens and who initiates it]
2. [Step 2]
3. [Step 3]
4. [Step 4]
5. [Step 5 — final state or outcome]

<!-- If there are multiple flows (e.g., OIDC authorization code vs implicit), use subsections. -->

---

## Where Teams Get It Wrong

<!-- Protocol misuse is often specific and reproducible. Name the exact mistake, not just the category.
     "Teams store the JWT secret in an environment variable alongside the app" > "Teams mishandle secrets." -->

### [Mistake 1 — give it a label]

### [Mistake 2 — give it a label]

### [Mistake 3 — give it a label]

### [Mistake 4 — give it a label]

---

## Practical Architecture Considerations

### Implementation

<!-- Library choices, language support, SDK maturity. What does a real integration look like?
     Call out the footguns in the most popular implementations. -->

### Migration

<!-- If a team is replacing something with this protocol, what breaks?
     Token format changes? Session invalidation? Client library updates? -->

### Cost

<!-- Is this protocol free to implement but expensive to operate? Or the reverse?
     Certificate infrastructure, key management, rotation tooling, observability — name it. -->

### Ownership

<!-- Who owns the identity provider, the certificate authority, or the token service?
     What happens when that team is unavailable? -->

### Operational impact

<!-- Rotation, revocation, expiry — what does a 3am incident look like with this protocol involved?
     What monitoring is non-negotiable? -->

### Security tradeoffs

<!-- What attack surface does this protocol leave open even when implemented correctly?
     SSRF via OIDC discovery? Token replay? Algorithm confusion? Be specific. -->

---

## What I Would Do

<!-- Give a clear, opinionated recommendation based on your experience.
     Specify the implementation stack if it matters: "use the Authorization Code flow with PKCE, not implicit." -->

---

## Final Takeaway

<!-- One memorable sentence that captures the entire post. -->

---

## Diagram

<!-- Add the architecture or flow diagram here. Options:

     Option A — Mermaid (renders inline, no image file needed):

     ```mermaid
     sequenceDiagram
         participant Client
         participant AuthServer
         participant ResourceServer
         Client->>AuthServer: [Step 1]
         AuthServer-->>Client: [Step 2]
         Client->>ResourceServer: [Step 3]
         ResourceServer-->>Client: [Step 4]
     ```

     Option B — Image file in this post bundle:
     ![PROTOCOL flow diagram](diagram.png)

     Keep diagrams focused on the happy path. Put error/edge cases in the text.
-->
