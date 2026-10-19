#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const EXISTING_ROUTES = [
  "/",
  "/demystified/",
  "/demystified/pqc-explained-p1/",
  "/penny-for-a-thought/",
  "/posts/",
  "/series/",
];

const TECHNICAL_ASSET_PATTERN = /technical-(?:library|document)[^/?#]*(?:\.css|\.js)(?:[?#][^"']*)?$/i;
const REQUIRED_ADR_SECTIONS = [
  "Context",
  "Decision Drivers",
  "Considered Options",
  "Decision Outcome",
  "Consequences",
  "References",
];
const REQUIRED_FLOW_ACTIONS = ["pause", "zoom-in", "zoom-out", "fit"];

function usage() {
  return [
    "Usage: node scripts/validate-technical-library.mjs [output-directory] [--prefix /project]",
    "",
    "Discovers and validates Hugo's generated Technical Library. The output directory defaults to public.",
    "Use --prefix when the site was built beneath a GitHub Pages project path.",
  ].join("\n");
}

function parseArguments(argumentsList) {
  let outputDirectory = "public";
  let prefix = "";
  let outputWasSet = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    }

    if (argument === "--prefix") {
      index += 1;
      if (index >= argumentsList.length) {
        throw new Error("--prefix requires a value");
      }
      prefix = argumentsList[index];
      continue;
    }

    if (argument.startsWith("--prefix=")) {
      prefix = argument.slice("--prefix=".length);
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }

    if (outputWasSet) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }

    outputDirectory = argument;
    outputWasSet = true;
  }

  return {
    outputDirectory: path.resolve(outputDirectory),
    prefix: normalizePrefix(prefix),
  };
}

function normalizePrefix(value) {
  const segments = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  return segments.length ? `/${segments.join("/")}` : "";
}

function routeToFile(outputDirectory, route) {
  const relativeRoute = route.replace(/^\/+|\/+$/g, "");
  return relativeRoute
    ? path.join(outputDirectory, relativeRoute, "index.html")
    : path.join(outputDirectory, "index.html");
}

