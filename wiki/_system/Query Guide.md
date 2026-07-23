---
id: system-query-guide
type: system
title: Query Guide
status: active
confidence: high
updated: 2026-07-23
---

# Query Guide

Use deterministic traversal to collect a relevant evidence subgraph, then ask Codex to synthesize it.

## Useful commands

```bash
python3 -B scripts/graph.py search "payment production trust"
python3 -B scripts/graph.py neighbors "Agentic Payments" --depth 2
python3 -B scripts/graph.py path "BBVA" "Trust infrastructure monetizes before full autonomy"
printf '%s' "Passage to assess" | python3 -B scripts/evidence_contract.py --operator "Named operator"
```

## Useful questions

- Which events show agent payments moving beyond standards work?
- What is the evidence path from agent traffic growth to monetization?
- Which incumbent platforms connect the most use cases?
- Which constraints challenge the strongest active thesis?
- What changed in the last month, and which older event did it update?

## Answer contract

Every answer should distinguish direct evidence, graph-derived connection, and inference. A missing path is a research gap, not permission to invent an edge.

The evidence-contract command returns review routing only. Read the primary source before changing maturity, confidence, or graph relations.

## Relations

- `depends-on` [[wiki/_system/Schema|Graph Schema]]
- `depends-on` [[wiki/_system/Evidence Ontology|Evidence Ontology]]
