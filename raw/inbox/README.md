# Raw inbox

Drop new source files here for review. Inbox files are staging material, not accepted evidence.

During ingestion, Codex should classify the source, register it in `raw/sources.jsonl`, move the immutable capture to an appropriate `raw/sources/` folder when one exists, and update the compiled wiki.

`scripts/collect_news.py` appends RSS/search discoveries to `candidates.jsonl` and writes a human-readable `latest.md`. These are leads, not evidence: verify the underlying announcement against a primary source before creating or updating an event.
