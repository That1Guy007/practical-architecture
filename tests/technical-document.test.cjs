"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  clamp,
  connectedEdgeIds,
  createViewport,
  initializeFlow,
  panViewport,
  zoomViewport,
} = require("../assets/js/technical-document.js");

const root = path.resolve(__dirname, "..");
const siteStyles = fs.readFileSync(path.join(root, "assets/scss/site.scss"), "utf8");
const blogFlowStyles = fs.readFileSync(path.join(root, "assets/css/blog-flow.css"), "utf8");

test("clamp constrains numeric and numeric-string values", () => {
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp("4", 0, 10), 4);
  assert.equal(clamp(20, 0, 10), 10);
});

test("createViewport uses valid dimensions and safe defaults", () => {
  assert.deepEqual(createViewport(800, 400), { x: 0, y: 0, w: 800, h: 400 });
  assert.deepEqual(createViewport(0, "bad"), { x: 0, y: 0, w: 1040, h: 500 });
});

test("zoomViewport zooms around the center while preserving aspect ratio", () => {
  const full = createViewport(1040, 500);
  assert.deepEqual(zoomViewport(full, 2, undefined, undefined, full), {
    x: 260,
    y: 125,
    w: 520,
    h: 250,
  });

  const minimum = zoomViewport(full, 100, 0, 0, full);
  assert.equal(minimum.w, 260);
  assert.equal(minimum.h, 125);

  const maximum = zoomViewport(full, 0.01, 0, 0, full);
  assert.equal(maximum.w, 2080);
  assert.equal(maximum.h, 1000);
});

test("panViewport converts rendered pixels into logical canvas movement", () => {
  const viewport = { x: 20, y: 10, w: 1040, h: 500 };
  assert.deepEqual(panViewport(viewport, 104, -50, 1040, 500), {
    x: -84,
    y: 60,
    w: 1040,
    h: 500,
  });
  assert.deepEqual(viewport, { x: 20, y: 10, w: 1040, h: 500 });
});

test("connectedEdgeIds normalizes the space-delimited data attribute", () => {
  assert.deepEqual(connectedEdgeIds(" edge-1   edge-2\nedge-3 "), [
    "edge-1",
    "edge-2",
    "edge-3",
  ]);
  assert.deepEqual(connectedEdgeIds(), []);
});

test("initializeFlow enables controls when the optional detail region is absent", () => {
  const addedClasses = [];
  const attributes = new Map();
  const svg = {
    dataset: { width: "900", height: "260" },
    addEventListener() {},
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
  const viewport = { classList: { add() {}, remove() {} } };
  const pauseButton = {
    getAttribute() {
      return "false";
    },
    setAttribute() {},
  };
  const controls = { addEventListener() {} };
  const figure = {
    classList: {
      add(value) {
        addedClasses.push(value);
      },
      remove() {},
      toggle() {},
    },
    querySelector(selector) {
      if (selector === "[data-tl-flow-svg]") return svg;
      if (selector === "[data-tl-flow-viewport]") return viewport;
      if (selector === '[data-tl-flow-action="pause"]') return pauseButton;
      if (selector === ".tl-flow__controls") return controls;
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  initializeFlow(figure);

  assert.deepEqual(addedClasses, ["is-enhanced"]);
  assert.equal(attributes.get("viewBox"), "0 0 900 260");
});

test("wide blog flows stay inside the article column when a table of contents is present", () => {
  assert.match(siteStyles, /--pa-readable-width:\s*44rem/);
  assert.match(
    siteStyles,
    /\.pa-article-content\s*{[^}]*inline-size:\s*100%[^}]*max-inline-size:\s*none/s,
  );
  assert.match(
    siteStyles,
    /\.pa-article-content\s*>\s*:not\(\.tl-flow\):not\(\.tl-flow-set\)\s*{[^}]*max-inline-size:\s*var\(--pa-readable-width\)/s,
  );

  const wideFlowRule = blogFlowStyles.match(/\.pa-body \.tl-flow--wide\s*{([^}]*)}/);
  assert.ok(wideFlowRule, "expected a wide blog flow rule");
  assert.match(wideFlowRule[1], /max-inline-size:\s*76rem/);
  assert.doesNotMatch(wideFlowRule[1], /100vw|translateX/);
});
