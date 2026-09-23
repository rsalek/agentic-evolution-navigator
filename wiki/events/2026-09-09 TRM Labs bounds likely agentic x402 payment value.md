---
id: event-trm-x402-agent-payment-attribution-2026-09-09
type: event
title: TRM Labs bounds likely agentic x402 payment value
date: 2026-09-09
status: verified
confidence: medium
stage: production
industry: payments
layer: protocol
commercial_proof: emerging
commercial_signals:
  - repeat-transactions
  - demand
updated: 2026-09-10
---

# TRM Labs bounds likely agentic x402 payment value

TRM Labs identified approximately **$52.7 million across 198.9 million x402 settlement transactions** mediated by known facilitators on Base, Solana, and Polygon from May 2025 through its September 2026 analysis. After removing self-payments, concentrated bulk flows, and sellers with fewer than 10 distinct buyers, **$25.62 million** remained as screened commerce. TRM's permissive and strict attribution models classify only **0.6% to 7.5%** of that screened value as plausibly agentic.

The strict model requires an address to sustain the pattern across months and either appear in the ERC-8004 agent registry or pay more than one seller. TRM reports that the inferred number of transacting agents peaked around mid-2026 and then fell, while likely agentic value remained only about **$5,000 to $11,000 per month**. Across the full unfiltered period, **99.6%** of value settled in USDC.

## Commercial evidence gate

This is a low-scale, medium-confidence monetization green shoot for machine-paid services and strong counterevidence to headline x402 volume claims.

- Company/ecosystem: x402 services and facilitators, measured by TRM Labs; no single merchant or facilitator receives the whole value.
- Payer: software-controlled wallets or their human and business operators; exact owner identity is usually unverified.
- Customer or market-share evidence: the activity persists across months, but TRM does not publish exact active-agent or merchant counts. One dominant payment contract and earlier speculative activity indicate material concentration.
- Toll-gate mechanism: a service returns HTTP 402 with a per-call price, the payer retries with signed authorization, and a facilitator verifies and broadcasts settlement. Coinbase separately publishes a $0.001 facilitator charge after a monthly free tier, but TRM does not measure realized facilitator fees.
- Revenue or economic bridge: repeated value reaches machine-readable, pay-per-call services, creating gross transaction value for sellers and potential facilitator fees. No merchant revenue, protocol fee revenue, take rate, cost, or margin is disclosed.
- Measured period: May 2025 through September 9, 2026 for aggregate settlement; monthly agentic estimates cover 2026.
- Baseline and repeatability: 198.9 million settlements and $52.7 million are the broad denominator; sustained multi-month behavior is required by the strict attribution screen.
- Attribution quality: medium-to-low for agent identity because agency cannot be read directly on-chain. The range is modelled, and the method may exclude legitimate single-purpose agents while still admitting sophisticated scripts.
- Still unproven: exact active agents, repeat payers, active merchants and services, transaction counts within the agentic subset, realized fees and revenue, refunds, disputes, authorization quality, retention, and margin.
- Strongest falsifier: independently replicated analysis finds that most candidate-agent activity is conventional automation, self-dealing, or concentrated testing and that agent-attributed monthly value does not grow.
- Next verification trigger: a reproducible monthly series reporting verified active agents, payers, merchants, transaction count and value, concentration, facilitator fees, disputes, and retained cohorts.

## Why it matters

The study closes a major attribution gap in the graph. Large protocol counters demonstrate machine-compatible settlement, but they substantially overstate identifiable agent commerce. The evidence simultaneously supports live production use and challenges claims that x402 has already reached broad commercial agent adoption.

## Evidence

- [TRM Labs x402 agent-payment analysis](https://www.trmlabs.com/trm-tech-blog/whos-actually-paying-measuring-ai-agent-payments-onchain) - primary blockchain-intelligence analysis with disclosed heuristic screens and limitations.

## Relations

- `announced-by` [[wiki/entities/TRM Labs|TRM Labs]]
- `involves` [[wiki/entities/x402 Foundation|x402 Foundation]]
- `demonstrates` [[wiki/concepts/Agentic Payments|Agentic Payments]]
- `measured-by` [[wiki/concepts/Verified Agent Traffic|Verified Agent Traffic]]
- `measured-by` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `supports` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
- `challenges` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
- `updates` [[wiki/events/2026-07-22 x402 reports 75 million monthly transactions|x402 reports 75 million monthly transactions]]
- `updates` [[wiki/events/2026-07-30 Coinbase reports x402 concentration in on-chain agentic finance|Coinbase reports x402 concentration in on-chain agentic finance]]
