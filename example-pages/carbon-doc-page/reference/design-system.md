# Technical Library design-system contract

The production Technical Library is rendered by Hugo and uses the project's
installed Carbon styles, shared palette, scoped Library CSS, and vanilla
JavaScript. The sources of truth are:

- `assets/scss/carbon.scss` for the Carbon foundation;
- `assets/css/palette.css` for shared Practical Architecture colors;
- `assets/css/technical-library.css` for Library presentation;
- `assets/js/technical-library.js` for catalog behavior;
- `assets/js/technical-document.js` for document navigation and flow behavior;
- `layouts/docs/` and `layouts/partials/docs/` for semantic markup.

The skill intentionally reuses these live project files instead of carrying a
second template, stylesheet, or script that could drift from production.

## Foundation palette and semantic tokens

The approved foundation colors are:

- charcoal: `#161616`, `#1c1c1c`, `#222222`, `#2e2e2e`;
- emerald: `#2b825b`, `#40bf86`; and
- neutral: `#7e7e7e`, `#ededed`.

Supporting status hues remain available for errors, warnings, success, and
distinct diagram paths. Components consume semantic `--tl-*` and `--cds-*`
properties rather than hard-coded foundation colors. Light and dark modes
remap those roles without changing Markdown or document markup.

Flow diagrams use the `--tl-flow-*` token family for grid, edges, node fills,
node strokes, and states. Do not encode palette values in diagram JSON or
JavaScript.

## Shared component contract

| Experience | Stable source or hook |
|---|---|
| Technical Library page | `body.tl-site[data-technical-library]` |
| Rendered document | `[data-technical-document]` |
| Breadcrumbs and document hero | `layouts/partials/docs/` |
| Responsive table of contents | `[data-tl-toc]` |
| Catalog filters and cards | `[data-library-*]`, `[data-filter-*]` |
| Interactive flow | `figure.tl-flow[data-tl-flow]` |
| Flow nodes and edges | `[data-tl-flow-node]`, `[data-tl-flow-edge]` |
| Flow controls | `[data-tl-flow-action]` |
| Flow live description | `[data-tl-flow-detail]` |

Content authors should use Markdown and front matter instead of writing these
classes or hooks by hand. Template and interaction changes must preserve the
stable hooks because validation and progressive enhancement depend on them.

## Author-facing presentation contract

Optional hero presentation belongs under a document's `carbon:` map:

- `eyebrow` and `lead`;
- ordered `meta` label/value items;
- `callout.kind`, `callout.title`, and `callout.text`; and
- `button.label` and `button.href`.

Common metadata stays top-level. Brand, navigation, and footer values remain
global. Supported callout kinds are `note`, `info`, `warning`, `error`, and
`success`; every callout must remain understandable without color.

## Accessibility requirements

Do not remove or weaken:

- the skip link and semantic landmark regions;
- visible focus indicators;
- keyboard-operable navigation and diagram controls;
- responsive scroll handling for wide tables and code;
- SVG titles and descriptions;
- keyboard-focusable diagram nodes and their textual details;
- the `aria-live` flow detail region;
- non-color-only status and path meaning; or
- reduced-motion behavior in both CSS and JavaScript.

Interactive behavior is progressive enhancement. Documents and diagram
fallback descriptions must remain useful when JavaScript does not run.

## Change and validation rules

- Keep Library selectors below its existing namespace; do not add global
  element rules that can alter Blowfish blog pages.
- Attach JavaScript to the Library's stable `data-*` hooks and tolerate pages
  where an optional component is absent.
- Reuse Carbon spacing, typography, grid, and semantic tokens before adding a
  project-specific value.
- Verify contrast and focus behavior in both color modes.
- Run `npm test`, `hugo --gc --cleanDestinationDir`, and `npm run validate:technical-library` after a
  shared design-system or interaction change.
