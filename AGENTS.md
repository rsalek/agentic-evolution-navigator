# Agentic Evolution Navigator Agent Guide

This repository is a maintained knowledge graph for the AI-agent economy. Treat Markdown as source code: `raw/` is immutable evidence, `wiki/` is the compiled and linked knowledge layer, and `docs/graph.json` is a derived artifact.

## Non-negotiable boundaries

- Never silently turn an announcement into evidence of adoption. Record the maturity stage.
- Never merge an Event, Claim, Theme, or Thesis. They have different temporal and epistemic roles.
- Prefer a primary source. If only secondary coverage exists, mark the event `status: reported` and lower confidence.
- Preserve disagreement. Link evidence with `supports` or `challenges`; do not smooth contradictions into false certainty.
- Keep `raw/sources.jsonl` append-only. Never rewrite or delete earlier source records.
- Do not commit private, licensed, credential-bearing, or personally sensitive material. Use `raw/private/` locally.
- Rebuild and validate the graph after every material wiki change.

## Canonical node types

- `event`: a dated, verifiable occurrence.
- `entity`: an organization, product, protocol, platform, regulator, or other actor.
- `concept`: a reusable mechanism, use case, market layer, monetization model, or constraint.
- `thesis`: a revisable interpretation supported or challenged by evidence.
- `query`: a durable answer worth preserving.

## Canonical relation syntax

Put typed edges under `## Relations`, one per line:

```md
- `involves` [[wiki/entities/Visa|Visa]]
- `demonstrates` [[wiki/concepts/Agentic Payments|Agentic Payments]]
- `supports` [[wiki/theses/Agent payments are moving from protocol to production]]
```

Allowed relation types:

- `involves`: an event includes an actor.
- `announced-by`: an entity is the primary announcer.
- `partners-with`: two entities cooperate.
- `demonstrates`: an event makes a concept concrete.
- `applies-to`: a concept or event belongs to an industry or use case.
- `enables`: one node makes another possible.
- `depends-on`: one node requires another.
- `monetizes`: a node creates a revenue or tollbooth mechanism.
- `measured-by`: a node is evidenced through a metric or proxy.
- `constrained-by`: a node faces a risk, control, or bottleneck.
- `supports`: evidence strengthens a thesis.
- `challenges`: evidence weakens or qualifies a thesis.
- `updates`: a later event revises the state established by an earlier event.
- `precedes`: an event is an earlier step in the same development chain.
- `competes-with`: entities or mechanisms contend for the same role.
- `references`: an untyped contextual link. Prefer a more specific relation.

Do not invent synonyms such as `related-to`, `connected-with`, or `about`.

## Frontmatter contract

Every graph node must have these fields:

```yaml
---
id: stable-kebab-case-id
type: event
title: Human-readable title
status: verified
confidence: high
updated: 2026-07-20
---
```

Events additionally require `date`, `stage`, `industry`, and `layer`. Valid stages are `announcement`, `pilot`, `production`, and `scaled`. Valid confidence values are `low`, `medium`, and `high`.

## Operations

### Ingest

1. Read `wiki/Home.md`, `wiki/_system/Schema.md`, and the most relevant existing nodes.
2. Review `raw/inbox/search-plan.json` and the candidate's `graph_matches`, `graph_context`, `signals`, and `matched_query_ids` when present. Treat them as routing context, not evidence.
3. Register the source in `raw/sources.jsonl` without altering previous lines.
4. Create or update the event note. Never overwrite an earlier event with a later update.
5. Link actors, concepts, and theses using typed relations.
6. Update affected thesis pages with a dated evidence entry.
7. Update `wiki/Home.md` only when a new major theme, thesis, or index entry is created.
8. Append an operational-log entry.
9. Run `python3 -B scripts/graph.py build` and `python3 -B scripts/graph.py validate`.

### Query

1. Search the graph with `scripts/graph.py search`.
2. Retrieve a two-hop neighbourhood or a path between relevant nodes.
3. Read the returned notes and their cited evidence.
4. Separate sourced facts, graph-derived connections, and inference in the answer.
5. File a durable answer under `wiki/queries/` when it adds a reusable synthesis.

### Lint

Check for unresolved links, duplicate IDs, orphan nodes, events without evidence, theses with only supporting evidence, stale thesis reviews, missing update chains, and source records not represented by an event.

## Public publishing rule

The GitHub Pages graph is derived from committed Markdown. Before publishing, check that no note contains private analysis, licensed full text, secrets, or sensitive metadata. Source summaries and short quotations are preferred to copied articles.
