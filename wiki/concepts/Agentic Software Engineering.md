---
id: concept-agentic-software-engineering
type: concept
title: Agentic Software Engineering
status: active
confidence: medium
updated: 2026-09-09
---

# Agentic Software Engineering

Software-development workflows in which an agent converts a human objective into code, validation, and deployment actions across repositories, build systems, and production environments.

## Observable signals

- Scope completed from feature description through production state change.
- Accepted change volume, engineer-equivalent throughput, lead time, and human-review effort.
- Defect, rollback, failed-deployment, security-incident, and rework rates.
- Repository, environment, credential, approval, and reversible-deployment boundaries.

## Current graph evidence

- Delivery Hero reports that Herogen can take a natural-language feature description through end-to-end app deployment, with annual coding output equivalent to 130 engineers and double-digit weekly growth.
- The disclosure establishes operating scale but omits accepted-change volume, defect, rollback, review, and financial-impact measures, so the engineer-equivalent metric remains management-attributed.
- Railway's production-deletion incident shows the negative boundary: an agent executing software or infrastructure work with broad credentials and irreversible APIs can create material production risk.
- Harness reports 500,000 agent-originated CLI actions versus 300,000 human actions during the interface's first few weeks, plus more than 10,000 claimed internal review hours saved in one month. The action mix is direct operator telemetry; accepted-change, quality, customer, and commercial denominators remain absent.

## Relations

- `depends-on` [[wiki/concepts/Human-AI Workforce Coordination|Human-AI Workforce Coordination]]
- `depends-on` [[wiki/concepts/System-of-Record Distribution|System-of-Record Distribution]]
- `measured-by` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `references` [[wiki/events/2026-09-02 Harness reports agents outnumber humans in CLI actions|Harness reports agents outnumber humans in CLI actions]]
