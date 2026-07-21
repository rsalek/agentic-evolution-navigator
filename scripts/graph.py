#!/usr/bin/env python3
"""Compile and query the Markdown knowledge graph without external dependencies."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import date
from pathlib import Path


FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]")
RELATION = re.compile(
    r"^\s*-\s+`(?P<relation>[a-z0-9-]+)`\s+"
    r"\[\[(?P<target>[^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]",
    re.MULTILINE,
)
MARKDOWN_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")
TOKEN = re.compile(r"[a-z0-9]+")

ALLOWED_RELATIONS = {
    "involves",
    "announced-by",
    "partners-with",
    "demonstrates",
    "applies-to",
    "enables",
    "depends-on",
    "monetizes",
    "measured-by",
    "constrained-by",
    "supports",
    "challenges",
    "updates",
    "precedes",
    "competes-with",
    "references",
}


@dataclass
class Note:
    path: Path
    relative_path: str
    link_path: str
    metadata: dict[str, str]
    body: str
    summary: str
    evidence: list[dict[str, str]]

    @property
    def id(self) -> str:
        return self.metadata["id"]

    @property
    def title(self) -> str:
        return self.metadata.get("title") or self.path.stem


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    match = FRONTMATTER.match(text)
    if not match:
        return {}, text
    metadata: dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#") or ":" not in raw_line:
            continue
        key, value = raw_line.split(":", 1)
        metadata[key.strip()] = value.strip().strip("\"'")
    return metadata, text[match.end() :]


def first_paragraph(body: str) -> str:
    lines: list[str] = []
    started = False
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            if started:
                break
            continue
        if not stripped:
            if started:
                break
            continue
        if stripped.startswith(("- ", "```")):
            if started:
                break
            continue
        started = True
        lines.append(stripped)
    return " ".join(lines)


def evidence_links(body: str) -> list[dict[str, str]]:
    section = re.search(r"^## Evidence\s*$\n(.*?)(?=^## |\Z)", body, re.MULTILINE | re.DOTALL)
    if not section:
        return []
    return [{"label": label, "url": url} for label, url in MARKDOWN_LINK.findall(section.group(1))]


def load_notes(root: Path) -> tuple[list[Note], list[str]]:
    notes: list[Note] = []
    errors: list[str] = []
    wiki_root = root / "wiki"
    for path in sorted(wiki_root.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        metadata, body = parse_frontmatter(text)
        relative = path.relative_to(root).as_posix()
        if not metadata.get("id"):
            errors.append(f"{relative}: missing frontmatter id")
            continue
        if not metadata.get("type"):
            errors.append(f"{relative}: missing frontmatter type")
            continue
        link_path = relative.removesuffix(".md")
        notes.append(
            Note(
                path=path,
                relative_path=relative,
                link_path=link_path,
                metadata=metadata,
                body=body,
                summary=first_paragraph(body),
                evidence=evidence_links(body),
            )
        )
    return notes, errors


def lookup_keys(note: Note) -> set[str]:
    return {
        note.id.casefold(),
        note.title.casefold(),
        note.path.stem.casefold(),
        note.link_path.casefold(),
        note.relative_path.casefold(),
    }


def resolve_target(target: str, lookup: dict[str, str]) -> str | None:
    normalized = target.strip().removesuffix(".md").casefold()
    candidates = [normalized]
    if not normalized.startswith("wiki/"):
        candidates.append(f"wiki/{normalized}")
    candidates.append(Path(normalized).name)
    for candidate in candidates:
        if candidate in lookup:
            return lookup[candidate]
    return None


def compile_graph(root: Path) -> tuple[dict, list[str], list[str]]:
    notes, errors = load_notes(root)
    warnings: list[str] = []
    lookup: dict[str, str] = {}
    seen_ids: dict[str, str] = {}

    for note in notes:
        if note.id in seen_ids:
            errors.append(f"duplicate id {note.id}: {seen_ids[note.id]} and {note.relative_path}")
        seen_ids[note.id] = note.relative_path
        for key in lookup_keys(note):
            existing = lookup.get(key)
            if existing and existing != note.id:
                warnings.append(f"ambiguous lookup key {key}: {existing} and {note.id}")
            else:
                lookup[key] = note.id

    nodes: list[dict] = []
    edges: list[dict] = []
    edge_keys: set[tuple[str, str, str]] = set()
    inbound: defaultdict[str, int] = defaultdict(int)

    for note in notes:
        metadata = {
            key: value
            for key, value in note.metadata.items()
            if key not in {"id", "type", "title"} and value
        }
        nodes.append(
            {
                "id": note.id,
                "title": note.title,
                "type": note.metadata["type"],
                "path": note.relative_path,
                "summary": note.summary,
                "metadata": metadata,
                "evidence": note.evidence,
            }
        )

        typed_targets: set[str] = set()
        for match in RELATION.finditer(note.body):
            relation = match.group("relation")
            raw_target = match.group("target")
            if relation not in ALLOWED_RELATIONS:
                errors.append(f"{note.relative_path}: unsupported relation `{relation}`")
                continue
            target_id = resolve_target(raw_target, lookup)
            if not target_id:
                errors.append(f"{note.relative_path}: unresolved relation target [[{raw_target}]]")
                continue
            if target_id == note.id:
                warnings.append(f"{note.relative_path}: self relation `{relation}` ignored")
                continue
            key = (note.id, target_id, relation)
            if key not in edge_keys:
                edge_keys.add(key)
                typed_targets.add(target_id)
                inbound[target_id] += 1
                edges.append({"source": note.id, "target": target_id, "type": relation})

        for raw_target in WIKILINK.findall(note.body):
            target_id = resolve_target(raw_target, lookup)
            if not target_id or target_id == note.id or target_id in typed_targets:
                continue
            key = (note.id, target_id, "references")
            if key not in edge_keys:
                edge_keys.add(key)
                inbound[target_id] += 1
                edges.append({"source": note.id, "target": target_id, "type": "references"})

    for note in notes:
        if note.metadata["type"] not in {"index", "system"} and inbound[note.id] == 0:
            warnings.append(f"{note.relative_path}: orphan node has no inbound edge")
        if note.metadata["type"] == "event" and not note.evidence:
            errors.append(f"{note.relative_path}: event has no Evidence URL")
        if note.metadata["type"] == "event":
            for required in ("date", "stage", "industry", "layer", "confidence"):
                if not note.metadata.get(required):
                    errors.append(f"{note.relative_path}: event missing {required}")

    nodes.sort(key=lambda node: (node["type"], node["title"].casefold()))
    edges.sort(key=lambda edge: (edge["source"], edge["target"], edge["type"]))
    graph = {
        "generatedAt": date.today().isoformat(),
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "relationTypes": sorted({edge["type"] for edge in edges}),
        "nodes": nodes,
        "edges": edges,
    }
    return graph, errors, warnings


def graph_indexes(graph: dict) -> tuple[dict[str, dict], dict[str, list[dict]]]:
    nodes = {node["id"]: node for node in graph["nodes"]}
    adjacency: defaultdict[str, list[dict]] = defaultdict(list)
    for edge in graph["edges"]:
        adjacency[edge["source"]].append(edge)
        adjacency[edge["target"]].append(edge)
    return nodes, adjacency


def resolve_query_node(query: str, nodes: dict[str, dict]) -> str:
    folded = query.casefold()
    exact = [
        node_id
        for node_id, node in nodes.items()
        if folded in {node_id.casefold(), node["title"].casefold(), Path(node["path"]).stem.casefold()}
    ]
    if len(exact) == 1:
        return exact[0]
    partial = [node_id for node_id, node in nodes.items() if folded in node["title"].casefold()]
    if len(partial) == 1:
        return partial[0]
    if not partial:
        raise SystemExit(f"No node matches: {query}")
    choices = ", ".join(nodes[node_id]["title"] for node_id in partial[:8])
    raise SystemExit(f"Ambiguous node '{query}'. Matches: {choices}")


def other_end(edge: dict, node_id: str) -> str:
    return edge["target"] if edge["source"] == node_id else edge["source"]


def traversable_edges(adjacency: dict[str, list[dict]], node_id: str, include_references: bool) -> list[dict]:
    edges = adjacency[node_id]
    if not include_references:
        edges = [edge for edge in edges if edge["type"] != "references"]
    return sorted(edges, key=lambda edge: (edge["type"], other_end(edge, node_id)))


def edge_label(edge: dict, current: str) -> str:
    if edge["source"] == current:
        return f"--{edge['type']}-->"
    return f"<--{edge['type']}--"


def print_node(node: dict, prefix: str = "") -> None:
    metadata = node.get("metadata", {})
    detail = " | ".join(
        f"{key}={metadata[key]}" for key in ("date", "stage", "industry", "confidence") if metadata.get(key)
    )
    suffix = f" | {detail}" if detail else ""
    print(f"{prefix}{node['title']} [{node['type']}] ({node['id']}){suffix}")


def command_build(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    graph, errors, warnings = compile_graph(root)
    output = (root / args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(graph, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Built {graph['nodeCount']} nodes and {graph['edgeCount']} edges -> {output}")
    for warning in warnings:
        print(f"WARN: {warning}", file=sys.stderr)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    return 1 if errors else 0


def command_validate(args: argparse.Namespace) -> int:
    graph, errors, warnings = compile_graph(Path(args.root).resolve())
    for warning in warnings:
        print(f"WARN: {warning}")
    for error in errors:
        print(f"ERROR: {error}")
    if errors:
        print(f"Validation failed: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(
        f"Validation passed: {graph['nodeCount']} nodes, {graph['edgeCount']} edges, "
        f"{len(warnings)} warning(s)"
    )
    return 0


def command_search(args: argparse.Namespace) -> int:
    graph, errors, _ = compile_graph(Path(args.root).resolve())
    if errors:
        raise SystemExit("Graph has validation errors; run validate first")
    tokens = TOKEN.findall(args.query.casefold())
    scored: list[tuple[int, dict]] = []
    for node in graph["nodes"]:
        title = node["title"].casefold()
        summary = node.get("summary", "").casefold()
        metadata = " ".join(node.get("metadata", {}).values()).casefold()
        score = sum(8 for token in tokens if token in title)
        score += sum(3 for token in tokens if token in summary)
        score += sum(1 for token in tokens if token in metadata)
        if score:
            scored.append((score, node))
    for score, node in sorted(scored, key=lambda item: (-item[0], item[1]["title"]))[: args.limit]:
        print_node(node, prefix=f"{score:02d}  ")
    return 0


def command_neighbors(args: argparse.Namespace) -> int:
    graph, errors, _ = compile_graph(Path(args.root).resolve())
    if errors:
        raise SystemExit("Graph has validation errors; run validate first")
    nodes, adjacency = graph_indexes(graph)
    start = resolve_query_node(args.node, nodes)
    seen = {start}
    queue = deque([(start, 0)])
    print_node(nodes[start])
    while queue:
        current, depth = queue.popleft()
        if depth >= args.depth:
            continue
        for edge in traversable_edges(adjacency, current, args.include_references):
            neighbor = other_end(edge, current)
            if neighbor in seen:
                continue
            print_node(nodes[neighbor], prefix=f"  {'  ' * depth}{edge_label(edge, current)} ")
            seen.add(neighbor)
            queue.append((neighbor, depth + 1))
    return 0


def command_path(args: argparse.Namespace) -> int:
    graph, errors, _ = compile_graph(Path(args.root).resolve())
    if errors:
        raise SystemExit("Graph has validation errors; run validate first")
    nodes, adjacency = graph_indexes(graph)
    start = resolve_query_node(args.start, nodes)
    goal = resolve_query_node(args.end, nodes)
    queue = deque([start])
    previous: dict[str, tuple[str, dict] | None] = {start: None}
    while queue and goal not in previous:
        current = queue.popleft()
        for edge in traversable_edges(adjacency, current, args.include_references):
            neighbor = other_end(edge, current)
            if neighbor not in previous:
                previous[neighbor] = (current, edge)
                queue.append(neighbor)
    if goal not in previous:
        print("No path found")
        return 1
    steps: list[tuple[str, dict | None]] = []
    cursor = goal
    while cursor != start:
        prior, edge = previous[cursor]  # type: ignore[misc]
        steps.append((cursor, edge))
        cursor = prior
    steps.reverse()
    print(nodes[start]["title"])
    current = start
    for node_id, edge in steps:
        print(f"  {edge_label(edge, current)} {nodes[node_id]['title']}")
        current = node_id
    return 0


def parser() -> argparse.ArgumentParser:
    project_root = Path(__file__).resolve().parents[1]
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--root", default=str(project_root), help="repository root")
    subcommands = cli.add_subparsers(dest="command", required=True)

    build = subcommands.add_parser("build", help="compile Markdown to graph JSON")
    build.add_argument("--output", default="docs/graph.json")
    build.set_defaults(func=command_build)

    validate = subcommands.add_parser("validate", help="check graph integrity")
    validate.set_defaults(func=command_validate)

    search = subcommands.add_parser("search", help="rank nodes by lexical relevance")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=12)
    search.set_defaults(func=command_search)

    neighbors = subcommands.add_parser("neighbors", help="print a multi-hop neighbourhood")
    neighbors.add_argument("node")
    neighbors.add_argument("--depth", type=int, default=1)
    neighbors.add_argument(
        "--include-references",
        action="store_true",
        help="include generic contextual links in traversal",
    )
    neighbors.set_defaults(func=command_neighbors)

    path = subcommands.add_parser("path", help="find the shortest evidence path between nodes")
    path.add_argument("start")
    path.add_argument("end")
    path.add_argument(
        "--include-references",
        action="store_true",
        help="include generic contextual links in traversal",
    )
    path.set_defaults(func=command_path)
    return cli


def main() -> int:
    args = parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
