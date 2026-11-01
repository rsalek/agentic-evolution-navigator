---
id: event-cloudflare-agent-traffic-growth-2026-09-30
type: event
title: Cloudflare reports 1700 percent agent-traffic growth
date: 2026-09-30
status: verified
confidence: high
stage: scaled
industry: web-infrastructure
layer: traffic-monetization
commercial_proof: unproven
updated: 2026-10-01
---

# Cloudflare reports 1700 percent agent-traffic growth

Cloudflare reported that daily requests from AI agents on its network grew by more than 1,700% over the prior year. The company separately reported more than 500 billion verified bot requests each week and said fewer than 1% of Cloudflare sites block search crawlers while 17% block training crawlers. These measures establish scaled traffic classification and policy activity on Cloudflare's network, but the post does not disclose the starting level, absolute agent-request count, agent share of total traffic, unique agents, or customer concentration.

Cloudflare also described two beta monetization paths. Pay Per Use lets participating buyers report content use so Cloudflare can bill the buyer and pay the publisher. Monetization Gateway lets eligible U.S. customers set per-request, per-query, or per-token prices and return an x402 payment request. Cloudflare said thousands of sellers joined the waitlist and that AI Gateway is its first Monetization Gateway customer. The company called both products bets shaped by real customers and real transactions, but did not identify an external paying customer or disclose paid-request volume, value, fees, revenue, retention, or margin.

## Commercial evidence gate

This is scaled traffic and monetization-readiness evidence, not a monetization green shoot.

- Payer: intended AI companies or agent operators pay publishers and service providers. Cloudflare identifies no external paying customer.
- Toll-gate mechanism: verified identity, metering, fixed or capped usage pricing, x402 settlement, billing, and publisher payouts.
- Revenue bridge: the products can route payments to sellers, but Cloudflare does not disclose its own price, take rate, revenue, or contracted value.
- Measured period: agent-request growth covers the prior year; verified bot requests use a weekly period. The two populations are not reported as equivalent.
- Baseline or denominator: the 1,700% growth rate has no starting request count or agent share. The 500 billion weekly figure covers verified bots, not only agents.
- Repeatability: the company refers to real transactions and recurring weekly traffic, but provides no paid-transaction series, active buyers, active sellers, or renewal measure.
- Attribution quality: primary operator telemetry supports the traffic measures. Commercial attribution remains weak because product-specific economics are absent.
- Still unproven: paid customer count, repeat paid requests, transaction value, Cloudflare fees, incremental revenue, attach, renewal, serving margin, and publisher outcomes.

## Counterevidence

Cloudflare says human traffic fell by as much as 40% in less than one year in some heavily crawled categories and that revenue per request is falling while bandwidth, compute, and origin costs rise. This supports the addressability of agent traffic while challenging the assumption that traffic growth already produces positive economics.

## Evidence

- [The Internet has a second audience](https://blog.cloudflare.com/agentic-web/) - primary Cloudflare operator telemetry and product disclosure.

## Relations

- `announced-by` [[wiki/entities/Cloudflare|Cloudflare]]
- `demonstrates` [[wiki/concepts/Verified Agent Traffic|Verified Agent Traffic]]
- `demonstrates` [[wiki/concepts/Agentic Payments|Agentic Payments]]
- `measured-by` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `constrained-by` [[wiki/concepts/Measurement Surface Bias|Measurement Surface Bias]]
- `updates` [[wiki/events/2026-07-01 Cloudflare announces Monetization Gateway for x402|Cloudflare announces Monetization Gateway for x402]]
- `updates` [[wiki/events/2026-08-07 Cloudflare reports scaled Precursor monitoring and hybrid agentic traffic|Cloudflare reports scaled Precursor monitoring and hybrid agentic traffic]]
- `supports` [[wiki/theses/Agent-originated traffic is becoming an addressable market|Agent-originated traffic is becoming an addressable market]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]

## Open questions

- How many external buyers and sellers complete repeat paid requests?
- What are the paid-request count, value, Cloudflare fee, take rate, and settlement-failure rate?
- Does paid agent access offset serving costs and lost human-referral revenue for publishers?
