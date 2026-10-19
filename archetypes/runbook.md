---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
description: ""
date: {{ .Date }}
lastmod: {{ .Date }}
draft: true
document_type: "Runbook"
topics: []
technologies: []
tags: []
status: "Draft"
version: "0.1"
# github_url: "https://github.com/owner/repository"
related_docs: []
carbon:
  eyebrow: "Runbook"
  lead: ""
  meta: []
  # callout:
  #   kind: "warning"
  #   title: "Read this first"
  #   text: "State the highest-impact prerequisite or safety constraint."
  # button:
  #   label: "Start with the architecture"
  #   href: "#architecture"
---

## Overview

<!-- Explain the runbook's purpose, audience, scope, and expected outcome. -->

## Architecture

<!-- Describe the components, boundaries, dependencies, and operational flow. -->

## Prerequisites

<!-- List required access, tools, versions, inputs, backups, and safety checks. -->

## Procedure

<!-- Use ordered, testable steps. Mark illustrative values and destructive operations. -->

## Validation

<!-- Define observable success and failure checks. Do not claim checks that were not run. -->

## Troubleshooting

<!-- Work from dependencies toward the application and change one variable at a time. -->

## Rollback and recovery

<!-- Document rollback triggers, recovery steps, and any irreversible operations. -->

## Related documentation

<!-- Use Hugo ref shortcodes for internal links. -->

## References
