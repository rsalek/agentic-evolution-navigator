---
id: concept-verified-agent-traffic
type: concept
title: Verified Agent Traffic
status: active
confidence: medium
updated: 2026-07-21
---

# Verified Agent Traffic

Machine-originated requests whose agent identity, authorization, purpose, and policy can be distinguished from malicious or unidentified automation.

## Observable signals

- Share of traffic carrying a verifiable agent identity.
- Conversion, task completion, serving cost, and fraud rate by agent class.
- Adoption of agent-specific access, pricing, attribution, and policy controls.

## Current graph evidence

- Cloudflare presents Web Bot Auth as cryptographic identity and flow-specific authorization for autonomous commerce, but the event is announcement/readiness evidence with no live traffic metric.
- Mastercard's Agent Pay architecture adds agent identity, transparency, issuer visibility, fraud, safety, and security controls to payment flows; adoption and traffic share remain unquantified.

## Relations

- `depends-on` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `monetizes` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
