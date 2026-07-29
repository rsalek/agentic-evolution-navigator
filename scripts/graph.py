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

THEME_RELATION_WEIGHTS = {
    "demonstrates": 6.0,
    "applies-to": 6.0,
    "supports": 6.0,
    "challenges": 6.0,
    "monetizes": 6.0,
    "measured-by": 6.0,
    "enables": 4.0,
    "depends-on": 4.0,
    "constrained-by": 4.0,
    "updates": 3.0,
    "precedes": 3.0,
    "competes-with": 2.0,
    "involves": 2.0,
    "announced-by": 2.0,
    "partners-with": 2.0,
}
THEME_SEMANTIC_RELATIONS = {
    "demonstrates",
    "applies-to",
    "supports",
    "challenges",
    "monetizes",
    "measured-by",
}
COMMERCIAL_PROOF_VALUES = {"unproven", "emerging", "measured"}
COMMERCIAL_PROOF_ORDER = {"unproven": 0, "emerging": 1, "measured": 2}
COMMERCIAL_SIGNAL_VALUES = {
    "paying-customers",
    "customer-growth",
    "market-share",
    "agent-revenue",
    "contracted-revenue",
    "arr-acv-backlog",
    "pricing-attach-renewal",
    "take-rate-fees",
    "repeat-transactions",
    "paid-identity-security-monitoring",
    "unit-economics",
    "margin",
    "retention",
    "demand",
}
STAGE_ORDER = {"announcement": 0, "pilot": 1, "production": 2, "scaled": 3}
CONFIDENCE_ORDER = {"low": 0, "medium": 1, "high": 2}


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


def load_theme_taxonomy(root: Path) -> tuple[dict, list[str]]:
    path = root / "config" / "theme-taxonomy.json"
    if not path.exists():
        return {"version": 1, "themes": [], "overrides": {}}, [f"{path.relative_to(root)}: missing"]
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        return {"version": 1, "themes": [], "overrides": {}}, [
            f"{path.relative_to(root)}: invalid JSON: {error}"
        ]
    return payload, []


def theme_adjacency(nodes: list[dict], edges: list[dict]) -> dict[str, list[tuple[str, str]]]:
    adjacency: dict[str, list[tuple[str, str]]] = {node["id"]: [] for node in nodes}
    for edge in edges:
        if edge["type"] == "references" or edge["type"] not in THEME_RELATION_WEIGHTS:
            continue
        if edge["source"] not in adjacency or edge["target"] not in adjacency:
            continue
        adjacency[edge["source"]].append((edge["target"], edge["type"]))
        adjacency[edge["target"]].append((edge["source"], edge["type"]))
    return adjacency


def nearest_seed_theme(
    start: str,
    adjacency: dict[str, list[tuple[str, str]]],
    seed_themes: dict[str, str],
    theme_order: dict[str, int],
) -> tuple[str | None, int]:
    seen = {start}
    frontier = [start]
    for depth in range(1, 6):
        next_frontier: set[str] = set()
        matches: list[tuple[int, str]] = []
        for current in sorted(frontier):
            for neighbor, _ in sorted(adjacency.get(current, [])):
                if neighbor in seen:
                    continue
                next_frontier.add(neighbor)
                if neighbor in seed_themes:
                    theme_id = seed_themes[neighbor]
                    matches.append((theme_order[theme_id], theme_id))
        seen.update(next_frontier)
        if matches:
            _, best_theme = min(matches)
            return best_theme, depth
        frontier = sorted(next_frontier)
        if not frontier:
            break
    return None, 0


