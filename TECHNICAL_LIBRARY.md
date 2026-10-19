# Technical Library authoring guide

This repository publishes one Hugo site with two coordinated experiences:

- Blowfish continues to render the existing blog, including its routes, search,
  RSS feed, and presentation.
- Project-owned Hugo templates render every page below `content/docs/` with the
  Technical Library's Carbon interface, shared palette, and vanilla JavaScript.

Both are compiled to ordinary static HTML, CSS, and JavaScript and deployed by
the same GitHub Pages workflow. Technical documents are not copied from
pre-generated HTML and do not require a second application or backend.

## Architecture and directory responsibilities

```text
content/
|-- demystified/                  # Blowfish blog content
|-- penny-for-a-thought/          # Blowfish blog content
`-- docs/                         # Technical Library Markdown
    |-- _index.md                 # /docs/ data-driven catalog
    |-- guides/<slug>/index.md
    |-- runbooks/<slug>/index.md
    |-- architecture/<slug>/index.md
    |-- adrs/<slug>/index.md
    |-- projects/<slug>/index.md
    `-- reference/<slug>/index.md

layouts/docs/                     # Technical Library base and page templates
layouts/partials/docs/            # Shared Carbon-oriented components
layouts/docs/_markup/             # Markdown render hooks, including flow
assets/css/technical-library.css  # Library-only presentation
assets/js/technical-library.js    # Catalog and document interactions
assets/css/palette.css            # Shared charcoal and emerald tokens
archetypes/                       # New-document templates
```

Hugo derives the content type `docs` from the top-level `content/docs/`
directory. Do not set a front matter field named `type`; that would bypass the
Library's template lookup. Use `document_type` for classification. Supported
values are `Guide`, `Runbook`, `Architecture`, `ADR`, `Project`, and
`Reference`.

The `/docs/` catalog discovers published regular pages from Hugo's page
collection. A new document therefore needs no HTML index entry, JavaScript
registry, module mount, or generated descriptor file.

## Create and publish a document

Run one command from the repository root:

```powershell
hugo new content docs/guides/my-guide/index.md --kind guide
hugo new content docs/runbooks/my-runbook/index.md --kind runbook
hugo new content docs/architecture/my-architecture/index.md --kind architecture
hugo new content docs/adrs/adr-0002-my-decision/index.md --kind adr
hugo new content docs/projects/my-project/index.md --kind project
hugo new content docs/reference/my-reference/index.md --kind reference
```

These are Hugo leaf bundles. Keep `index.md`, images, downloadable examples,
and other page-specific resources together in the bundle directory.

Then:

1. Complete the front matter and write the document in Markdown.
2. Add `flow` fences where an interactive architecture view improves the
   explanation.
3. Preview with `hugo server -D` while `draft: true`.
4. Update `lastmod`, set `draft: false`, and run the production checks.
5. Commit the source bundle and push. Hugo creates the HTML during deployment.

Never edit files in `public/`; that directory is generated and ignored by Git.

Use heading levels two through four for sections that should appear in the
generated table of contents. Levels five and six remain available for local
structure but are intentionally omitted from that navigation. Standard
Markdown lists retain their markers, and Markdown tables are automatically
wrapped in a keyboard-focusable horizontal scroller on narrow screens.

## Common front matter

Every cataloged document should define:

| Field | Purpose |
|---|---|
| `title` | Page and catalog title |
| `description` | Concise catalog, search, and metadata summary |
| `date` | Initial creation or publication date |
| `lastmod` | Most recent meaningful content update |
| `draft` | `true` for local preview, `false` for publication |
| `document_type` | One of the six supported classifications |
| `topics` | Broad catalog subject areas |
| `technologies` | Products, standards, and platforms |
| `status` | Lifecycle label appropriate to the document |

Common optional fields are:

| Field | Purpose |
|---|---|
| `tags` | Additional lowercase search terms and taxonomy values |
| `version` | Document or described-system version |
| `github_url` | External source repository, when one exists |
| `related_docs` | Hugo content paths for related Library pages |
| `sample` | `true` only for explicitly hypothetical examples |
| `carbon` | Optional presentation metadata described below |

Example:

```yaml
---
title: "Operating the Example Platform"
description: "Procedures for safely operating the example Kubernetes platform."
date: 2026-10-18
lastmod: 2026-10-18
draft: true
document_type: "Runbook"
topics:
  - "Kubernetes and Containers"
technologies:
  - "Kubernetes"
  - "OpenTofu"
tags:
  - "operations"
status: "Draft"
version: "0.1"
related_docs:
  - "/docs/architecture/example-platform"
---
```

