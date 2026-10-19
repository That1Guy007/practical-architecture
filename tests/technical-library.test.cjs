"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  matchesDocument,
  normalizeText,
} = require("../assets/js/technical-library.js");

const documentRecord = {
  searchable:
    "Deploying a Workload Identity Architecture with SPIFFE/SPIRE. " +
    "A representative guide for Kubernetes identity and zero trust.",
  type: "Guide",
  technologies: ["SPIFFE", "SPIRE", "Kubernetes"],
  topics: ["Identity and Security", "Kubernetes and Containers"],
};

test("normalizeText creates a stable, searchable value", () => {
  assert.equal(normalizeText(null), "");
  assert.equal(normalizeText("  Caf\u00e9\n  Architecture  "), "cafe architecture");
  assert.equal(normalizeText("\uff21\uff24\uff32-0001"), "adr-0001");
});

test("matchesDocument leaves empty filters unconstrained", () => {
  assert.equal(matchesDocument(documentRecord, {}), true);
  assert.equal(
    matchesDocument(documentRecord, { query: "", type: "", discovery: "" }),
    true,
  );
});

test("matchesDocument searches the normalized searchable text", () => {
  assert.equal(matchesDocument(documentRecord, { query: "spiffe/spire" }), true);
  assert.equal(matchesDocument(documentRecord, { query: "ZERO   TRUST" }), true);
  assert.equal(matchesDocument(documentRecord, { query: "service mesh" }), false);
});

test("matchesDocument applies an exact normalized document type", () => {
  assert.equal(matchesDocument(documentRecord, { type: " guide " }), true);
  assert.equal(matchesDocument(documentRecord, { type: "Architecture" }), false);
});

test("matchesDocument treats Runbook as a first-class document type", () => {
  const runbook = {
    searchable: "Vault deployment and troubleshooting runbook",
    type: "Runbook",
    technologies: ["Vault", "Kubernetes"],
    topics: ["Identity and Security"],
  };

  assert.equal(matchesDocument(runbook, { type: "runbook" }), true);
  assert.equal(matchesDocument(runbook, { type: "guide" }), false);
});

test("matchesDocument filters technology arrays", () => {
  assert.equal(
    matchesDocument(documentRecord, { discovery: "technology:kubernetes" }),
    true,
  );
  assert.equal(
    matchesDocument(documentRecord, { discovery: "technology:terraform" }),
    false,
  );
});

test("matchesDocument filters topic arrays", () => {
  assert.equal(
    matchesDocument(documentRecord, {
      discovery: "topic:identity and security",
    }),
    true,
  );
  assert.equal(
    matchesDocument(documentRecord, { discovery: "topic:networking" }),
    false,
  );
});

test("matchesDocument accepts pipe-delimited catalog datasets", () => {
  const datasetRecord = {
    searchable: "Self-Hosted AI Platform Architecture",
    type: "architecture",
    technologies: "Kubernetes|NVIDIA GPU Operator|OpenTofu",
    topics: "Artificial Intelligence and Machine Learning|Homelab Engineering",
  };

  assert.equal(
    matchesDocument(datasetRecord, {
      discovery: "technology:nvidia gpu operator",
    }),
    true,
  );
  assert.equal(
    matchesDocument(datasetRecord, {
      discovery: "topic:homelab engineering",
    }),
    true,
  );
});

test("matchesDocument requires every active filter to match", () => {
  assert.equal(
    matchesDocument(documentRecord, {
      query: "workload identity",
      type: "guide",
      discovery: "technology:spiffe",
    }),
    true,
  );
  assert.equal(
    matchesDocument(documentRecord, {
      query: "workload identity",
      type: "project",
      discovery: "technology:spiffe",
    }),
    false,
  );
});

test("matchesDocument tolerates missing records and filters", () => {
  assert.equal(matchesDocument(), true);
  assert.equal(matchesDocument(null, { query: "anything" }), false);
});
