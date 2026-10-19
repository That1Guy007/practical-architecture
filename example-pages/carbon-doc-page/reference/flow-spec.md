# Interactive flow diagram specification

A fenced `flow` block in a Technical Library Markdown bundle contains one JSON
object. Hugo validates the object during the build and renders an accessible
figure. Shared `technical-document.js` progressively adds moving direction
dots, connection tracing, pan, zoom, fit, pause, keyboard-focusable nodes, and
a live node-description region.

````markdown
```flow
{
  "title": "Request path",
  "desc": "A request passes from the client through the gateway to the service.",
  "nodes": [],
  "edges": []
}
```
````

Invalid JSON, missing required fields, duplicate node ids, or edges that refer
to unknown nodes fail the Hugo build. A complete data example is available at
`examples/architecture.flow.json`; copy the JSON into a Markdown fence rather
than linking to the file at runtime.

## Top-level object

| Key | Required | Notes |
|---|---|---|
| `title` | yes | Short SVG title and visible diagram identity |
| `desc` | yes | One or two sentences describing the whole diagram for screen readers |
| `nodes` | yes | Non-empty node array |
| `edges` | yes | Edge array; include the meaningful relationships in the prose too |
| `caption` | no | Visible figure caption; start with `Figure N.` when documents number figures |
| `width`, `height` | no | Logical canvas size; defaults to 1040 by 500 |
| `legend` | no | Map of edge `kind` values to visible legend labels |

## Node

| Key | Required | Notes |
|---|---|---|
| `id` | yes | Unique, stable id within this diagram |
| `x`, `y` | yes | Top-left location in logical canvas units |
| `title` | yes | Concise visible name, ideally under about 22 characters |
| `w`, `h` | no | Dimensions; default 180 by 80 |
| `sub` | no | Secondary visible line, ideally under about 28 characters |
| `tone` | no | `white`, `gray`, `blue`, `green`, `teal`, `purple`, `red`, or `yellow` |
| `mono` | no | `true` renders the title with the shared monospace face |
| `desc` | yes | Meaningful sentence announced and shown when the node receives focus or hover |

Tone is supplemental. Node titles, descriptions, placement, and connection
tracing must communicate the same meaning without color.

## Edge

| Key | Required | Notes |
|---|---|---|
| `from`, `to` | yes | Existing node ids; direction matches animated dot travel |
| `kind` | no | `client` (default), `raft`, or `store`; controls semantic line treatment and legend entry |
| `label` | no | Short monospace relationship or protocol label |
| `dots` | no | Direction dots per edge; default 3, or 2 for vertical edges |
| `dur` | no | Seconds per traversal; default 2.6, or 3.2 for `store` |
| `bidirectional` | no | `true` adds movement in both directions |
| `path` | no | Explicit SVG path `d` value when automatic routing is unsuitable |
| `label_at` | no | `[x, y]` label position, normally paired with an explicit `path` |

Line pattern, labels, direction, and the legend supplement color so edge meaning
does not rely on hue alone.

## Layout guidance

- Prefer a left-to-right primary flow.
- Align nodes to a 10-unit grid and leave at least 60 units between columns for
  relationship labels.
- Keep fan-outs to four or fewer visible targets; group or split a concept when
  it becomes harder to scan.
- Use no more than three edge kinds in one figure.
- Use `green` for active or healthy components, `gray` for passive components,
  `teal` for storage, `purple` for cluster internals, and `red` only for risk.
- Use multiple focused figures instead of one dense diagram.
- Explain the important flow and operational implications in surrounding
  Markdown. The figure enhances the document; it is not the sole explanation.

Automatic routing produces horizontal curves and straight vertical paths.
Supply `path` and `label_at` only for relationships that would otherwise cross
or obscure important content.

## Accessibility and interaction contract

The Hugo renderer and shared client script provide:

- an SVG title and description;
- keyboard-focusable nodes with textual details;
- an `aria-live` detail region;
- pause, zoom in, zoom out, and fit controls;
- pointer pan and modifier-key wheel zoom; and
- reduced-motion behavior.

Authors are responsible for accurate diagram and node descriptions, readable
labels, non-color-only meaning, and equivalent explanatory prose. Do not add raw
HTML or page-specific JavaScript to reproduce these controls.
