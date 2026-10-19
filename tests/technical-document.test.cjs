"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  clamp,
  connectedEdgeIds,
  createViewport,
  panViewport,
  zoomViewport,
} = require("../assets/js/technical-document.js");

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