function readRoute(outputDirectory, route, failures) {
  const filePath = routeToFile(outputDirectory, route);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing generated route ${route} (${filePath})`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function plainText(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function extractAttributes(html, tagName, attributeName) {
  const values = [];
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  for (const match of html.matchAll(tagPattern)) {
    const value = attributeValue(match[0], attributeName);
    if (value !== null) {
      values.push(value);
    }
  }
  return values;
}

function attributeValue(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match ? decodeHtml(match[1] ?? match[2] ?? "") : null;
}

function hasAttribute(html, attributeName) {
  return new RegExp(`\\b${attributeName}(?:\\s*=|[\\s>])`, "i").test(html);
}

function tagsWithAttribute(html, attributeName) {
  const pattern = new RegExp(
    `<([a-z][a-z\\d-]*)\\b[^>]*\\b${attributeName}(?:\\s*=|[\\s>])[^>]*>`,
    "gi",
  );
  return Array.from(html.matchAll(pattern), (match) => ({
    name: match[1].toLocaleLowerCase(),
    source: match[0],
  }));
}

function containsText(haystack, needle) {
  return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

function technicalAssets(html) {
  const styles = extractAttributes(html, "link", "href").filter((value) =>
    TECHNICAL_ASSET_PATTERN.test(value.split("#")[0]),
  );
  const scripts = extractAttributes(html, "script", "src").filter((value) =>
    TECHNICAL_ASSET_PATTERN.test(value.split("#")[0]),
  );
  return { styles, scripts };
}

function fileToRoute(outputDirectory, filePath) {
  const relativePath = path.relative(outputDirectory, filePath).split(path.sep).join("/");
  if (relativePath === "index.html") {
    return "/";
  }
  if (relativePath.endsWith("/index.html")) {
    return `/${relativePath.slice(0, -"index.html".length)}`;
  }
  return `/${relativePath}`;
}

function listHtmlFiles(directory) {
  const files = [];
  function visit(currentDirectory) {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(entryPath);
      }
    }
  }
  visit(directory);
  return files.sort();
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
}

function validatePrefixedLinks(html, route, prefix, failures) {
  if (!prefix) {
    return;
  }

  const urls = [
    ...extractAttributes(html, "a", "href"),
    ...extractAttributes(html, "link", "href"),
    ...extractAttributes(html, "script", "src"),
    ...extractAttributes(html, "img", "src"),
    ...extractAttributes(html, "form", "action"),
  ];

  for (const value of urls) {
    if (!value || value.startsWith("#") || isExternalUrl(value)) {
      continue;
    }
    if (value.startsWith("/") && value !== prefix && !value.startsWith(`${prefix}/`)) {
      failures.push(`${route} contains root-relative URL outside --prefix ${prefix}: ${value}`);
    }
  }
}

function outputTargetsForUrl(outputDirectory, pathname, prefix) {
  let sitePath = pathname;
  if (prefix) {
    if (sitePath === prefix) {
      sitePath = "/";
    } else if (sitePath.startsWith(`${prefix}/`)) {
      sitePath = sitePath.slice(prefix.length);
    } else {
      return [];
    }
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(sitePath);
  } catch (_error) {
    decodedPath = sitePath;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  if (!relativePath || decodedPath.endsWith("/")) {
    return [path.join(outputDirectory, relativePath, "index.html")];
  }

  return [
    path.join(outputDirectory, relativePath),
    path.join(outputDirectory, relativePath, "index.html"),
    path.join(outputDirectory, `${relativePath}.html`),
  ];
}

function routeForUrl(value, baseRoute, prefix) {
  let parsed;
  try {
    parsed = new URL(value, `https://validator.invalid${prefix}${baseRoute}`);
  } catch (_error) {
    return null;
  }
  if (parsed.hostname !== "validator.invalid") {
    return null;
  }

  let pathname = parsed.pathname;
  if (prefix) {
    if (pathname === prefix) {
      pathname = "/";
    } else if (pathname.startsWith(`${prefix}/`)) {
      pathname = pathname.slice(prefix.length);
    } else {
      return null;
    }
  }
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function validateInternalLinks(html, route, outputDirectory, prefix, failures) {
  const baseUrl = `https://validator.invalid${prefix}${route}`;
  for (const value of extractAttributes(html, "a", "href")) {
    if (!value || value.startsWith("#")) {
      continue;
    }

    let parsed;
    try {
      parsed = new URL(value, baseUrl);
    } catch (_error) {
      failures.push(`${route} contains an invalid link URL: ${value}`);
      continue;
    }

    if (parsed.hostname === "practical-architecture.com" && prefix) {
      failures.push(`${route} hardcodes the production domain in a link: ${value}`);
      continue;
    }
    if (parsed.hostname !== "validator.invalid") {
      continue;
    }

    const candidates = outputTargetsForUrl(outputDirectory, parsed.pathname, prefix);
    if (candidates.length && !candidates.some((candidate) => fs.existsSync(candidate))) {
      failures.push(`${route} links to a missing generated target: ${value}`);
    }
  }
}

function localAssetFile(value, route, outputDirectory, prefix) {
  let parsed;
  try {
    parsed = new URL(value, `https://validator.invalid${prefix}${route}`);
  } catch (_error) {
    return null;
  }
  if (parsed.hostname !== "validator.invalid") {
    return null;
  }
  return outputTargetsForUrl(outputDirectory, parsed.pathname, prefix).find((candidate) =>
    fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  ) ?? null;
}

function validateTechnicalAssetFiles(assets, route, outputDirectory, prefix, failures) {
  for (const value of [...assets.styles, ...assets.scripts]) {
    const assetFile = localAssetFile(value, route, outputDirectory, prefix);
    if (!assetFile) {
      failures.push(`${route} references a missing or non-local Technical Library asset: ${value}`);
    }
  }
}

