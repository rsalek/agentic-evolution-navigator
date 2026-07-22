---
id: concept-agentic-payments
type: concept
title: Agentic Payments
status: active
confidence: medium
updated: 2026-07-22
---

# Agentic Payments

Payments initiated or completed by software agents under delegated authority, policy, and spending constraints.

## Observable signals

- Live transactions rather than protocol announcements.
- Transaction count, value, repeat rate, active agents, active merchants, and exception rate.
- Merchant acceptance, dispute handling, and delegated authorization.

## Current graph evidence

- Mastercard reported a first Agent Pay transaction with named issuers and a merchant partner, establishing production evidence without proving repeat volume.
- Mastercard later described broad U.S. card enablement with tokenized identity, issuer visibility, fraud, safety, and security controls; this is readiness evidence rather than measured scale.
- x402's homepage displayed 75.41 million transactions and USD 24.24 million in 30-day volume, establishing scaled protocol activity without disclosing the AI-agent share.
- The operational-deployments query keeps the missing standalone agent-payment volume, repeat-rate, merchant-breadth, and exception-rate evidence explicit.

## Relations

- `depends-on` [[wiki/concepts/Protocol Standardization|Protocol Standardization]]
- `depends-on` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `monetizes` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
