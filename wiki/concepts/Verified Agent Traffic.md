---
id: concept-verified-agent-traffic
type: concept
title: Verified Agent Traffic
status: active
confidence: medium
updated: 2026-08-09
---

# Verified Agent Traffic

Machine-originated requests whose agent identity, authorization, purpose, and policy can be distinguished from malicious or unidentified automation.

## Observable signals

- Share of traffic carrying a verifiable agent identity.
- Conversion, task completion, serving cost, and fraud rate by agent class.
- Adoption of agent-specific access, pricing, attribution, and policy controls.

## Current graph evidence

- Cloudflare presents Web Bot Auth as cryptographic identity and flow-specific authorization for autonomous commerce, but the event is announcement/readiness evidence with no live traffic metric.
- Cloudflare's Wallets announcement adds optional `cloudflare.pay` agent handles and delegated spend controls, but does not disclose identity adoption, merchant acceptance, live traffic, or economics.
- Mastercard's Agent Pay architecture adds agent identity, transparency, issuer visibility, fraud, safety, and security controls to payment flows; adoption and traffic share remain unquantified.
- Salesforce reports AI-chat referral traffic growth of 150% to 428% year over year in every measured quarter across a platform-behaviour analysis covering more than 1.5 billion shoppers; the vendor surface, classification method, conversion, and economics remain open.
- Cloudflare's Kitesurf announcement adds agent-first browser infrastructure on Workers and claims lower CPU and memory overhead than Chromium for common agentic tasks, but reports no traffic volume, identity share, customer adoption, or economics.
- Cloudflare reports 206 million Precursor evaluation events across 73,438 zones in a 24-hour snapshot and says sessions can shift between human and agentic behavior; the event volume is scaled monitoring telemetry, not an agent-traffic denominator or revenue measure.

## Relations

- `depends-on` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `monetizes` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `references` [[wiki/events/2026-07-28 Salesforce reports agentic search becomes first commerce journey step|Salesforce reports agentic search becomes first commerce journey step]]
- `references` [[wiki/events/2026-08-04 Cloudflare announces Wallets for agentic commerce|Cloudflare announces Wallets for agentic commerce]]
- `references` [[wiki/events/2026-08-06 Cloudflare introduces Kitesurf agent-first browser|Cloudflare introduces Kitesurf agent-first browser]]
- `references` [[wiki/events/2026-08-07 Cloudflare reports scaled Precursor monitoring and hybrid agentic traffic|Cloudflare reports scaled Precursor monitoring and hybrid agentic traffic]]