function hasBodyClass(html, className) {
  const body = html.match(/<body\b[^>]*>/i)?.[0] ?? "";
  const classes = attributeValue(body, "class")?.split(/\s+/).filter(Boolean) ?? [];
  return classes.includes(className);
}

function isLegacyStandalonePage(html) {
  return (
    hasAttribute(html, "data-carbon-doc-page") ||
    /<meta\b[^>]*\bname\s*=\s*(?:"generator"|'generator')[^>]*carbon-doc-page/i.test(html)
  );
}

function validateCatalog(html, documentRoutes, runbookRoutes, prefix, failures) {
  const requiredAttributes = [
    "data-library-catalog",
    "data-library-filters",
    "data-filter-search",
    "data-filter-type",
    "data-filter-discovery",
    "data-filter-reset",
    "data-results-count",
  ];
  for (const attributeName of requiredAttributes) {
    if (!hasAttribute(html, attributeName)) {
      failures.push(`/docs/ catalog is missing ${attributeName}`);
    }
  }

  const expectedControlTags = [
    ["data-filter-search", "input"],
    ["data-filter-type", "select"],
    ["data-filter-discovery", "select"],
    ["data-filter-reset", "button"],
  ];
  for (const [attributeName, expectedTag] of expectedControlTags) {
    const controls = tagsWithAttribute(html, attributeName);
    if (controls.length && controls[0].name !== expectedTag) {
      failures.push(`/docs/ ${attributeName} must use a semantic <${expectedTag}> control`);
    }
  }

  const searchControl = tagsWithAttribute(html, "data-filter-search")[0];
  if (searchControl && attributeValue(searchControl.source, "type")?.toLowerCase() !== "search") {
    failures.push("/docs/ search control must use input type=search");
  }

  const statusElement = tagsWithAttribute(html, "data-results-count")[0];
  if (
    statusElement &&
    attributeValue(statusElement.source, "role") !== "status" &&
    attributeValue(statusElement.source, "aria-live") === null
  ) {
    failures.push("/docs/ result count must announce filter changes with role=status or aria-live");
  }

  const cards = tagsWithAttribute(html, "data-library-card");
  if (cards.length !== documentRoutes.length) {
    failures.push(
      `/docs/ catalog contains ${cards.length} cards for ${documentRoutes.length} rendered documents`,
    );
  }

  let runbookCards = 0;
  for (const [index, card] of cards.entries()) {
    for (const attributeName of ["data-type", "data-technologies", "data-topics"]) {
      if (attributeValue(card.source, attributeName) === null) {
        failures.push(`/docs/ catalog card ${index + 1} is missing ${attributeName}`);
      }
    }
    if (attributeValue(card.source, "data-type")?.toLowerCase() === "runbook") {
      runbookCards += 1;
    }
  }
  if (runbookCards !== runbookRoutes.length) {
    failures.push(
      `/docs/ catalog contains ${runbookCards} Runbook cards for ${runbookRoutes.length} rendered runbooks`,
    );
  }

  const catalogTargets = new Set(
    extractAttributes(html, "a", "href")
      .map((value) => routeForUrl(value, "/docs/", prefix))
      .filter(Boolean),
  );
  for (const route of documentRoutes) {
    if (!catalogTargets.has(route)) {
      failures.push(`/docs/ catalog does not link to rendered document ${route}`);
    }
  }
}

