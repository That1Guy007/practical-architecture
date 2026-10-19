const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const palette = read("assets/css/palette.css");
const carbon = read("assets/scss/carbon.scss");
const library = read("assets/css/technical-library.css");
const docsBase = read("layouts/docs/baseof.html");
const blogHead = read("layouts/partials/head.html");
const technicalDocument = read("assets/js/technical-document.js");
const favicon = read("assets/img/favicon.svg");
const brandMark = read("assets/img/practical-architecture-mark.svg");
const faviconIco = fs.readFileSync(path.join(root, "assets/img/favicon.ico"));

function propertyValue(css, property) {
  const match = css.match(new RegExp(`${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `Expected ${property} to have a literal hex foundation value`);
  return match[1];
}

function luminance(hex) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("shared foundation exposes the approved palette", () => {
  const expected = {
    "--pa-charcoal-100": "#161616",
    "--pa-charcoal-90": "#1c1c1c",
    "--pa-charcoal-80": "#222222",
    "--pa-charcoal-70": "#2e2e2e",
    "--pa-emerald-60": "#2b825b",
    "--pa-emerald-50": "#40bf86",
    "--pa-gray-50": "#7e7e7e",
    "--pa-gray-10": "#ededed",
  };

  for (const [property, value] of Object.entries(expected)) {
    assert.equal(propertyValue(palette, property).toLowerCase(), value);
  }
});

test("core text and interaction combinations meet WCAG AA", () => {
  const colors = {
    dark: propertyValue(palette, "--pa-charcoal-100"),
    surface: propertyValue(palette, "--pa-charcoal-80"),
    text: propertyValue(palette, "--pa-gray-10"),
    accent: propertyValue(palette, "--pa-emerald-50"),
    button: propertyValue(palette, "--pa-emerald-60"),
    secondary: propertyValue(palette, "--pa-gray-40"),
    light: propertyValue(palette, "--pa-gray-10"),
    lightLink: propertyValue(palette, "--pa-emerald-70"),
    white: propertyValue(palette, "--pa-white"),
  };

  assert.ok(contrast(colors.text, colors.dark) >= 4.5, "dark-theme body text must meet AA");
  assert.ok(contrast(colors.accent, colors.dark) >= 4.5, "dark-theme links must meet AA");
  assert.ok(contrast(colors.secondary, colors.surface) >= 4.5, "dark-theme secondary text must meet AA");
  assert.ok(contrast(colors.lightLink, colors.light) >= 4.5, "light-theme links must meet AA");
  assert.ok(contrast(colors.white, colors.button) >= 4.5, "dark green buttons need white text");
});

test("blog and Technical Library consume semantic shared tokens", () => {
  assert.match(carbon, /--cds-background:\s*var\(--pa-charcoal-100\)/);
  assert.match(carbon, /--cds-link-primary:\s*var\(--pa-emerald-50\)/);
  assert.match(library, /--tl-bg:\s*var\(--pa-charcoal-100,/);
  assert.match(library, /--tl-on-accent:/);
  assert.match(library, /--tl-diagram-selected:/);
  assert.match(docsBase, /theme-color" content="#161616"/);
  assert.match(docsBase, /theme-color" content="#ededed"/);
});

test("brand vectors use the charcoal and emerald palette", () => {
  assert.match(favicon, /fill="#2b825b"/i);
  assert.match(brandMark, /fill="#40bf86"/i);
  assert.doesNotMatch(`${favicon}\n${brandMark}`, /#(?:0f62fe|4589ff)/i);
});

test("favicon branding is exact and shared by both site surfaces", () => {
  assert.equal(faviconIco.readUInt16LE(2), 1, "asset must be a Windows ICO");
  const bitmapOffset = faviconIco.readUInt32LE(18);
  assert.equal(faviconIco.readUInt16LE(bitmapOffset + 14), 32, "ICO must retain 32-bit color");
  assert.notEqual(
    faviconIco.indexOf(Buffer.from([0x5b, 0x82, 0x2b, 0xff])),
    -1,
    "ICO must contain exact #2b825b BGRA pixels",
  );
  assert.match(blogHead, /partial "favicon\.html"/);
  assert.match(docsBase, /partial "favicon\.html"/);
});

test("retired blue UI palette is absent from the Technical Library", () => {
  for (const retired of ["#080d16", "#101827", "#075fbd", "#78bfff", "#a9d6ff", "#15375a"] ) {
    assert.equal(library.toLowerCase().includes(retired), false, `Found retired color ${retired}`);
  }
});

test("Hugo-rendered flow diagrams consume shared semantic tokens", () => {
  assert.match(library, /--tl-flow-node-brand-fill:/);
  assert.match(library, /--tl-flow-grid-dot:/);
  assert.match(library, /\.tl-flow__node-box/);
  assert.match(library, /\.tl-flow__label\s*{[^}]*fill:\s*var\(--tl-heading\)/s);
  assert.match(technicalDocument, /data-tl-flow/);
  assert.match(technicalDocument, /prefers-reduced-motion/);
  assert.doesNotMatch(technicalDocument, /#(?:0f62fe|4589ff)/i);
});
