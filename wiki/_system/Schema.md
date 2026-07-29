---
id: system-schema
type: system
title: Graph Schema
status: active
confidence: high
updated: 2026-07-25
---

# Graph Schema

The graph separates dated evidence from reusable mechanisms and revisable interpretation.

## Node progression

`Evidence -> Event -> Concept -> Thesis -> Durable Query`

- Evidence establishes that an event occurred.
- Events demonstrate concepts and support or challenge theses.
- Concepts connect mechanisms across industries and time.
- Theses summarize dynamics without becoming immutable facts.
- Durable queries preserve useful multi-hop synthesis.

## Adoption stages

1. `announcement`: intent, membership, launch, or availability without operational proof.
2. `pilot`: bounded use with a named participant or environment.
3. `production`: a live workflow, transaction, or system is operating.
4. `scaled`: repeated operation with a meaningful usage, economic, or outcome metric.

## Evidence confidence

- `high`: primary source plus direct operational detail, or independent corroboration.
- `medium`: credible secondary source, syndicated company release, or incomplete methodology.
- `low`: unverified social claim, vague announcement, or ambiguous entity match.

## Commercial proof

Events may include `commercial_proof` and `commercial_signals` in frontmatter. Missing
commercial proof is compiled as `unproven`; announcement language alone never upgrades
the label.

- `unproven`: readiness, a pilot, a first transaction, or activity without an
  attributable economic bridge.
- `emerging`: a credible paid deployment, customer or share gain, repeat usage,
  pricing, contracted economics, or attributable operating benefit with stated
  limitations.
- `measured`: repeated or multi-period evidence with a clear payer or denominator
  and attributable revenue, retention, margin, market-share, or unit-economic effect.

Canonical commercial-signal slugs are `paying-customers`, `customer-growth`,
`market-share`, `agent-revenue`, `contracted-revenue`, `arr-acv-backlog`,
`pricing-attach-renewal`, `take-rate-fees`, `repeat-transactions`,
`paid-identity-security-monitoring`, `unit-economics`, `margin`, `retention`,
and `demand`.

## Idea themes

The public graph compiles every non-system node into one primary theme and optional
secondary themes using the ordered taxonomy in `config/theme-taxonomy.json`.
Assignments are deterministic and relation-first: fixed seeds and explicit overrides
take precedence, typed semantic relations are scored through two hops, generic
`references` links are ignored, and keywords are used only when relation scoring
returns zero. The compiled assignment includes its basis so a reader can inspect why
the node appears in a theme.

Each compiled theme summary exposes three explicit navigation roles:
`anchorConceptId`, `strongestEventId`, and `synthesisId`. A role is `null` when the
accepted graph has no corresponding event or synthesis. `representativeNodeIds`
remains the ordered compatibility projection of the non-null role IDs.

## Evidence admission

Before promotion, run the passage through the [[wiki/_system/Evidence Ontology|Evidence Ontology]] or assess the same dimensions manually. The resulting evidence contract is routing context, not proof.

An accepted event should identify the source role, workflow anatomy, observed state change, maturity, confidence, and material evidence gaps. For comparative telemetry or research, it should also identify the observation method, product surface, unit, population, period, and coverage limits. Scaled classification requires repeated operation plus a meaningful usage, economic, or outcome measure; a large number without a denominator or period is weaker than a bounded, reproducible metric.

Provider telemetry, surveys, operator disclosures, and vendor studies are complementary but not directly interchangeable. A relative growth rate or percentile gap can establish a directional production signal without establishing absolute scale.

## Relation discipline

Typed relations live in each note's `Relations` section. The canonical relation vocabulary is defined in `AGENTS.md`; the compiler treats other wiki links as `references` edges.

## Relations

- `enables` [[wiki/_system/Query Guide|Query Guide]]
- `depends-on` [[wiki/_system/Evidence Ontology|Evidence Ontology]]
- `references` [[wiki/_system/Graph Dynamics|Graph Dynamics]]
