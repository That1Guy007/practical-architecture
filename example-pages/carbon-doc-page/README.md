# Carbon Technical Library authoring skill

This project-local skill creates and updates Markdown documents for Practical
Architecture's Hugo-rendered Technical Library. It supports guides, runbooks,
architecture documents, ADRs, projects, and references with one consistent
Carbon interface and optional interactive flow diagrams.

It no longer produces the production page as a standalone HTML file. Hugo owns
the route, catalog discovery, shared UI shell, and final static output:

```text
content/docs/<collection>/<slug>/index.md
                  |
                  v
        Hugo Markdown rendering
                  |
                  v
 Carbon layouts + palette + vanilla JavaScript
                  |
                  v
 public/docs/<collection>/<slug>/index.html
```

The generated `public/` tree is deployed by the repository's existing GitHub
Pages workflow and is not committed.

## Requirements

| Tool | Purpose |
|---|---|
| Hugo Extended 0.161.1 | Scaffolds, previews, and renders content bundles |
| Node.js 22+ | Builds Carbon Sass and runs source/validation tests |
| Git | Versions the Markdown and page-bundle resources |

Python is not required to author or publish a Technical Library document.

## Ask the skill

Point the coding agent at this folder or install the skill in its supported
project-skill location, then ask for a concrete source change. Examples:

> Create a Technical Library runbook named "Rotating Example Platform Keys"
> with an interactive request-flow diagram.

> Update ADR-0004 with the new considered option and show its trust flow using
> the Carbon document skill.

> Migrate this Markdown into a Hugo architecture bundle without changing its
> technical claims.

The skill reads `SKILL.md`, the repository's `TECHNICAL_LIBRARY.md`, and the
flow schema before it edits content.

## Create a document manually

Run the matching command from the repository root:

```powershell
hugo new content docs/guides/my-guide/index.md --kind guide
hugo new content docs/runbooks/my-runbook/index.md --kind runbook
hugo new content docs/architecture/my-architecture/index.md --kind architecture
hugo new content docs/adrs/adr-0002-my-decision/index.md --kind adr
hugo new content docs/projects/my-project/index.md --kind project
hugo new content docs/reference/my-reference/index.md --kind reference
```

Edit the resulting `index.md`. Common metadata stays at the top level:

```yaml
---
title: "Rotating Example Platform Keys"
description: "A safe, repeatable procedure for rotating platform signing keys."
date: 2026-10-18
lastmod: 2026-10-18
draft: true
document_type: "Runbook"
topics:
  - "Identity and Security"
technologies:
  - "Kubernetes"
status: "Draft"
version: "0.1"
---
```

The catalog reads this metadata automatically. There is no catalog descriptor,
HTML index edit, or JavaScript registration step.

### Optional presentation metadata

Use the namespaced `carbon` map only for presentation details:

```yaml
carbon:
  eyebrow: "Security operations"
  lead: "Rotate keys while preserving verification during the overlap window."
  meta:
    - label: "Audience"
      value: "Platform engineers"
    - label: "Change window"
      value: "30 minutes"
  callout:
    kind: "warning"
    title: "Preserve the old public key"
    text: "Keep both public keys available until every verifier has refreshed."
  button:
    label: "Review prerequisites"
    href: "#prerequisites"
```

Supported callout kinds are `note`, `info`, `warning`, `error`, and `success`.
Button links may be same-page anchors, internal `/docs/...` paths, or absolute
HTTPS URLs. The site brand, navigation, and footer remain global.

## Add an interactive flow

Put diagram JSON directly in the Markdown:

````markdown
```flow
{
  "title": "Key rotation flow",
  "desc": "An operator updates the signer before verifiers refresh the public key set.",
  "nodes": [
    {"id": "operator", "x": 20, "y": 210, "title": "Operator", "desc": "Starts the approved rotation."},
    {"id": "signer", "x": 310, "y": 210, "title": "Signer", "tone": "green", "desc": "Publishes the new key and signs with it."},
    {"id": "verifier", "x": 600, "y": 210, "title": "Verifier", "desc": "Refreshes the public key set."}
  ],
  "edges": [
    {"from": "operator", "to": "signer", "label": "rotate"},
    {"from": "signer", "to": "verifier", "label": "JWKS"}
  ]
}
```
````

Hugo validates the JSON and creates the accessible figure. Shared JavaScript
adds pan, zoom, fit, pause, connection tracing, keyboard-focusable nodes, and a
live detail region. Read `reference/flow-spec.md` before designing a real
diagram; every diagram and node should have a useful description.

## Preview and publish

Preview drafts:

```powershell
npm test
hugo server -D
```

Run the production-equivalent checks before committing:

```powershell
npm test
hugo --gc --cleanDestinationDir
npm run validate:technical-library
```

Set `draft: false`, commit the Markdown bundle and its resources, and push.
GitHub Actions performs the same Carbon build, Hugo build, and generated-site
validation before deployment.

## Update an existing document

Edit `content/docs/<collection>/<slug>/index.md`, update `lastmod`, preview, and
run the checks above. Shared layout, CSS, or JavaScript improvements take effect
across every technical document on the next Hugo build; individual HTML files
do not need regeneration.

## Reference files

| File | Purpose |
|---|---|
| `SKILL.md` | Agent workflow and project invariants |
| `reference/flow-spec.md` | Flow JSON schema and diagram layout rules |
| `reference/design-system.md` | Shared Carbon, palette, and accessibility contract |
| `examples/architecture.flow.json` | Reusable flow example valid in a Hugo `flow` fence |
