---
status: accepted
---

# Markdown is the canonical graph

The canonical knowledge base will be Obsidian-compatible Markdown with stable IDs and typed wiki-link relations. Graph JSON, the hosted explorer, and query subgraphs are derived projections. This preserves readable, versioned evidence while avoiding early lock-in to a graph database or a GPU-trained Graph-LLM stack.

## Considered options

- A graph database would provide richer queries but make Obsidian and Git diffs secondary views.
- A vector-only RAG system would simplify ingestion but repeatedly reconstruct relationships and obscure contradictions.
- The referenced Graph-LLM repository targets model training on graph tasks and requires specialized GPU infrastructure that is disproportionate to this research workflow.

## Consequences

Typed relations remain reviewable in ordinary Markdown. Derived graph data must be rebuilt after changes, and very large-scale analytics may eventually justify an additional graph database projection.
