import unittest

from scripts.evidence_contract import extract_evidence_contract


class EvidenceContractTests(unittest.TestCase):
    def test_routes_concrete_live_workflow_for_primary_verification(self):
        result = extract_evidence_contract(
            "Falabella has operated a live customer-service workflow since October. "
            "It resolved 65% of 115,000 inbound queries without human intervention in Q4.",
            source_role="primary-operator",
            named_operator="Falabella",
        )
        self.assertEqual(result["admission_route"], "primary_verification_candidate")
        self.assertEqual(result["maturity_hint"], "scaled")
        self.assertTrue(result["numeric_claim_present"])
        self.assertIn("state_change", result["observed_dimensions"])
        self.assertIn("denominator", result["observed_dimensions"])
        self.assertTrue(result["routing_only"])

    def test_announcement_without_live_state_change_stays_watchlist(self):
        result = extract_evidence_contract(
            "Vendor announces a partnership and plans to launch an AI agent roadmap.",
            named_operator="Vendor",
        )
        self.assertEqual(result["admission_route"], "announcement_watchlist")
        self.assertEqual(result["maturity_hint"], "announcement")
        self.assertIn("future_intent", result["risk_flags"])

    def test_ai_powering_without_action_or_state_change_is_rebranding_risk(self):
        result = extract_evidence_contract(
            "Company introduces an AI-powered assistant for better experiences.",
            named_operator="Company",
        )
        self.assertEqual(result["admission_route"], "reject_rebranding")
        self.assertIn("rebranding_risk", result["risk_flags"])

    def test_missing_dimensions_are_explicit(self):
        result = extract_evidence_contract("An agent is live in production.", named_operator="Example")
        self.assertIn("agent_action", result["missing_core_dimensions"])
        self.assertIn("state_change", result["missing_core_dimensions"])
        self.assertEqual(result["admission_route"], "operational_watchlist")

    def test_substrings_do_not_create_false_live_or_system_matches(self):
        result = extract_evidence_contract(
            "Delivery Hero reports approved applications in 2026.",
            named_operator="Delivery Hero",
        )
        self.assertNotIn("live_environment", result["observed_dimensions"])
        self.assertNotIn("system_or_record", result["observed_dimensions"])
        self.assertFalse(result["numeric_claim_present"])

    def test_future_announcement_cannot_be_scaled_from_capability_terms(self):
        result = extract_evidence_contract(
            "Company will deploy a live enterprise-wide AI agent.",
            named_operator="Company",
        )
        self.assertEqual(result["maturity_hint"], "announcement")
        self.assertEqual(result["admission_route"], "announcement_watchlist")

    def test_headline_only_contract_never_rejects_on_sparse_rebranding_terms(self):
        result = extract_evidence_contract(
            "Company launches AI-powered assistant",
            source_role="aggregator-headline",
            headline_only=True,
        )
        self.assertEqual(result["admission_route"], "announcement_watchlist")
        self.assertTrue(result["headline_only"])

    def test_source_role_is_validated(self):
        with self.assertRaises(ValueError):
            extract_evidence_contract("text", source_role="primary-report")


if __name__ == "__main__":
    unittest.main()