function validateAdrDocuments(routeHtml, failures) {
  const adrIndex = routeHtml.get("/docs/adrs/");
  const adrDocuments = [...routeHtml.entries()].filter(
    ([route, html]) => route.startsWith("/docs/adrs/") && route !== "/docs/adrs/" && hasAttribute(html, "data-technical-document"),
  );

  if (!adrIndex) {
    failures.push("Missing generated ADR index /docs/adrs/");
    return;
  }
  if (!adrDocuments.length) {
    failures.push("No rendered ADR documents were discovered beneath /docs/adrs/");
    return;
  }

  const indexText = plainText(adrIndex);
  if (!/\b(?:Proposed|Accepted|Deprecated|Superseded)\b/i.test(indexText)) {
    failures.push("/docs/adrs/ index does not expose an ADR status");
  }
  if (!/<time\b/i.test(adrIndex)) {
    failures.push("/docs/adrs/ index does not contain a semantic decision date (<time>)");
  }

  for (const [route, html] of adrDocuments) {
    const documentText = plainText(html);
    for (const section of REQUIRED_ADR_SECTIONS) {
      if (!containsText(documentText, section)) {
        failures.push(`${route} is missing the MADR section: ${section}`);
      }
    }
  }
}

function validateRunbook(route, html, assets, outputDirectory, prefix, failures) {
  const flowRoots = tagsWithAttribute(html, "data-tl-flow");
  if (!flowRoots.length) {
    failures.push(`${route} is missing an interactive [data-tl-flow] diagram`);
    return;
  }

  if (flowRoots.some((flow) => flow.name !== "figure")) {
    failures.push(`${route} flow diagrams must use semantic <figure> elements`);
  }
  if (!hasAttribute(html, "data-tl-flow-viewport") || !hasAttribute(html, "data-tl-flow-svg")) {
    failures.push(`${route} flow diagrams are missing their viewport or SVG hooks`);
  }

  const nodes = tagsWithAttribute(html, "data-tl-flow-node");
  const edges = tagsWithAttribute(html, "data-tl-flow-edge");
  if (!nodes.length || !edges.length) {
    failures.push(`${route} flow diagrams must render nodes and edges`);
  }
  for (const node of nodes) {
    for (const attributeName of ["data-node-id", "data-links", "data-detail"]) {
      if (attributeValue(node.source, attributeName) === null) {
        failures.push(`${route} flow node is missing ${attributeName}`);
      }
    }
  }

  const actionValues = new Set(
    tagsWithAttribute(html, "data-tl-flow-action").map((tag) =>
      attributeValue(tag.source, "data-tl-flow-action"),
    ),
  );
  for (const action of REQUIRED_FLOW_ACTIONS) {
    if (!actionValues.has(action)) {
      failures.push(`${route} flow controls are missing action: ${action}`);
    }
  }

  const liveDetails = tagsWithAttribute(html, "data-tl-flow-detail");
  if (!liveDetails.length || liveDetails.some((tag) => attributeValue(tag.source, "aria-live") === null)) {
    failures.push(`${route} needs an aria-live [data-tl-flow-detail] region`);
  }
  if (!/<title\b/i.test(html) || !/<desc\b/i.test(html)) {
    failures.push(`${route} flow SVG must contain a title and description`);
  }
  const flowTranscripts = tagsWithAttribute(html, "class").filter((tag) =>
    (attributeValue(tag.source, "class") || "").split(/\s+/).includes("tl-flow__fallback"),
  );
  if (flowTranscripts.length !== flowRoots.length || flowTranscripts.some((tag) => tag.name !== "details")) {
    failures.push(`${route} needs one expandable text transcript per flow diagram`);
  }

  const sharedAssetSource = [...assets.styles, ...assets.scripts]
    .map((value) => localAssetFile(value, route, outputDirectory, prefix))
    .filter(Boolean)
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
  if (!/prefers-reduced-motion/i.test(sharedAssetSource)) {
    failures.push(`${route} shared Technical Library assets do not honor reduced motion`);
  }
}

