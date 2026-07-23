#!/usr/bin/env python3
"""Extract routing-only operational-evidence dimensions from a passage."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ONTOLOGY = ROOT / "config/evidence-ontology.json"
NUMBER = re.compile(
    r"(?<!\w)\d+(?:[.,]\d+)*(?:\s*(?:%|million|billion|thousand|hours?|engineers?))?(?!\w)",
    re.I,
)


def load_ontology(path: Path | None = None) -> dict:
    return json.loads((path or DEFAULT_ONTOLOGY).read_text(encoding="utf-8"))


def matched_terms(text: str, terms: list[str]) -> list[str]:
    haystack = re.sub(r"[^a-z0-9%]+", " ", text.casefold()).strip()
    matches: list[str] = []
    for term in terms:
        normalized = re.sub(r"[^a-z0-9%]+", " ", term.casefold()).strip()
        if not any(character.isalnum() for character in normalized):
            present = normalized in haystack
        else:
            pattern = r"(?<![a-z0-9])" + re.escape(normalized).replace(r"\ ", r"\s+") + r"(?![a-z0-9])"
            present = bool(re.search(pattern, haystack))
        if present:
            matches.append(term)
    return matches


def has_numeric_claim(text: str) -> bool:
    for match in NUMBER.finditer(text):
        value = match.group(0).strip()
        if re.fullmatch(r"(?:19|20)\d{2}", value):
            continue
        return True
    return False


def extract_evidence_contract(
    text: str,
    *,
    ontology: dict | None = None,
    source_role: str = "discovery-passage",
    named_operator: str | None = None,
    headline_only: bool = False,
) -> dict:
    """Return deterministic review routing; never a truth or adoption decision."""
    model = ontology or load_ontology()
    if source_role not in model["source_roles"]:
        raise ValueError(f"Unknown source role: {source_role}")
    dimension_hits = {
        name: matched_terms(text, terms)
        for name, terms in model["dimensions"].items()
    }
    if named_operator:
        dimension_hits["named_operator"] = [named_operator]
    observed = [name for name, hits in dimension_hits.items() if hits]

    risk_hits = {
        name: matched_terms(text, terms)
        for name, terms in model["risk_flags"].items()
    }
    risk_flags = [name for name, hits in risk_hits.items() if hits]
    maturity_hits = {
        stage: matched_terms(text, terms)
        for stage, terms in model["maturity"].items()
    }
    numeric = has_numeric_claim(text)
    observed_set = set(observed)
    scaled_basis = {
        "state_change",
        "live_environment",
        "task_volume",
        "time_window",
    } <= observed_set and numeric
    if scaled_basis:
        maturity_hint = "scaled"
    elif {"state_change", "live_environment"} <= observed_set:
        maturity_hint = "production"
    elif maturity_hits["pilot"]:
        maturity_hint = "pilot"
    elif maturity_hits["announcement"]:
        maturity_hint = "announcement"
    else:
        maturity_hint = "unknown"
    if "future_intent" in risk_flags and "state_change" not in observed_set:
        maturity_hint = "announcement"
    core = model["admission"]["core_dimensions"]
    missing_core = [name for name in core if name not in observed]
    scaled = model["admission"]["scaled_dimensions"]
    missing_scaled = [name for name in scaled if name not in observed]

    if headline_only:
        if {"future_intent", "announcement_only"} & set(risk_flags):
            route = "announcement_watchlist"
        elif "agent_action" in observed_set or "live_environment" in observed_set:
            route = "operational_watchlist"
        else:
            route = "discovery_only"
    elif "future_intent" in risk_flags and "state_change" not in observed_set:
        route = "announcement_watchlist"
    elif "rebranding_risk" in risk_flags and not {"agent_action", "state_change"} <= observed_set:
        route = "reject_rebranding"
    elif (
        {"future_intent", "announcement_only"} & set(risk_flags)
        and "live_environment" not in observed
    ):
        route = "announcement_watchlist"
    elif not missing_core and "named_operator" in observed:
        route = "primary_verification_candidate"
    elif "agent_action" in observed or "live_environment" in observed:
        route = "operational_watchlist"
    else:
        route = "discovery_only"

    return {
        "ontology_version": model["version"],
        "routing_only": True,
        "headline_only": headline_only,
        "source_role": source_role,
        "admission_route": route,
        "maturity_hint": maturity_hint,
        "numeric_claim_present": numeric,
        "observed_dimensions": observed,
        "missing_core_dimensions": missing_core,
        "missing_scaled_dimensions": missing_scaled,
        "dimension_matches": {name: hits for name, hits in dimension_hits.items() if hits},
        "maturity_matches": {stage: hits for stage, hits in maturity_hits.items() if hits},
        "risk_flags": risk_flags,
        "risk_matches": {name: hits for name, hits in risk_hits.items() if hits},
        "notice": model["routing_notice"],
    }


def parser() -> argparse.ArgumentParser:
    ontology = load_ontology()
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("path", nargs="?", type=Path, help="Passage file; omit to read stdin")
    cli.add_argument("--ontology", type=Path, default=DEFAULT_ONTOLOGY)
    cli.add_argument("--source-role", choices=ontology["source_roles"], default="discovery-passage")
    cli.add_argument("--operator")
    return cli


def main() -> int:
    args = parser().parse_args()
    text = args.path.read_text(encoding="utf-8") if args.path else sys.stdin.read()
    if not text.strip():
        raise SystemExit("No passage text supplied")
    result = extract_evidence_contract(
        text,
        ontology=load_ontology(args.ontology),
        source_role=args.source_role,
        named_operator=args.operator,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
