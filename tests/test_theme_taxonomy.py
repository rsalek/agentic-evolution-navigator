import copy
import json
import unittest
from pathlib import Path

from scripts.graph import assign_themes, load_theme_taxonomy


ROOT = Path(__file__).resolve().parents[1]


class ThemeTaxonomyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.graph = json.loads((ROOT / "docs" / "graph.json").read_text(encoding="utf-8"))
        cls.taxonomy, cls.taxonomy_errors = load_theme_taxonomy(ROOT)

    def test_current_graph_has_complete_theme_coverage(self):
        self.assertEqual(self.taxonomy_errors, [])
        public_nodes = [node for node in self.graph["nodes"] if node["type"] != "system"]
        self.assertTrue(all(node["theme"]["primary"] for node in public_nodes))
        self.assertEqual(len(self.graph["themes"]), 7)

    def test_theme_summaries_expose_typed_representative_roles(self):
        nodes = {node["id"]: node for node in self.graph["nodes"]}
        for theme in self.graph["themes"]:
            summary = theme["summary"]
            anchor_id = summary["anchorConceptId"]
            event_id = summary["strongestEventId"]
            synthesis_id = summary["synthesisId"]
            self.assertIsNotNone(anchor_id)
            self.assertEqual(nodes[anchor_id]["type"], "concept")
            if event_id:
                self.assertEqual(nodes[event_id]["type"], "event")
            if synthesis_id:
                self.assertIn(nodes[synthesis_id]["type"], {"thesis", "query"})
            expected_ids = [
                node_id
                for node_id in (anchor_id, event_id, synthesis_id)
                if node_id is not None
            ]
            self.assertEqual(summary["representativeNodeIds"], expected_ids)

    def test_script_graph_matches_json_for_file_url_browsers(self):
        script = (ROOT / "docs" / "graph-data.js").read_text(encoding="utf-8")
        prefix = "window.AGENTIC_EVOLUTION_GRAPH = "
        self.assertTrue(script.startswith(prefix))
        self.assertTrue(script.endswith(";\n"))
        scripted_graph = json.loads(script[len(prefix) : -2])
        self.assertEqual(scripted_graph, self.graph)

    def test_assignments_do_not_depend_on_input_order(self):
        forward_nodes = copy.deepcopy(self.graph["nodes"])
        reverse_nodes = copy.deepcopy(list(reversed(self.graph["nodes"])))
        forward_edges = copy.deepcopy(self.graph["edges"])
        reverse_edges = copy.deepcopy(list(reversed(self.graph["edges"])))

        _, forward_errors, forward_warnings = assign_themes(
            forward_nodes, forward_edges, self.taxonomy
        )
        _, reverse_errors, reverse_warnings = assign_themes(
            reverse_nodes, reverse_edges, self.taxonomy
        )
        self.assertEqual(forward_errors, [])
        self.assertEqual(reverse_errors, [])
        self.assertEqual(forward_warnings, [])
        self.assertEqual(reverse_warnings, [])

        forward = {node["id"]: node["theme"]["primary"] for node in forward_nodes if node["type"] != "system"}
        reverse = {node["id"]: node["theme"]["primary"] for node in reverse_nodes if node["type"] != "system"}
        self.assertEqual(forward, reverse)


if __name__ == "__main__":
    unittest.main()