function validate() {
  const { outputDirectory, prefix } = parseArguments(process.argv.slice(2));
  const failures = [];

  if (!fs.existsSync(outputDirectory) || !fs.statSync(outputDirectory).isDirectory()) {
    throw new Error(`Built output directory does not exist: ${outputDirectory}`);
  }

  for (const route of EXISTING_ROUTES) {
    readRoute(outputDirectory, route, failures);
  }

  const docsDirectory = path.join(outputDirectory, "docs");
  if (!fs.existsSync(docsDirectory) || !fs.statSync(docsDirectory).isDirectory()) {
    failures.push(`Missing generated Technical Library directory: ${docsDirectory}`);
  }

  const allHtmlFiles = listHtmlFiles(outputDirectory);
  const routeHtml = new Map(
    allHtmlFiles.map((filePath) => [
      fileToRoute(outputDirectory, filePath),
      fs.readFileSync(filePath, "utf8"),
    ]),
  );
  const docsEntries = [...routeHtml.entries()].filter(
    ([route]) => route === "/docs/" || route.startsWith("/docs/"),
  );
  const documentRoutes = docsEntries
    .filter(([, html]) => hasAttribute(html, "data-technical-document"))
    .map(([route]) => route)
    .sort();
  const runbookRoutes = documentRoutes.filter((route) => route.startsWith("/docs/runbooks/"));

  if (!routeHtml.has("/docs/")) {
    failures.push("Missing generated Technical Library catalog /docs/");
  }
  if (!documentRoutes.length) {
    failures.push("No Hugo-rendered Technical Library documents were discovered");
  }
  if (runbookRoutes.length < 2) {
    failures.push(`Discovered ${runbookRoutes.length} runbooks; expected both migrated Vault runbooks`);
  }

  const catalogHtml = routeHtml.get("/docs/");
  if (catalogHtml) {
    validateCatalog(catalogHtml, documentRoutes, runbookRoutes, prefix, failures);
  }
  validateAdrDocuments(routeHtml, failures);

  for (const [route, html] of routeHtml) {
    const assets = technicalAssets(html);
    const isDocsPage = route === "/docs/" || route.startsWith("/docs/");

    validatePrefixedLinks(html, route, prefix, failures);
    validateInternalLinks(html, route, outputDirectory, prefix, failures);

    if (isDocsPage) {
      if (!hasBodyClass(html, "tl-site") || !hasAttribute(html, "data-technical-library")) {
        failures.push(`${route} is missing the shared Technical Library body marker`);
      }
      if (isLegacyStandalonePage(html)) {
        failures.push(`${route} is still a legacy standalone carbon-doc-page instead of a Hugo page`);
      }
      if (!/<main\b/i.test(html)) {
        failures.push(`${route} is missing a semantic <main> region`);
      }
      if (assets.styles.length === 0) {
        failures.push(`${route} does not load a technical-library CSS asset`);
      }
      if (assets.scripts.length === 0) {
        failures.push(`${route} does not load a technical-library JavaScript asset`);
      }
      const tables = (html.match(/<table\b/gi) || []).length;
      const tableScrollers = tagsWithAttribute(html, "class").filter((tag) =>
        (attributeValue(tag.source, "class") || "").split(/\s+/).includes("tl-table-scroll"),
      ).length;
      if (tableScrollers < tables) {
        failures.push(`${route} contains a table without a responsive tl-table-scroll wrapper`);
      }
      validateTechnicalAssetFiles(assets, route, outputDirectory, prefix, failures);

      if (runbookRoutes.includes(route)) {
        validateRunbook(route, html, assets, outputDirectory, prefix, failures);
      }
    } else if (assets.styles.length || assets.scripts.length) {
      failures.push(`${route} unexpectedly loads Technical Library CSS or JavaScript`);
    }
  }

  if (failures.length) {
    console.error(`Technical Library validation failed with ${failures.length} issue(s):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Technical Library validation passed for ${outputDirectory}` +
      (prefix ? ` with URL prefix ${prefix}` : ""),
  );
  console.log(
    `Discovered ${docsEntries.length} documentation routes, including ${documentRoutes.length} documents and ${runbookRoutes.length} runbooks; checked ${EXISTING_ROUTES.length} existing blog routes.`,
  );
}

try {
  validate();
} catch (error) {
  console.error(`Technical Library validation could not run: ${error.message}`);
  console.error(usage());
  process.exitCode = 1;
}