def assign_themes(
    graph_nodes: list[dict],
    graph_edges: list[dict],
    taxonomy: dict,
) -> tuple[list[dict], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    nodes_by_id = {node["id"]: node for node in graph_nodes}
    raw_themes = taxonomy.get("themes")
    if not isinstance(raw_themes, list) or not raw_themes:
        return [], ["config/theme-taxonomy.json: themes must be a non-empty list"], warnings

    themes: list[dict] = []
    theme_ids: set[str] = set()
    seed_themes: dict[str, str] = {}
    for index, raw_theme in enumerate(raw_themes):
        if not isinstance(raw_theme, dict):
            errors.append(f"config/theme-taxonomy.json: theme {index + 1} must be an object")
            continue
        theme_id = raw_theme.get("id")
        title = raw_theme.get("title")
        definition = raw_theme.get("definition")
        seeds = raw_theme.get("seeds", [])
        position = raw_theme.get("position", {})
        if not theme_id or not title or not definition:
            errors.append(f"config/theme-taxonomy.json: theme {index + 1} missing id, title, or definition")
            continue
        if theme_id in theme_ids:
            errors.append(f"config/theme-taxonomy.json: duplicate theme id {theme_id}")
            continue
        if not isinstance(seeds, list) or not seeds:
            errors.append(f"config/theme-taxonomy.json: theme {theme_id} must define seeds")
        if (
            not isinstance(position, dict)
            or not isinstance(position.get("x"), (int, float))
            or not isinstance(position.get("y"), (int, float))
        ):
            errors.append(f"config/theme-taxonomy.json: theme {theme_id} has invalid position")
        theme_ids.add(theme_id)
        themes.append(
            {
                "id": theme_id,
                "title": title,
                "shortTitle": raw_theme.get("shortTitle", title),
                "definition": definition,
                "position": position,
                "seeds": seeds,
                "keywords": raw_theme.get("keywords", []),
                "order": index,
            }
        )
        for seed in seeds:
            if seed not in nodes_by_id:
                errors.append(f"config/theme-taxonomy.json: unknown seed node {seed}")
                continue
            if seed in seed_themes:
                errors.append(f"config/theme-taxonomy.json: seed {seed} belongs to multiple themes")
                continue
            seed_themes[seed] = theme_id

    theme_order = {theme["id"]: theme["order"] for theme in themes}
    overrides = taxonomy.get("overrides", {})
    if not isinstance(overrides, dict):
        errors.append("config/theme-taxonomy.json: overrides must be an object")
        overrides = {}
    for node_id, theme_id in overrides.items():
        if node_id not in nodes_by_id:
            errors.append(f"config/theme-taxonomy.json: override references unknown node {node_id}")
        if theme_id not in theme_ids:
            errors.append(f"config/theme-taxonomy.json: override references unknown theme {theme_id}")

    adjacency = theme_adjacency(graph_nodes, graph_edges)
    seed_ids_by_theme = {
        theme["id"]: set(theme["seeds"])
        for theme in themes
    }

    for node in graph_nodes:
        if node["type"] == "system":
            continue
        scores = {theme["id"]: 0.0 for theme in themes}
        reasons: dict[str, list[dict]] = {theme["id"]: [] for theme in themes}
        direct_semantic_themes: set[str] = set()

        if node["id"] in seed_themes:
            theme_id = seed_themes[node["id"]]
            scores[theme_id] = 100.0
            reasons[theme_id].append({"kind": "seed", "node": node["id"], "score": 100.0})

        for neighbor, relation in adjacency.get(node["id"], []):
            relation_weight = THEME_RELATION_WEIGHTS[relation]
            for theme in themes:
                if neighbor in seed_ids_by_theme[theme["id"]]:
                    scores[theme["id"]] += relation_weight
                    reasons[theme["id"]].append(
                        {
                            "kind": "relation",
                            "node": neighbor,
                            "relation": relation,
                            "score": round(relation_weight, 3),
                        }
                    )
                    if relation in THEME_SEMANTIC_RELATIONS:
                        direct_semantic_themes.add(theme["id"])
            for second_neighbor, second_relation in adjacency.get(neighbor, []):
                if second_neighbor == node["id"]:
                    continue
                for theme in themes:
                    if second_neighbor not in seed_ids_by_theme[theme["id"]]:
                        continue
                    second_score = min(
                        relation_weight,
                        THEME_RELATION_WEIGHTS[second_relation],
                    ) * 0.35
                    scores[theme["id"]] += second_score
                    reasons[theme["id"]].append(
                        {
                            "kind": "two-hop",
                            "node": second_neighbor,
                            "via": neighbor,
                            "relation": second_relation,
                            "score": round(second_score, 3),
                        }
                    )

        if max(scores.values(), default=0) == 0:
            haystack = " ".join(
                [
                    node.get("title", ""),
                    node.get("summary", ""),
                    " ".join(node.get("metadata", {}).values()),
                ]
            ).casefold()
            for theme in themes:
                keyword_score = sum(
                    1.0
                    for keyword in theme.get("keywords", [])
                    if str(keyword).casefold() in haystack
                )
                if keyword_score:
                    scores[theme["id"]] = keyword_score
                    reasons[theme["id"]].append(
                        {"kind": "keyword-fallback", "score": keyword_score}
                    )

        if max(scores.values(), default=0) == 0:
            nearest_theme, depth = nearest_seed_theme(
                node["id"],
                adjacency,
                seed_themes,
                theme_order,
            )
            if nearest_theme:
                scores[nearest_theme] = max(0.1, 1 / depth)
                reasons[nearest_theme].append(
                    {"kind": "nearest-seed-fallback", "hops": depth, "score": round(1 / depth, 3)}
                )

        normalized_scores = {
            theme_id: round(score, 6)
            for theme_id, score in scores.items()
        }
        ordered_scores = sorted(
            normalized_scores.items(),
            key=lambda item: (-item[1], theme_order[item[0]]),
        )
        primary = overrides.get(node["id"])
        if primary:
            reasons[primary].insert(0, {"kind": "override", "score": 100.0})
        elif ordered_scores and ordered_scores[0][1] > 0:
            primary = ordered_scores[0][0]
        else:
            primary = None

        if not primary:
            warnings.append(f"{node['path']}: node has no semantic theme assignment")
            node["theme"] = {"primary": None, "secondary": [], "basis": []}
            continue

        primary_score = normalized_scores.get(primary, 0.0)
        if primary_score <= 0:
            primary_score = ordered_scores[0][1] if ordered_scores else 1.0
        secondary = [
            theme_id
            for theme_id, score in ordered_scores
            if theme_id != primary
            and score > 0
            and score >= primary_score * 0.6
            and theme_id in direct_semantic_themes
        ][:2]
        basis = sorted(
            reasons.get(primary, []),
            key=lambda item: (-float(item.get("score", 0)), str(item.get("node", ""))),
        )[:3]
        node["theme"] = {
            "primary": primary,
            "secondary": secondary,
            "basis": basis,
        }

    for node in graph_nodes:
        if node["type"] != "event":
            continue
        metadata = node.setdefault("metadata", {})
        proof = metadata.get("commercial_proof", "unproven")
        if proof not in COMMERCIAL_PROOF_VALUES:
            errors.append(
                f"{node['path']}: invalid commercial_proof {proof}; "
                f"expected {', '.join(sorted(COMMERCIAL_PROOF_VALUES))}"
            )
            proof = "unproven"
        metadata["commercial_proof"] = proof
        raw_signals = metadata.get("commercial_signals", "")
        signals = [signal.strip() for signal in raw_signals.split(",") if signal.strip()]
        invalid_signals = sorted(set(signals) - COMMERCIAL_SIGNAL_VALUES)
        if invalid_signals:
            errors.append(
                f"{node['path']}: invalid commercial_signals {', '.join(invalid_signals)}"
            )
        metadata["commercial_signals"] = ", ".join(signals)

    nodes_by_theme: dict[str, list[dict]] = {
        theme["id"]: [
            node
            for node in graph_nodes
            if node.get("theme", {}).get("primary") == theme["id"]
        ]
        for theme in themes
    }
    for theme in themes:
        members = nodes_by_theme[theme["id"]]
        events = [node for node in members if node["type"] == "event"]
        stage_counts = {
            stage: sum(1 for node in events if node["metadata"].get("stage") == stage)
            for stage in STAGE_ORDER
        }
        credible_events = [
            node
            for node in events
            if node["metadata"].get("confidence") in {"medium", "high"}
        ]
        maturity = max(
            (node["metadata"].get("stage", "announcement") for node in credible_events),
            key=lambda stage: STAGE_ORDER.get(stage, -1),
            default="announcement",
        )
        commercial_proof = max(
            (node["metadata"].get("commercial_proof", "unproven") for node in events),
            key=lambda proof: COMMERCIAL_PROOF_ORDER.get(proof, -1),
            default="unproven",
        )
        latest_date = max(
            (node["metadata"].get("date", "") for node in events),
            default="",
        )
        anchor = next(
            (
                nodes_by_id[seed]
                for seed in theme["seeds"]
                if seed in nodes_by_id and nodes_by_id[seed]["type"] == "concept"
            ),
            None,
        )
        strongest_event = max(
            events,
            key=lambda node: (
                COMMERCIAL_PROOF_ORDER.get(node["metadata"].get("commercial_proof", "unproven"), 0),
                STAGE_ORDER.get(node["metadata"].get("stage", "announcement"), 0),
                CONFIDENCE_ORDER.get(node["metadata"].get("confidence", "low"), 0),
                node["metadata"].get("date", ""),
                node["title"],
            ),
            default=None,
        )
        synthesis = next(
            (
                nodes_by_id[seed]
                for seed in theme["seeds"]
                if seed in nodes_by_id and nodes_by_id[seed]["type"] in {"thesis", "query"}
            ),
            None,
        )
        representative_ids: list[str] = []
        for representative in (anchor, strongest_event, synthesis):
            if representative and representative["id"] not in representative_ids:
                representative_ids.append(representative["id"])
        theme["summary"] = {
            "memberCount": len(members),
            "eventCount": len(events),
            "stageCounts": stage_counts,
            "evidenceMaturity": maturity,
            "commercialProof": commercial_proof,
            "latestEventDate": latest_date or None,
            "anchorConceptId": anchor["id"] if anchor else None,
            "strongestEventId": strongest_event["id"] if strongest_event else None,
            "synthesisId": synthesis["id"] if synthesis else None,
            "representativeNodeIds": representative_ids[:3],
        }

    return themes, errors, warnings


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
    taxonomy, taxonomy_errors = load_theme_taxonomy(root)
    errors.extend(taxonomy_errors)
    themes, theme_errors, theme_warnings = assign_themes(nodes, edges, taxonomy)
    errors.extend(theme_errors)
    warnings.extend(theme_warnings)
    graph = {
        "generatedAt": date.today().isoformat(),
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "relationTypes": sorted({edge["type"] for edge in edges}),
        "themeVersion": taxonomy.get("version", 1),
        "themes": themes,
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
    script_output = (
        (root / args.script_output).resolve()
        if args.script_output
        else output.with_name(f"{output.stem}-data.js")
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    script_output.parent.mkdir(parents=True, exist_ok=True)
    graph_json = json.dumps(graph, indent=2, ensure_ascii=False)
    output.write_text(graph_json + "\n", encoding="utf-8")
    script_json = graph_json.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    script_output.write_text(
        "window.AGENTIC_EVOLUTION_GRAPH = " + script_json + ";\n",
        encoding="utf-8",
    )
    print(
        f"Built {graph['nodeCount']} nodes and {graph['edgeCount']} edges -> "
        f"{output} + {script_output}"
    )
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
    build.add_argument(
        "--script-output",
        help="JavaScript graph-data output (defaults beside --output)",
    )
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
