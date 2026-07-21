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
from urllib.parse import urlparse


TAG = re.compile(r"<[^>]+>")
SPACE = re.compile(r"\s+")


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
            }
        )
    return candidates


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


def write_report(path: Path, candidates: list[dict], errors: list[str], generated: datetime) -> None:
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
            lines.append(
                f"- {date} · [{candidate['title']}]({candidate['url']}) "
                f"— {candidate['publisher']} · `{candidate['feed_id']}`"
            )
    else:
        lines.append("- No new candidates in this run.")
    if errors:
        lines.extend(["", f"## Feed errors ({len(errors)})", ""])
        lines.extend(f"- {error}" for error in errors)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parser() -> argparse.ArgumentParser:
    root = Path(__file__).resolve().parents[1]
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--config", type=Path, default=root / "config/news-feeds.json")
    cli.add_argument("--output", type=Path, default=root / "raw/inbox/candidates.jsonl")
    cli.add_argument("--report", type=Path, default=root / "raw/inbox/latest.md")
    cli.add_argument("--since-days", type=int, default=14)
    cli.add_argument("--limit-per-feed", type=int, default=12)
    cli.add_argument("--timeout", type=int, default=20)
    cli.add_argument("--dry-run", action="store_true")
    return cli


def main() -> int:
    args = parser().parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    feeds = config.get("feeds", [])
    if not feeds:
        raise SystemExit(f"No feeds configured in {args.config}")

    generated = datetime.now(timezone.utc).replace(microsecond=0)
    cutoff = generated - timedelta(days=max(args.since_days, 0))
    existing = read_existing(args.output)
    discovered: list[dict] = []
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
            candidate["discovered_at"] = generated.isoformat()
            candidate["review_note"] = "Verify against a primary source before promotion."
            existing.add(candidate["candidate_id"])
            discovered.append(candidate)

    discovered.sort(key=lambda item: (item.get("published_at") or "", item["title"]), reverse=True)
    if args.dry_run:
        for candidate in discovered:
            print(json.dumps(candidate, ensure_ascii=False))
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("a", encoding="utf-8") as handle:
            for candidate in discovered:
                handle.write(json.dumps(candidate, ensure_ascii=False) + "\n")
        write_report(args.report, discovered, errors, generated)

    print(f"Collected {len(discovered)} new candidate(s) from {len(feeds)} feed(s); {len(errors)} error(s)")
    for error in errors:
        print(f"WARN: {error}", file=sys.stderr)
    return 0 if len(errors) < len(feeds) else 1


if __name__ == "__main__":
    raise SystemExit(main())
