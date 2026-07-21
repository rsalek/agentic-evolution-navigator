# Raw inbox

Drop new source files here for review. Inbox files are staging material, not accepted evidence.

During ingestion, Codex should classify the source, register it in `raw/sources.jsonl`, move the immutable capture to an appropriate `raw/sources/` folder when one exists, and update the compiled wiki.

`scripts/collect_news.py` retains the broad configured feeds, then derives additional searches from the current graph. It targets missing maturity steps and event open questions, and creates counterevidence searches for active theses. The generated `search-plan.json` explains every graph-derived query and its target nodes.

New records are appended to `candidates.jsonl` and summarized in `latest.md`. Each candidate includes a graph relevance score, matched nodes, one-hop graph context, detected evidence signals, and graph-query lineage when applicable. Scores prioritize review; they do not establish truth or maturity. Verify the underlying announcement against a primary source before creating or updating an event.
