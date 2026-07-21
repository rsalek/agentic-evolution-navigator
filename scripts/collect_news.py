#!/usr/bin/env python3
"""Collect RSS/Atom headlines into an append-only candidate review queue."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlencode, urlparse

try:
    from graph import compile_graph, load_notes
except ModuleNotFoundError:  # supports imports from repository-level tests
    from scripts.graph import compile_graph, load_notes


TAG = re.compile(r"<[^>]+>")
SPACE = re.compile(r"\s+")
TOKEN = re.compile(r"[a-z0-9]+")
OPEN_QUESTIONS = re.compile(r"^## Open questions\s*$\n(.*?)(?=^## |\Z)", re.MULTILINE | re.DOTALL)
QUANTITATIVE = re.compile(
    r"(?:\b\d+(?:\.\d+)?x\b|\b\d+(?:\.\d+)?%|\b(?:million|billion|growth|volume|rate|count)\b)",
    re.I,
)

STOPWORDS = {
    "about", "after", "agent", "agentic", "agents", "alongside", "also", "among", "and", "are", "with",
    "before", "becoming", "from", "full", "into", "moving", "that", "the", "their", "this", "through",
    "what", "when", "where", "which",
    "while", "who", "will", "would", "across", "using", "used", "uses", "have", "has", "had", "for",
    "how", "does", "did", "its", "not", "yet", "than", "then", "they", "them", "were", "was", "been",
}
METRIC_TERMS = {
    "active", "agents", "customers", "conversion", "cost", "disputes", "exceptions", "failure", "fees",
    "growth", "margin", "merchants", "outcomes", "reliability", "resolution", "retention", "revenue",
    "transactions", "traffic", "usage", "users", "volume",
}
STAGE_SEARCH = {
    "announcement": ("pilot", "production", "deployed", "live", "customer"),
    "pilot": ("production", "rollout", "usage", "volume", "customer"),
    "production": ("scaled", "volume", "transactions", "revenue", "customers"),
    "scaled": ("growth", "revenue", "retention", "margin", "regulation"),
}
SIGNAL_GROUPS = {
    "production": ("deployed", "deployment", "live", "pilot", "production", "rollout", "scaled"),
    "usage": ("active agents", "customers", "growth", "transactions", "traffic", "usage", "users", "volume"),
    "monetization": ("cost", "fee", "margin", "monetization", "payment", "pricing", "revenue"),
    "counterevidence": ("breach", "delayed", "failed", "failure", "paused", "risk", "slower", "stopped"),
}


def clean_text(value: str | None) -> str:
    return SPACE.sub(" ", html.unescape(TAG.sub(" ", value or ""))).strip()


def child_text(element: ET.Element, names: set[str]) -> str:
    for child in element.iter():
        name = child.tag.rsplit("}", 1)[-1].casefold()
        if name in names and child.text:
            return child.text.strip()
    return ""


def entry_link(element: ET.Element) -> str:
    for child in element.iter():
        if child.tag.rsplit("}", 1)[-1].casefold() != "link":
            continue
        href = child.attrib.get("href", "").strip()
        if href and child.attrib.get("rel", "alternate") in {"alternate", ""}:
            return href
        if child.text and child.text.strip().startswith("http"):
            return child.text.strip()
    return ""


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def parse_feed(payload: bytes, feed: dict[str, str]) -> list[dict]:
    root = ET.fromstring(payload)
    entries = [
        element
        for element in root.iter()
        if element.tag.rsplit("}", 1)[-1].casefold() in {"item", "entry"}
    ]
    candidates: list[dict] = []
    for entry in entries:
        title = clean_text(child_text(entry, {"title"}))
        link = entry_link(entry)
        if not title or not link:
            continue
        guid = clean_text(child_text(entry, {"guid", "id"}))
        published_raw = child_text(entry, {"pubdate", "published", "updated", "date"})
        published = parse_date(published_raw)
        source = clean_text(child_text(entry, {"source", "author"}))
        identity = guid or link or title.casefold()
        candidate_id = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20]
        candidates.append(
            {
                "candidate_id": candidate_id,
                "status": "candidate",
                "title": title,
                "url": link,
                "publisher": source or urlparse(link).netloc,
                "published_at": published.isoformat() if published else None,
                "feed_id": feed["id"],
                "feed_label": feed["label"],
                "matched_query_ids": [feed["id"]] if feed.get("origin") == "graph" else [],
                "query_targets": feed.get("target_ids", []),
            }
        )
    return candidates


def tokens(value: str) -> set[str]:
    return {token for token in TOKEN.findall(value.casefold()) if len(token) > 2 and token not in STOPWORDS}


def quoted_or(value: str, limit: int = 4) -> str:
    values = [item for item in dict.fromkeys(part.strip() for part in value.split("|") if part.strip())]
    return " OR ".join(f'"{item}"' for item in values[:limit])


def google_news_feed(query_id: str, label: str, query: str, target_ids: list[str]) -> dict:
    params = urlencode({"q": query, "hl": "en-GB", "gl": "GB", "ceid": "GB:en"})
    return {
        "id": query_id,
        "label": label,
        "url": f"https://news.google.com/rss/search?{params}",
        "origin": "graph",
        "query": query,
        "target_ids": target_ids,
    }


def section_questions(body: str) -> list[str]:
    match = OPEN_QUESTIONS.search(body)
    if not match:
        return []
    return [
        SPACE.sub(" ", line.removeprefix("- ").strip()).rstrip("?")
        for line in match.group(1).splitlines()
        if line.strip().startswith("- ")
    ]


def event_anchors(event_id: str, nodes: dict[str, dict], edges: list[dict]) -> list[str]:
    anchors: list[str] = []
    for edge in edges:
        if edge["source"] != event_id or edge["type"] not in {"announced-by", "involves"}:
            continue
        target = nodes.get(edge["target"])
        if target and target["type"] == "entity":
            anchors.append(target["title"])
    return list(dict.fromkeys(anchors))


def derive_graph_feeds(root: Path, max_feeds: int) -> tuple[list[dict], dict, list[str]]:
    graph, errors, warnings = compile_graph(root)
    if errors:
        plan = {
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "graph": {"nodes": graph["nodeCount"], "edges": graph["edgeCount"]},
            "query_count": 0,
            "queries": [],
            "disabled_reason": "graph validation failed",
        }
        return [], plan, [f"graph-search disabled: {error}" for error in errors]

    nodes = {node["id"]: node for node in graph["nodes"]}
    notes, note_errors = load_notes(root)
    notes_by_id = {note.id: note for note in notes}
    candidates: list[tuple[int, dict]] = []

    for event in (node for node in graph["nodes"] if node["type"] == "event"):
        stage = event.get("metadata", {}).get("stage", "announcement")
        anchors = event_anchors(event["id"], nodes, graph["edges"])
        anchor_expression = quoted_or("|".join(anchors)) or f'"{event["title"]}"'
        stage_terms = STAGE_SEARCH.get(stage, STAGE_SEARCH["announcement"])
        questions = section_questions(notes_by_id[event["id"]].body) if event["id"] in notes_by_id else []
        metric_terms = sorted({term for question in questions for term in tokens(question) if term in METRIC_TERMS})
        expansion = list(dict.fromkeys((*stage_terms, *metric_terms)))[:8]
        query = f'({anchor_expression}) "AI agent" ({" OR ".join(expansion)})'
        priority = {"announcement": 5, "pilot": 4, "production": 3, "scaled": 2}.get(stage, 2)
        priority += min(len(metric_terms), 3)
        feed = google_news_feed(
            f"graph-stage-{event['id'].removeprefix('event-')}",
            f"Graph gap: {event['title']} ({stage} -> evidence)",
            query,
            [event["id"]],
        )
        feed["reason"] = {
            "kind": "maturity-and-metric-gap",
            "current_stage": stage,
            "open_questions": questions,
            "desired_signals": expansion,
        }
        candidates.append((priority, feed))

    for thesis in (node for node in graph["nodes"] if node["type"] == "thesis"):
        supporting = sum(
            edge["target"] == thesis["id"] and edge["type"] == "supports" for edge in graph["edges"]
        )
        challenging = sum(
            edge["target"] == thesis["id"] and edge["type"] == "challenges" for edge in graph["edges"]
        )
        imbalance = max(supporting - challenging, 0)
        query = (
            f'"AI agent" ({" OR ".join(sorted(tokens(thesis["title"]))[:6])}) '
            "(failed OR delayed OR slower OR risk OR cost OR breach OR regulation)"
        )
        feed = google_news_feed(
            f"graph-challenge-{thesis['id'].removeprefix('thesis-')}",
            f"Graph stress test: {thesis['title']}",
            query,
            [thesis["id"]],
        )
        feed["reason"] = {
            "kind": "thesis-stress-test",
            "supporting_edges": supporting,
            "challenging_edges": challenging,
        }
        candidates.append((4 + imbalance, feed))

    candidates.sort(key=lambda item: (-item[0], item[1]["id"]))
    feeds = [feed for _, feed in candidates[: max(max_feeds, 0)]]
    plan = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "graph": {"nodes": graph["nodeCount"], "edges": graph["edgeCount"]},
        "query_count": len(feeds),
        "queries": [
            {key: feed[key] for key in ("id", "label", "query", "target_ids", "reason")}
            for feed in feeds
        ],
    }
    return feeds, plan, [*warnings, *note_errors]


def graph_match(candidate: dict, graph: dict) -> dict:
    haystack = f"{candidate.get('title', '')} {candidate.get('publisher', '')}".casefold()
    haystack_tokens = tokens(haystack)
    matches: list[dict] = []
    type_weight = {"entity": 6, "concept": 5, "thesis": 4, "event": 3, "query": 2}

    for node in graph.get("nodes", []):
        node_tokens = tokens(node["title"])
        overlap = haystack_tokens & node_tokens
        exact = node["title"].casefold() in haystack
        if not exact and not overlap:
            continue
        score = type_weight.get(node["type"], 1) + len(overlap) * 2 + (8 if exact else 0)
        matches.append({"id": node["id"], "title": node["title"], "type": node["type"], "score": score})

    target_ids = set(candidate.get("query_targets", []))
    for match in matches:
        if match["id"] in target_ids:
            match["score"] += 5
    matches.sort(key=lambda item: (-item["score"], item["title"]))

    nodes_by_id = {node["id"]: node for node in graph.get("nodes", [])}
    seed_ids = set(target_ids)
    if not seed_ids and matches:
        seed_ids.add(matches[0]["id"])
    context: list[dict] = []
    seen_context: set[tuple[str, str, str]] = set()
    for edge in graph.get("edges", []):
        if edge["source"] in seed_ids:
            seed_id, related_id, direction = edge["source"], edge["target"], "outgoing"
        elif edge["target"] in seed_ids:
            seed_id, related_id, direction = edge["target"], edge["source"], "incoming"
        else:
            continue
        related = nodes_by_id.get(related_id)
        if not related or related_id in seed_ids:
            continue
        key = (seed_id, related_id, edge["type"])
        if key in seen_context:
            continue
        seen_context.add(key)
        context.append(
            {
                "seed_id": seed_id,
                "relation": edge["type"],
                "direction": direction,
                "id": related_id,
                "title": related["title"],
                "type": related["type"],
            }
        )
    context.sort(key=lambda item: (item["type"] not in {"concept", "thesis"}, item["title"]))

    signals = [name for name, terms in SIGNAL_GROUPS.items() if any(term in haystack for term in terms)]
    if QUANTITATIVE.search(haystack):
        signals.append("quantitative")
    signals = list(dict.fromkeys(signals))
    signal_score = sum(3 if signal in {"quantitative", "usage", "monetization"} else 2 for signal in signals)
    search_score = 4 if candidate.get("matched_query_ids") else 0
    graph_score = sum(match["score"] for match in matches[:3]) + signal_score + search_score
    return {
        "graph_score": graph_score,
        "graph_matches": matches[:5],
        "graph_context": context[:8],
        "signals": signals,
    }


def merge_candidate(existing: dict, incoming: dict) -> None:
    existing["matched_query_ids"] = list(
        dict.fromkeys([*existing.get("matched_query_ids", []), *incoming.get("matched_query_ids", [])])
    )
    existing["query_targets"] = list(
        dict.fromkeys([*existing.get("query_targets", []), *incoming.get("query_targets", [])])
    )
    existing["feed_ids"] = list(
        dict.fromkeys([*existing.get("feed_ids", [existing["feed_id"]]), incoming["feed_id"]])
    )


def fetch(url: str, timeout: int) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Agentic-Evolution-Navigator/1.0 (+GitHub research collector)"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def read_existing(path: Path) -> set[str]:
    if not path.exists():
        return set()
    ids: set[str] = set()
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise SystemExit(f"{path}:{line_number}: invalid JSON: {error}") from error
        if record.get("candidate_id"):
            ids.add(record["candidate_id"])
    return ids


def write_report(
    path: Path,
    candidates: list[dict],
    errors: list[str],
    generated: datetime,
    notices: list[str] | None = None,
) -> None:
    lines = [
        "# Latest candidate-news collection",
        "",
        f"Generated: {generated.isoformat()}",
        "",
        "Candidates are discovery leads, not verified evidence. Promote them only after checking a primary source.",
        "",
        f"## New candidates ({len(candidates)})",
        "",
    ]
    if candidates:
        for candidate in candidates:
            date = (candidate.get("published_at") or "undated")[:10]
            score = candidate.get("graph_score", 0)
            matches = ", ".join(match["title"] for match in candidate.get("graph_matches", [])[:3])
            context = ", ".join(
                f"{item['title']} ({item['relation']})" for item in candidate.get("graph_context", [])[:4]
            )
            signals = ", ".join(candidate.get("signals", []))
            lines.append(
                f"- {date} · [{candidate['title']}]({candidate['url']}) "
                f"— {candidate['publisher']} · `{candidate['feed_id']}` · graph score `{score}`"
            )
            if matches:
                lines.append(f"  - Matches: {matches}")
            if context:
                lines.append(f"  - Graph context: {context}")
            if signals:
                lines.append(f"  - Signals: {signals}")
            if candidate.get("matched_query_ids"):
                lines.append(f"  - Graph searches: {', '.join(candidate['matched_query_ids'])}")
    else:
        lines.append("- No new candidates in this run.")
    if errors:
        lines.extend(["", f"## Feed errors ({len(errors)})", ""])
        lines.extend(f"- {error}" for error in errors)
    if notices:
        lines.extend(["", f"## Graph-search notices ({len(notices)})", ""])
        lines.extend(f"- {notice}" for notice in notices)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parser() -> argparse.ArgumentParser:
    root = Path(__file__).resolve().parents[1]
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--config", type=Path, default=root / "config/news-feeds.json")
    cli.add_argument("--output", type=Path, default=root / "raw/inbox/candidates.jsonl")
    cli.add_argument("--report", type=Path, default=root / "raw/inbox/latest.md")
    cli.add_argument("--search-plan", type=Path, default=root / "raw/inbox/search-plan.json")
    cli.add_argument("--since-days", type=int, default=14)
    cli.add_argument("--limit-per-feed", type=int, default=12)
    cli.add_argument("--max-graph-feeds", type=int)
    cli.add_argument("--no-graph-search", action="store_true")
    cli.add_argument("--timeout", type=int, default=20)
    cli.add_argument("--dry-run", action="store_true")
    return cli


def main() -> int:
    args = parser().parse_args()
    root = Path(__file__).resolve().parents[1]
    config = json.loads(args.config.read_text(encoding="utf-8"))
    static_feeds = config.get("feeds", [])
    if not static_feeds:
        raise SystemExit(f"No feeds configured in {args.config}")

    graph: dict = {"nodes": [], "edges": [], "nodeCount": 0, "edgeCount": 0}
    graph_feeds: list[dict] = []
    graph_messages: list[str] = []
    search_plan: dict = {"query_count": 0, "queries": []}
    graph_config = config.get("graph_search", {})
    graph_search_enabled = graph_config.get("enabled", True) and not args.no_graph_search
    max_graph_feeds = args.max_graph_feeds
    if max_graph_feeds is None:
        max_graph_feeds = int(graph_config.get("max_feeds", 12))
    if graph_search_enabled:
        graph_feeds, search_plan, graph_messages = derive_graph_feeds(root, max_graph_feeds)
        graph, graph_errors, graph_warnings = compile_graph(root)
        graph_messages.extend(graph_errors)
        graph_messages.extend(graph_warnings)
    feeds = [*static_feeds, *graph_feeds]

    generated = datetime.now(timezone.utc).replace(microsecond=0)
    cutoff = generated - timedelta(days=max(args.since_days, 0))
    existing = read_existing(args.output)
    discovered_by_id: dict[str, dict] = {}
    graph_notices = [message for message in dict.fromkeys(graph_messages)]
    errors: list[str] = []

    for feed in feeds:
        try:
            parsed = parse_feed(fetch(feed["url"], args.timeout), feed)
        except Exception as error:  # feed outages should not erase successful results
            errors.append(f"{feed.get('id', 'unknown')}: {type(error).__name__}: {error}")
            continue
        recent = [
            candidate
            for candidate in parsed
            if not candidate["published_at"] or datetime.fromisoformat(candidate["published_at"]) >= cutoff
        ]
        for candidate in recent[: max(args.limit_per_feed, 0)]:
            if candidate["candidate_id"] in existing:
                continue
            prior = discovered_by_id.get(candidate["candidate_id"])
            if prior:
                merge_candidate(prior, candidate)
                continue
            candidate["discovered_at"] = generated.isoformat()
            candidate["review_note"] = "Verify against a primary source before promotion."
            candidate["feed_ids"] = [candidate["feed_id"]]
            discovered_by_id[candidate["candidate_id"]] = candidate

    discovered = list(discovered_by_id.values())
    for candidate in discovered:
        candidate.update(graph_match(candidate, graph))
    discovered.sort(
        key=lambda item: (item.get("graph_score", 0), item.get("published_at") or "", item["title"]),
        reverse=True,
    )
    if args.dry_run:
        for candidate in discovered:
            print(json.dumps(candidate, ensure_ascii=False))
    else:
        existing.update(candidate["candidate_id"] for candidate in discovered)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("a", encoding="utf-8") as handle:
            for candidate in discovered:
                handle.write(json.dumps(candidate, ensure_ascii=False) + "\n")
        write_report(args.report, discovered, errors, generated, graph_notices)
        args.search_plan.parent.mkdir(parents=True, exist_ok=True)
        args.search_plan.write_text(json.dumps(search_plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(
        f"Collected {len(discovered)} new candidate(s) from {len(static_feeds)} static and "
        f"{len(graph_feeds)} graph-derived feed(s); {len(errors)} error(s)"
    )
    for error in errors:
        print(f"WARN: {error}", file=sys.stderr)
    for notice in graph_notices:
        print(f"NOTICE: {notice}", file=sys.stderr)
    return 0 if len(errors) < len(feeds) else 1


if __name__ == "__main__":
    raise SystemExit(main())
