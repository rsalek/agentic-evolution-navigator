import unittest
from pathlib import Path

from scripts.collect_news import derive_graph_feeds, graph_match, merge_candidate, parse_feed


ROOT = Path(__file__).resolve().parents[1]


class GraphSearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.feeds, cls.plan, cls.messages = derive_graph_feeds(ROOT, 12)

    def test_search_plan_uses_graph_gaps_and_stress_tests(self):
        self.assertGreater(self.plan["graph"]["nodes"], 0)
        self.assertGreater(self.plan["graph"]["edges"], 0)
        self.assertEqual(self.plan["query_count"], 12)
        self.assertFalse(self.messages)
        kinds = {query["reason"]["kind"] for query in self.plan["queries"]}
        self.assertEqual(kinds, {"maturity-and-metric-gap", "thesis-stress-test"})

    def test_x402_query_keeps_the_protocol_anchor(self):
        _, all_plan, _ = derive_graph_feeds(ROOT, 100)
        query = next(item for item in all_plan["queries"] if "x402" in item["label"])
        self.assertIn('"x402 Foundation"', query["query"])

    def test_graph_match_prioritizes_metrics_and_known_entities(self):
        graph = {
            "nodes": [
                {"id": "entity-datadome", "title": "DataDome", "type": "entity"},
                {"id": "concept-verified-agent-traffic", "title": "Verified Agent Traffic", "type": "concept"},
                {"id": "thesis-addressable-traffic", "title": "Machine traffic becomes a market", "type": "thesis"},
            ],
            "edges": [
                {
                    "source": "entity-datadome",
                    "target": "concept-verified-agent-traffic",
                    "type": "measured-by",
                },
                {
                    "source": "concept-verified-agent-traffic",
                    "target": "thesis-addressable-traffic",
                    "type": "supports",
                }
            ],
        }
        result = graph_match(
            {
                "title": "DataDome reports AI agent traffic growth of 45% and new customers",
                "publisher": "DataDome",
                "matched_query_ids": ["graph-stage-datadome"],
                "query_targets": ["entity-datadome"],
            },
            graph,
        )
        self.assertGreater(result["graph_score"], 20)
        self.assertEqual(result["graph_matches"][0]["id"], "entity-datadome")
        self.assertEqual(result["graph_context"][0]["id"], "concept-verified-agent-traffic")
        self.assertIn("quantitative", result["signals"])
        self.assertIn("usage", result["signals"])
        self.assertTrue(result["evidence_contract"]["routing_only"])
        self.assertEqual(
            result["evidence_contract"]["source_role"],
            "aggregator-headline",
        )
        self.assertTrue(result["evidence_contract"]["headline_only"])

    def test_calendar_year_alone_is_not_a_quantitative_signal(self):
        result = graph_match(
            {"title": "Forrester releases an AI agents report for 2026", "publisher": "Forrester"},
            {"nodes": []},
        )
        self.assertNotIn("quantitative", result["signals"])
        self.assertIn(
            result["evidence_contract"]["admission_route"],
            {"discovery_only", "announcement_watchlist"},
        )

    def test_signal_matching_uses_word_boundaries(self):
        result = graph_match(
            {"title": "Delivery to Costco is unrestricted", "publisher": "Coffee Weekly"},
            {"nodes": []},
        )
        self.assertNotIn("production", result["signals"])
        self.assertNotIn("monetization", result["signals"])
        self.assertNotIn("counterevidence", result["signals"])

    def test_duplicate_feed_hits_preserve_query_lineage(self):
        candidate = {
            "feed_id": "agent-payments",
            "feed_ids": ["agent-payments"],
            "matched_query_ids": [],
            "query_targets": [],
        }
        merge_candidate(
            candidate,
            {
                "feed_id": "graph-stage-x402",
                "matched_query_ids": ["graph-stage-x402"],
                "query_targets": ["event-x402"],
            },
        )
        self.assertEqual(candidate["feed_ids"], ["agent-payments", "graph-stage-x402"])
        self.assertEqual(candidate["matched_query_ids"], ["graph-stage-x402"])
        self.assertEqual(candidate["query_targets"], ["event-x402"])

    def test_graph_feed_metadata_flows_into_parsed_candidates(self):
        payload = b"""<?xml version='1.0'?><rss><channel><item>
        <title>x402 reaches production</title>
        <link>https://example.com/x402</link>
        <guid>x402-production</guid>
        <pubDate>Mon, 20 Jul 2026 12:00:00 GMT</pubDate>
        </item></channel></rss>"""
        feed = {
            "id": "graph-stage-x402",
            "label": "Graph gap: x402",
            "origin": "graph",
            "target_ids": ["event-x402"],
        }
        candidate = parse_feed(payload, feed)[0]
        self.assertEqual(candidate["matched_query_ids"], ["graph-stage-x402"])
        self.assertEqual(candidate["query_targets"], ["event-x402"])


if __name__ == "__main__":
    unittest.main()