Use content paths, rather than production-domain URLs, for relationships. In
Markdown prose, use Hugo-aware references:

```markdown
[Example architecture]({{< ref "/docs/architecture/example-platform" >}})
```

This keeps links correct on both the custom domain and GitHub Pages project
sites published below a path prefix.

### Optional Carbon presentation metadata

Core classification, lifecycle, dates, relationships, topics, and technologies
remain top-level fields. Page-specific hero presentation belongs under the
namespaced `carbon` map:

```yaml
carbon:
  eyebrow: "Operations runbook"
  lead: "A concise statement of the outcome, audience, and operational scope."
  meta:
    - label: "Audience"
      value: "Platform engineers"
    - label: "Estimated time"
      value: "45 minutes"
  callout:
    kind: "warning"
    title: "Read this first"
    text: "Validate recovery access before changing the production control plane."
  button:
    label: "Start with prerequisites"
    href: "#prerequisites"
```

All keys are optional. Omit the entire map when the normal document header is
enough. `meta` is an ordered label/value array. Supported callout kinds are
`note`, `info`, `warning`, `error`, and `success`; its title and text must still
make the meaning clear without relying on color.

`carbon.button.href` supports:

- `#section-id` for a same-page heading anchor;
- `/docs/...` for an internal site-root path, which the template passes through
  Hugo's URL handling so project subpaths remain safe; or
- an absolute `https://...` URL for an external destination.

The site brand, site navigation, and footer are global template concerns. Do
not duplicate them in a document's `carbon` map.

### Topics, technologies, and tags

Use `topics` for stable subject areas. The initial vocabulary is:

- Cloud Architecture
- DevOps and Infrastructure
- Kubernetes and Containers
- Identity and Security
- Artificial Intelligence and Machine Learning
- Networking
- Infrastructure as Code
- Homelab Engineering

Use `technologies` for specific items such as `Kubernetes`, `Terraform`,
`SPIFFE`, or `OpenTelemetry`. Preserve product capitalization and reuse an
existing spelling so filters do not show duplicates. Use `tags` for additional
lowercase search terms; technologies and topics are already searchable.

## Document-specific guidance

### Guide

Define an outcome, assumptions, prerequisites, ordered implementation,
validation, rollback, and troubleshooting. Clearly distinguish verified
instructions from illustrative configuration.

### Runbook

Runbooks are first-class Technical Library documents, not a subtype of Guide.
Write for an operator performing a procedure under time pressure: state scope,
safety checks, prerequisites, ordered steps, verification, rollback, failure
handling, and escalation conditions. Use interactive flows to explain system
boundaries or execution paths, not as a substitute for the written procedure.

### Architecture

State context, goals, non-goals, constraints, boundaries, component
responsibilities, important flows, quality attributes, and unresolved
decisions. Explain every diagram in prose.

### ADR

ADRs use a MADR-inspired structure. Define these fields in addition to the
common metadata:

```yaml
layout: "adr"
adr_id: "ADR-0002"
decision_date: 2026-10-18
category: "Identity and Security"
status: "Proposed"
supersedes: []
superseded_by: []
```

Supported decision statuses are `Proposed`, `Accepted`, `Deprecated`, and
`Superseded`. Keep sections for context, decision drivers, considered options,
decision outcome, consequences, confirmation, related decisions, and
references. An ADR receives the same Carbon document shell and can include
interactive flow diagrams when the decision is easier to understand visually.

Assign the next unused zero-padded identifier. Do not renumber old decisions.
To supersede an ADR:

1. Create a new ADR explaining the changed context and decision.
2. Add the old ADR's content path to the new record's `supersedes` list.
3. Set the old ADR's status to `Superseded`.
4. Add the new ADR's path to the old record's `superseded_by` list.
5. Update both `lastmod` values and link the records in their bodies.

Do not rewrite an accepted ADR to make its historical decision appear
different. Add a clarification or supersede it.

### Project

Project pages use `layout: "project"`. Describe the problem, objectives,
architecture, technology choices, implementation, important decisions,
challenges, and lessons learned. Link `github_url` only when a repository
exists, and distinguish measured outcomes from plans or assumptions.

### Reference

Optimize reference pages for lookup: define scope, keep examples concise,
document edge cases, and link authoritative sources.

## Interactive flow diagrams

A fenced `flow` block contains JSON that Hugo's Technical Library render hook
converts to semantic diagram HTML and SVG. Shared vanilla JavaScript adds pan,
zoom, fit, pause, focus tracing, and live node descriptions.

