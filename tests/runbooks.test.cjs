"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const runbooksRoot = path.join(root, "content", "docs", "runbooks");
const expectedMigrations = new Set([
  "hashicorp-vault-enterprise-kubernetes-deployment-runbook",
  "hashicorp-vault-secrets-operator-jwt-runbook",
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(directory, predicate) {
  const matches = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...walk(entryPath, predicate));
    } else if (entry.isFile() && predicate(entryPath)) {
      matches.push(entryPath);
    }
  }

  return matches;
}

function splitDocument(markdown, filePath) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(match, `${filePath} must start with YAML front matter`);
  return { frontMatter: match[1], body: match[2] };
}

function flowBlocks(markdown) {
  return Array.from(
    markdown.matchAll(/^```flow[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm),
    (match) => match[1],
  );
}

function assertFrontMatterField(frontMatter, field, filePath) {
  assert.match(
    frontMatter,
    new RegExp(`^${field}:`, "m"),
    `${filePath} is missing front matter field ${field}`,
  );
}

test("runbooks use Hugo leaf bundles without standalone publication wiring", () => {
  const descriptorFiles = fs
    .readdirSync(runbooksRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_index.md")
    .map((entry) => entry.name);

  assert.deepEqual(
    descriptorFiles,
    [],
    "runbooks must be content/docs/runbooks/<slug>/index.md leaf bundles, not catalog descriptors",
  );

  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts["build:runbooks"], undefined);
  assert.doesNotMatch(packageJson.scripts.test, /build:runbooks/);

  const moduleConfig = read("config/_default/module.toml");
  assert.doesNotMatch(moduleConfig, /example-pages|docs\/runbooks|docs\\runbooks/i);

  for (const obsoletePath of [
    "scripts/build-runbooks.mjs",
    "example-pages/hashicorp-vault-enterprise-kubernetes-deployment-runbook.html",
    "example-pages/hashicorp-vault-secrets-operator-jwt-runbook.html",
    "example-pages/carbon-doc-page/scripts/build_page.py",
  ]) {
    assert.equal(
      fs.existsSync(path.join(root, obsoletePath)),
      false,
      `obsolete standalone artifact must be removed: ${obsoletePath}`,
    );
  }
});

const bundleFiles = walk(
  runbooksRoot,
  (filePath) => path.basename(filePath) === "index.md",
).sort();

test("both legacy Vault runbooks were migrated into discoverable Hugo bundles", () => {
  const slugs = new Set(bundleFiles.map((filePath) => path.basename(path.dirname(filePath))));
  for (const slug of expectedMigrations) {
    assert.ok(slugs.has(slug), `missing migrated runbook bundle: ${slug}`);
  }
});

test("shared document styles preserve Markdown structure and progressive enhancement", () => {
  const libraryCss = read("assets/css/technical-library.css");
  const tableHook = read("layouts/docs/_markup/render-table.html");

  assert.match(libraryCss, /\.tl-prose ul\s*{[^}]*list-style:\s*disc/s);
  assert.match(libraryCss, /\.tl-prose ol\s*{[^}]*list-style:\s*decimal/s);
  assert.match(libraryCss, /\.tl-document-sidebar\s*{[^}]*max-height:[^}]*overflow-y:\s*auto/s);
  assert.match(libraryCss, /\.tl-flow__controls\s*{[^}]*display:\s*none/s);
  assert.match(libraryCss, /\.tl-flow\.is-enhanced \.tl-flow__controls\s*{[^}]*display:\s*flex/s);
  assert.doesNotMatch(
    libraryCss,
    /\.tl-flow\.is-enhanced \.tl-flow__fallback\s*{[^}]*display:\s*none/s,
  );
  assert.match(tableHook, /class="tl-table-scroll"/);
  assert.match(tableHook, /<table/);
});

for (const filePath of bundleFiles) {
  const relativePath = path.relative(root, filePath).split(path.sep).join("/");
  const slug = path.basename(path.dirname(filePath));

  test(`${slug} follows the unified Hugo and interactive-flow contract`, () => {
    const markdown = fs.readFileSync(filePath, "utf8");
    const { frontMatter, body } = splitDocument(markdown, relativePath);

    for (const field of [
      "title",
      "description",
      "date",
      "lastmod",
      "draft",
      "document_type",
      "topics",
      "technologies",
      "status",
    ]) {
      assertFrontMatterField(frontMatter, field, relativePath);
    }

    assert.match(frontMatter, /^document_type:\s*["']?Runbook["']?\s*$/m);
    assert.doesNotMatch(frontMatter, /^standalone_path:/m);
    assert.doesNotMatch(frontMatter, /^_build:/m);
    assert.match(body, /^#{1,4}\s+\S/m, `${relativePath} must contain document headings`);

    const diagrams = flowBlocks(body);
    assert.ok(diagrams.length > 0, `${relativePath} must contain at least one flow diagram`);

    for (const [index, source] of diagrams.entries()) {
      let diagram;
      assert.doesNotThrow(() => {
        diagram = JSON.parse(source);
      }, `${relativePath} flow diagram ${index + 1} must contain valid JSON`);

      assert.equal(typeof diagram.title, "string");
      assert.ok(diagram.title.trim(), `${relativePath} flow diagram ${index + 1} needs a title`);
      assert.equal(typeof diagram.desc, "string");
      assert.ok(diagram.desc.trim(), `${relativePath} flow diagram ${index + 1} needs a description`);
      assert.ok(Array.isArray(diagram.nodes) && diagram.nodes.length > 0);
      assert.ok(Array.isArray(diagram.edges) && diagram.edges.length > 0);

      const nodeIds = new Set();
      for (const node of diagram.nodes) {
        assert.equal(typeof node.id, "string");
        assert.ok(node.id.trim(), "flow node id must not be empty");
        assert.equal(nodeIds.has(node.id), false, `duplicate flow node id: ${node.id}`);
        nodeIds.add(node.id);
        assert.equal(typeof node.title, "string");
        assert.ok(node.title.trim(), `flow node ${node.id} title must not be empty`);
        assert.equal(typeof node.desc, "string", `flow node ${node.id} needs an accessible desc`);
        assert.ok(node.desc.trim(), `flow node ${node.id} accessible desc must not be empty`);
        assert.equal(Number.isFinite(node.x), true, `flow node ${node.id} needs a numeric x`);
        assert.equal(Number.isFinite(node.y), true, `flow node ${node.id} needs a numeric y`);
      }

      for (const edge of diagram.edges) {
        assert.ok(nodeIds.has(edge.from), `flow edge references unknown source node: ${edge.from}`);
        assert.ok(nodeIds.has(edge.to), `flow edge references unknown target node: ${edge.to}`);
      }
    }
  });
}
