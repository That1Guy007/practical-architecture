---
title: "ADR-0001: Selecting a Remote Access Solution"
description: "A hypothetical decision record comparing remote administration patterns for a self-hosted platform."
date: 2026-10-18
lastmod: 2026-10-18
draft: true
document_type: "ADR"
layout: "adr"
adr_id: "ADR-0001"
decision_date: 2026-10-18
category: "Networking"
topics:
  - "Networking"
  - "Identity and Security"
  - "Homelab Engineering"
technologies:
  - "WireGuard"
tags:
  - "remote-access"
  - "network-security"
status: "Proposed"
version: "0.1"
sample: true
supersedes: []
superseded_by: []
related_docs:
  - "/docs/architecture/self-hosted-ai-platform-architecture"
  - "/docs/projects/homelab-ai-platform"
---

> **Illustrative sample:** This is a proposed decision for a hypothetical
> environment. It does not record a product purchase, deployed control, or
> completed evaluation.

## Context

Administrators need remote access to a self-hosted platform without exposing
cluster management interfaces directly to the internet. The design must remain
usable during routine maintenance while making access review and revocation
straightforward.

## Decision drivers

- No public exposure of administrative services.
- Strong device and user identity with prompt revocation.
- Least-privilege routes instead of default access to the entire network.
- Support for multiple operating systems and changing client networks.
- Recoverability when the primary coordination service is unavailable.
- Operational effort appropriate for a small environment.

## Considered options

| Option | Advantages | Tradeoffs |
|---|---|---|
| Identity-aware encrypted overlay | Central policy and simple client roaming | Coordination service becomes an operational dependency |
| Native point-to-site WireGuard | Small protocol surface and direct control | Peer, route, key, and revocation management stays local |
| Traditional VPN concentrator | Familiar network model and broad client support | Larger gateway blast radius and coarse network-level access |
| Per-service access proxy | Fine-grained application access | Does not by itself cover every administrative protocol |

## Decision outcome

**Proposed:** use an identity-aware encrypted overlay for routine
administration, publish only explicit routes, and retain an independently
tested local recovery path. Product selection is deferred until a proof of
concept validates identity integration, route policy, client support, audit
events, and recovery behavior.

This choice is proposed because it makes the desired access model explicit
without treating reachability as authorization. Administrative services must
still authenticate and authorize the caller.

## Consequences

### Positive

- Administrative endpoints can remain on private addresses.
- User and device removal can be handled as an identity lifecycle event.
- Route grants can be narrower than full network access.

### Negative

- The coordination plane and identity provider add dependencies.
- Client enrollment and device posture require documented support processes.
- A separate recovery method must be protected and exercised.

### Risks and mitigations

- **Coordination outage:** maintain time-bounded local access and test it on a
  schedule.
- **Overbroad routes:** review route policy as code and deny broad defaults.
- **Compromised client:** combine short-lived authorization with service-level
  authentication and rapid device revocation.

## Confirmation

Before acceptance, a proof of concept would need to demonstrate revocation,
least-privilege routing, identity-provider failure behavior, audit visibility,
and documented recovery. No such results are claimed by this sample.

## Related decisions

None. A future ADR that replaces this proposal should list this page's content
path in its `supersedes` metadata and add the new page's content path to this
record's `superseded_by` field.

## Related documentation

- [Self-Hosted AI Platform Architecture]({{< ref "/docs/architecture/self-hosted-ai-platform-architecture" >}})
- [Homelab AI Platform]({{< ref "/docs/projects/homelab-ai-platform" >}})

## References

- [NIST SP 800-207, Zero Trust Architecture](https://doi.org/10.6028/NIST.SP.800-207)
- [WireGuard protocol overview](https://www.wireguard.com/protocol/)
