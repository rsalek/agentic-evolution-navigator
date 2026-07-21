# Agentic Evolution Navigator

An Obsidian-compatible, GitHub-ready research navigator for tracking how AI agents are adopted, connected, governed, and monetized across industries.

Hosted explorer: [rsalek.github.io/agentic-evolution-navigator](https://rsalek.github.io/agentic-evolution-navigator/)

Markdown is the canonical knowledge graph. Obsidian provides local editing and its native graph view. `scripts/graph.py` compiles the same notes into `docs/graph.json` for a static GitHub Pages explorer.

## Start here

- Open this directory as an Obsidian vault and begin at [`wiki/Home.md`](wiki/Home.md).
- Read [`AGENTS.md`](AGENTS.md) before asking Codex to ingest or maintain research.
- Build and validate the derived graph:

```bash
python3 -B scripts/graph.py build
python3 -B scripts/graph.py validate
```

- Query locally:

```bash
python3 -B scripts/graph.py search "agent payments production"
python3 -B scripts/graph.py neighbors "Agentic Payments" --depth 2
python3 -B scripts/graph.py path "BBVA" "Trust infrastructure monetizes before full autonomy"
```

- Collect candidate news for review:

```bash
python3 -B scripts/collect_news.py
```

This appends discovery leads to `raw/inbox/candidates.jsonl`; it never promotes a headline directly into the evidence graph. Codex reviews candidates, checks primary sources, and only then updates events and theses.

- Preview the hosted interface:

```bash
python3 -m http.server 8000 --directory docs
```

Then open `http://127.0.0.1:8000`.

## Publishing

The repository can be hosted on GitHub and deployed through the included GitHub Pages workflow. A public repository makes all committed notes and source metadata public. Keep private or licensed source material under `raw/private/`, which is ignored by Git.

GitHub stores and versions the Obsidian vault; GitHub Pages serves the generated browser interface. Obsidian's own Graph View remains a local desktop feature, while `docs/` provides its public counterpart with filters, evidence details, a timeline, and multi-hop path tracing.

After creating a GitHub repository, push the `main` branch and select **GitHub Actions** as the Pages source in the repository settings. The included workflow rebuilds and validates the graph before every deployment.

## Architecture

1. `raw/` contains immutable source captures and the append-only source ledger.
2. `wiki/` contains Codex-maintained events, entities, concepts, theses, and durable answers.
3. `scripts/graph.py` validates links and creates a portable graph projection.
4. `docs/` is the static graph explorer published by GitHub Pages.

The project intentionally does not depend on Graph-LLM model training. Multi-hop retrieval is deterministic graph traversal; Codex performs the final evidence-backed synthesis over the retrieved subgraph.
