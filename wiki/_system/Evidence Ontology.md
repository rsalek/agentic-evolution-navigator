---
id: system-evidence-ontology
type: system
title: Evidence Ontology
status: active
confidence: high
updated: 2026-07-23
---

# Evidence Ontology

The evidence ontology makes the admission gate explicit before a candidate becomes graph evidence. Its machine-readable vocabulary is `config/evidence-ontology.json`; `scripts/evidence_contract.py` applies that vocabulary to a passage.

The extractor is deliberately deterministic and routing-only. Lexical matches can identify where a reviewer should look, but cannot establish truth, causality, maturity, or graph admission.

## Evidence contract

Each assessment records:

- `source_role`: `aggregator-headline`, `discovery-passage`, `primary-operator`, `primary-vendor`, `regulator-or-standard`, or `independent-corroboration`.
- `workflow anatomy`: named operator, trigger, agent action, affected system or record, resulting state change, and control boundary.
- `operational proof`: live environment, task volume, outcome, economics, quality, and human handoff.
- `impact basis`: denominator, time window, baseline, and attribution limits.
- `maturity_hint`: the strongest lexically indicated stage, pending source review.
- `missing dimensions`: the evidence gaps that prevent a stronger classification.
- `admission_route`: discovery only, announcement watchlist, operational watchlist, primary-verification candidate, or rebranding rejection.

## Admission discipline

A `primary_verification_candidate` is not an accepted event. Promotion still requires a reviewer to:

1. Inspect the primary source and determine the source's actual role.
2. Confirm the named operating environment and the complete workflow state change.
3. Separate routing, preparation, and suggestion from autonomous completion.
4. Record maturity and confidence without inferring adoption from availability or intent.
5. Preserve denominators, periods, limitations, and alternative explanations.
6. Connect accepted evidence to existing events, concepts, update chains, and theses.

## Rebranding and attribution checks

Terms such as “AI-powered,” “assistant,” “copilot,” “chatbot,” and “automation” raise rebranding risk when no agent action or state change is observable. Quantitative claims remain weak when the denominator, time window, baseline, or causal attribution is absent.

Vendor-published customer stories can establish a named workflow but normally remain below customer-confirmed evidence in confidence. Earnings transcripts and annual reports are primary operator disclosures, but management attribution still requires qualification.

## Relations

- `enables` [[wiki/_system/Schema|Graph Schema]]
- `enables` [[wiki/_system/Query Guide|Query Guide]]
- `references` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
