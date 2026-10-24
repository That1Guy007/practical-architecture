---
title: "Self-Hosted AI Platform Architecture"
description: "A hypothetical reference architecture for running private inference and retrieval workloads on self-managed infrastructure."
date: 2026-10-18
lastmod: 2026-10-18
draft: true
document_type: "Architecture"
topics:
  - "Artificial Intelligence and Machine Learning"
  - "Homelab Engineering"
  - "Identity and Security"
technologies:
  - "Kubernetes"
  - "Object Storage"
  - "OpenTelemetry"
  - "SPIFFE"
tags:
  - "ai-platform"
  - "self-hosted"
  - "platform-engineering"
status: "Concept"
version: "0.1"
sample: true
related_docs:
  - "/docs/projects/homelab-ai-platform"
  - "/docs/guides/deploying-workload-identity-architecture-with-spiffe-spire"
  - "/docs/adrs/adr-0001-selecting-a-remote-access-solution"
---

> **Illustrative sample:** This is a hypothetical reference architecture. It
> does not describe an existing production environment, measured capacity, or
> completed security assessment.

## Context

This design explores a small self-hosted platform for private model inference,
retrieval-augmented generation experiments, and repeatable evaluation. The
architecture favors understandable boundaries and replaceable components over
maximum scale.

## Goals and non-goals

**Goals**

- Keep prompts, retrieved documents, and model artifacts inside an explicitly
  controlled environment.
- Separate user access, inference, retrieval, and operations into observable
  security boundaries.
- Make model and application changes reproducible and reversible.
- Expose enough telemetry to distinguish capacity, model, and application
  failures.

**Non-goals**

- Claiming parity with a managed AI platform.
- Designing for public multi-tenancy or unbounded traffic.
- Selecting a final model, accelerator, or vector database.

## Logical architecture

```text
                    +----------------------+
Users -- identity ->| Gateway / policy     |
                    +----------+-----------+
                               |
                 +-------------+-------------+
                 |                           |
        +--------v---------+        +--------v---------+
        | Inference API    |        | Retrieval API    |
        +--------+---------+        +--------+---------+
                 |                           |
        +--------v---------+        +--------v---------+
        | Model serving    |        | Index + metadata |
        +--------+---------+        +--------+---------+
                 |                           |
                 +-------------+-------------+
                               |
                    +----------v-----------+
                    | Object storage       |
                    +----------------------+

Control plane: deployment automation, secrets, policy, telemetry, backups
```

## Component responsibilities

| Component | Responsibility | Boundary to protect |
|---|---|---|
| Gateway | Authenticate callers, apply coarse policy, and enforce request limits | Public or remote access to internal services |
| Inference API | Validate requests, select an approved model endpoint, and constrain generation settings | Application code to model runtime |
| Model serving | Load approved artifacts and schedule CPU, memory, or accelerator resources | Workload to host hardware |
| Retrieval API | Enforce document access before search and assemble bounded context | User query to indexed data |
| Storage | Hold versioned model artifacts, documents, and backup data | Persistent data to workloads |
| Telemetry | Collect metrics, traces, and security-relevant events | Operational access to platform data |

## Trust boundaries and request flow

1. The gateway authenticates a caller and passes only a verified identity and
   bounded request to the application tier.
2. The application authorizes access to a model and, when needed, a document
   collection. Authentication alone is not sufficient authorization.
3. Retrieval filters by the caller's permitted data scope before context is
   delivered to inference.
4. The platform records request metadata needed for operations without logging
   secrets or full prompts by default.

Service-to-service identity could follow the illustrative
[SPIFFE/SPIRE workload identity guide]({{< ref "/docs/guides/deploying-workload-identity-architecture-with-spiffe-spire" >}}).

## Quality attributes

| Attribute | Design response | Evidence needed before production |
|---|---|---|
| Security | Explicit identity, authorization at data boundaries, and isolated workloads | Threat model and access-control tests |
| Reliability | Health checks, bounded queues, versioned artifacts, and recoverable state | Failure and restore exercises |
| Performance | Separate API and model-serving layers so each can be measured | Workload-specific latency and saturation tests |
| Operability | Unified logs, metrics, traces, deployment metadata, and runbooks | Alert review and incident exercise |
| Portability | Interfaces around model serving and storage rather than provider-specific application code | Replacement proof of concept |

## Decisions still required

- Accelerator and scheduling strategy based on measured workloads.
- Artifact provenance, vulnerability review, and model approval process.
- Backup objectives for metadata, indexed documents, and configuration.
- Remote administrative access. The hypothetical decision record is
  [ADR-0001: Selecting a Remote Access Solution]({{< ref "/docs/adrs/adr-0001-selecting-a-remote-access-solution" >}}).
- Data retention and prompt-logging policy.

The [Homelab AI Platform]({{< ref "/docs/projects/homelab-ai-platform" >}})
uses this architecture as a sample project narrative; it is not evidence that
the architecture has been deployed.
