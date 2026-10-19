---
name: carbon-doc-page
description: Use when creating or updating a Technical Library guide, runbook, architecture document, ADR, project, or reference page in this Hugo site, especially when it needs the shared Carbon document shell or an interactive flow diagram. The skill authors Hugo Markdown leaf bundles under content/docs; it does not generate production standalone HTML.
---

# Carbon Technical Library document

Create and maintain Technical Library source as Hugo leaf bundles. Hugo combines
Markdown with the project-owned Carbon layouts, shared charcoal and emerald
palette, and vanilla JavaScript, then publishes ordinary static HTML through the
existing GitHub Pages workflow.

Resolve references relative to this skill directory. Before authoring a page,
read the repository's `TECHNICAL_LIBRARY.md` and this skill's
`reference/flow-spec.md`. Read `reference/design-system.md` as well when the
request changes presentation or interaction behavior.

## Production contract

Every technical document has one source of truth:

```text
content/docs/<collection>/<slug>/index.md
```

Supported collection and archetype pairs are:

| Collection | `document_type` | Archetype |
|---|---|---|
| `guides` | `Guide` | `guide` |
| `runbooks` | `Runbook` | `runbook` |
| `architecture` | `Architecture` | `architecture` |
| `adrs` | `ADR` | `adr` |
| `projects` | `Project` | `project` |
| `reference` | `Reference` | `reference` |

Do not create a parallel `.config.json`, generated `.html`, catalog descriptor,
`standalone_path`, static-file copy, or Hugo module mount. The catalog discovers
eligible Hugo pages from their front matter.

## Workflow

1. **Inspect the repository contract.** Confirm the Hugo root, read
   `TECHNICAL_LIBRARY.md`, inspect the applicable archetype, and check for an
   existing bundle at the requested route. Preserve unrelated work.
2. **Choose the durable route.** Use a lowercase hyphenated slug beneath the
   appropriate `content/docs/<collection>/` directory. For ADRs, include the
   zero-padded identifier in the slug.
3. **Scaffold a new leaf bundle.** Run the applicable command from the Hugo
   repository root:

   ```powershell
   hugo new content docs/runbooks/example-runbook/index.md --kind runbook
   ```

   Use the matching kind from the table for other document types. When updating
   an existing document, edit its `index.md` in place.
4. **Complete top-level metadata.** Set title, description, date, lastmod,
   draft, document_type, topics, technologies, and status. Add version,
   github_url, related_docs, tags, or type-specific fields only when useful.
   Do not set Hugo's `type` field.
5. **Add optional presentation metadata.** Keep it under `carbon:`; do not move
   common metadata into this map:

   ```yaml
   carbon:
     eyebrow: "Operations runbook"
     lead: "What the reader will accomplish and under what conditions."
     meta:
       - label: "Audience"
         value: "Platform engineers"
     callout:
       kind: "warning"
       title: "Read this first"
       text: "Confirm recovery access before beginning."
     button:
       label: "Start with prerequisites"
       href: "#prerequisites"
   ```

   Supported callout kinds are `note`, `info`, `warning`, `error`, and
   `success`. A button href may be a same-page `#anchor`, a site-root
   `/docs/...` path, or an absolute `https://...` URL. Brand, navigation, and
   footer settings remain global.
6. **Write semantic Markdown.** Use a useful heading hierarchy, standard lists,
   tables, block quotes, fenced code, and Hugo `ref` shortcodes for internal
   prose links. Do not use raw HTML to imitate the Carbon shell.
7. **Add a flow only when it clarifies the document.** Read
   `reference/flow-spec.md`, then place its JSON directly in a fenced `flow`
   block. Every diagram needs a meaningful `title` and `desc`; every node needs
   a unique id and meaningful `desc`. Never invent implementation results or
   production claims.
8. **Preview and validate.** Run:

   ```powershell
   npm test
   hugo --gc --cleanDestinationDir
   npm run validate:technical-library
   ```

   For authoring drafts, use `hugo server -D`. Inspect the page at desktop and
   narrow widths and exercise diagram controls with a keyboard when browser
   tooling is available.
9. **Report source changes and evidence.** Name the bundle path and public URL,
   summarize metadata and diagram assumptions, list the commands actually run,
   and state any browser behavior that was not tested.

## Markdown and interaction conventions

| Authoring construct | Hugo result |
|---|---|
| `##` and `###` headings | Linked headings and generated document navigation |
| Fenced `bash`, `yaml`, and similar blocks | Syntax-highlighted code with shared code controls |
| Markdown table | Responsive Carbon-styled table |
| Block quote or Carbon callout metadata | Accessible callout presentation |
| ```` ```flow ```` plus JSON | Interactive, accessible architecture figure |
| Page-bundle image | Hugo-managed technical illustration |

Interactive behavior is progressive enhancement. The page must retain useful
text, headings, code, and diagram descriptions when JavaScript is unavailable.
Do not force a diagram into an ADR or reference page when prose is clearer.

## ADR rules

Use the MADR-inspired fields and sections documented in
`TECHNICAL_LIBRARY.md`. Keep identifiers durable, link superseding decisions in
both directions, and never rewrite an accepted decision to conceal its
historical context.

## Safety and consistency rules

- Do not edit the Blowfish theme source.
- Do not edit `public/` or commit generated production HTML.
- Do not publish a document from `static/docs/`.
- Do not hand-maintain catalog cards or JavaScript document arrays.
- Do not add colors, type scales, or spacing outside the shared semantic tokens.
- Do not remove skip links, focus rings, live regions, SVG descriptions,
  keyboard controls, or reduced-motion behavior.
- Use Hugo-aware internal URLs so custom-domain and project-subpath builds both
  work.

## Skill resources

`examples/architecture.flow.json` is a reusable flow-schema example. The live
Hugo layouts, scoped styles, and interaction code are the implementation source
of truth; this skill intentionally carries no separate HTML generator or CSS
copy that could drift from the site.