````markdown
```flow
{
  "title": "Request path",
  "desc": "A client request passes through a gateway to a service and its data store.",
  "nodes": [
    {"id": "client", "x": 20, "y": 210, "title": "Client", "desc": "Starts the request."},
    {"id": "gateway", "x": 290, "y": 210, "title": "Gateway", "tone": "green", "desc": "Applies access policy."},
    {"id": "service", "x": 560, "y": 210, "title": "Service", "desc": "Handles the request."}
  ],
  "edges": [
    {"from": "client", "to": "gateway", "label": "HTTPS"},
    {"from": "gateway", "to": "service"}
  ]
}
```
````

Invalid JSON or missing required diagram fields fails the Hugo build. Give the
diagram and every node a meaningful `desc`; the visual must not be the only way
to understand the architecture. See
`example-pages/carbon-doc-page/reference/flow-spec.md` for the complete schema
and layout guidance.

The project-local `example-pages/carbon-doc-page/SKILL.md` can scaffold a Hugo
bundle, normalize metadata, and author these fences. The skill uses the live
Hugo templates and assets as its implementation source of truth; it does not
maintain a second HTML generator. Generated document HTML must not be placed
under `static/docs/`.

## Images and focused demonstrations

Place page-specific images beside `index.md`. Use meaningful names and alt
text, and explain diagrams in surrounding prose so meaning does not depend on
vision or color alone.

An unusually interactive demonstration may still use page-bundle resources or
a deliberately isolated static application, but it must not collide with a
Hugo content route. Normal documents—including runbooks and ADRs—remain
Markdown bundles rendered through Hugo.

## Customize the Technical Library

- Edit `assets/css/palette.css` for shared foundation colors.
- Edit `assets/css/technical-library.css` for Library semantic tokens and
  document presentation.
- Edit `assets/js/technical-library.js` for catalog and document interactions.
- Edit `layouts/docs/` and `layouts/partials/docs/` for semantic structure.
- Edit `layouts/docs/_markup/` for Markdown rendering behavior.

Keep CSS below the Library namespace and JavaScript attached to its `data-*`
hooks so blog pages remain unaffected. The approved palette uses `#161616`,
`#1c1c1c`, `#222222`, `#2e2e2e`, `#2b825b`, `#40bf86`, `#7e7e7e`, and
`#ededed`. Add supporting colors only through semantic properties and verify
contrast in both modes.

## Build, preview, and validate

The repository targets Hugo Extended 0.161.1 and Blowfish v2.103.0. Do not
upgrade either during routine content work.

Install dependencies and preview drafts:

```powershell
npm ci --ignore-scripts
npm test
hugo server -D
```

For a production-equivalent local build:

```powershell
npm test
hugo --gc --cleanDestinationDir
npm run validate:technical-library
```

`npm test` compiles Carbon assets and runs source-level JavaScript, palette,
catalog, and runbook tests. Hugo renders all blog and Technical Library pages.
The final validator discovers the generated documentation routes, verifies
catalog inclusion and shared Carbon assets, follows internal links, checks ADR
structure, and exercises the interactive runbook markup contract.

To exercise GitHub Pages project-path behavior explicitly:

```powershell
hugo --gc --cleanDestinationDir --baseURL "https://example.invalid/practical-architecture/" --destination public-subpath
node scripts/validate-technical-library.mjs public-subpath --prefix /practical-architecture
```

Before publishing, also inspect the changed page at desktop and narrow widths,
use its controls with a keyboard, and check both color schemes. Automated
checks complement rather than replace visual browser review.

## GitHub Pages deployment

`.github/workflows/deploy.yml` is the only deployment workflow. A push to
`main` installs the pinned Node dependencies, builds and tests the Carbon
assets, runs Hugo Extended 0.161.1, validates `public/`, uploads that directory,
and deploys it to GitHub Pages.

Hugo's configured `baseURL` and URL-aware template functions control deployed
paths. Content authors should not add another Pages workflow, commit generated
HTML, or hardcode the production domain in internal links.

## Add a collection or classification later

To add an organizational collection such as standards:

1. Add `content/docs/standards/_index.md` with a title and description.
2. Add leaf bundles below it using an existing `document_type`.
3. Preview its section page, breadcrumbs, catalog cards, and links.

A genuinely new document classification also needs an archetype and catalog
filter label, plus a decision about whether it needs specialized metadata.
The catalog itself remains data-driven; adding documents never requires
hand-maintaining an HTML list.
