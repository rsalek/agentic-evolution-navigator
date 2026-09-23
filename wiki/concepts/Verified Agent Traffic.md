---
id: concept-verified-agent-traffic
type: concept
title: Verified Agent Traffic
status: active
confidence: medium
updated: 2026-09-22
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
- Fastly reports AI requests grew approximately 30% from January through May 2026, 6.5 times faster than human traffic, while broader autonomous machine-to-machine traffic approached half of requests. Its Skyfire integration adds verified identity and payment-backed credentials at the edge, but the category is broader than agents and paid deployment or revenue remains unproven.
- Cisco's controlled Open Deep Research task benchmark reports up to 450% more total network traffic for an agent-performed task than a human equivalent, with approximately 70% of the agent-triggered traffic labeled AI inference. The result is a workflow-specific resource-intensity measurement, not a market-wide agent-traffic share, identity-adoption measure, or revenue signal.
- OtterlyAI's Agent Analytics classifies on-demand AI fetchers, search indexes, and training scrapers from customer web-server logs. Its paid Standard and Premium plans publish 200,000 and 1 million monthly event capacities respectively, creating an early priced monitoring tollbooth; actual paid usage, connected-domain count, attach, retention, and feature-attributed revenue remain undisclosed.
- Dageno's comparison surfaces a broader paid discovery-and-delivery layer: Peec AI reports AI-search customer growth and AI-originated funnel attribution; Profound sells usage-metered Agents and enterprise answer-engine analytics; Gauge publishes a $599/month agent-led workflow; AthenaHQ reports large monitored-page/source telemetry; and Scrunch built a CDN-layer AI-ready delivery surface before its Sitecore acquisition. These are adjacent visibility and serving tollbooths, not proof of agent-payment volume.
- Alipay AI Pay reports more than 300 million agent-payment transactions and more than 100 million users, but does not disclose the observation window, active-agent denominator, identity coverage, or agent-attributed revenue. Coinbase reports x402 concentration within its defined on-chain agentic-finance category, but not absolute traffic or agent count.
- AWS WAF's AI traffic monetization capability combines agent-policy classification, x402 payment proof, scoped access tokens, and revenue analytics at the edge, but does not disclose live publisher adoption, paid traffic, or realized revenue.
- TRM Labs demonstrates the attribution problem directly: $52.7 million of x402 settlement value becomes $25.62 million after commerce screens, and only 0.6% to 7.5% of the remainder appears agentic under permissive and strict heuristics. On-chain settlement alone cannot distinguish an agent from scheduled scripts, tests, or conventional automation.
- DataDome's 12-month study reports 52.7 billion AI-agent and LLM-crawler requests across more than 75,000 customer sites, including 605.6 million H1 requests to high-risk endpoints. Its Q2 report says 54% of customers adopted agent-trust policies. The telemetry establishes repeated classification and policy use inside a commercial platform, but combines action agents with crawlers and does not disclose paid attach, outcomes, or agent-specific revenue.

## Relations

- `depends-on` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `monetizes` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `references` [[wiki/events/2026-07-28 Salesforce reports agentic search becomes first commerce journey step|Salesforce reports agentic search becomes first commerce journey step]]
- `references` [[wiki/events/2026-08-04 Cloudflare announces Wallets for agentic commerce|Cloudflare announces Wallets for agentic commerce]]
- `references` [[wiki/events/2026-08-06 Cloudflare introduces Kitesurf agent-first browser|Cloudflare introduces Kitesurf agent-first browser]]
- `references` [[wiki/events/2026-08-07 Cloudflare reports scaled Precursor monitoring and hybrid agentic traffic|Cloudflare reports scaled Precursor monitoring and hybrid agentic traffic]]
- `references` [[wiki/events/2026-06-10 Fastly reports AI request growth and Skyfire agent-commerce integration|Fastly reports AI request growth and Skyfire agent-commerce integration]]
- `references` [[wiki/events/2026-05-21 Cisco measures 450 percent more network traffic per agent task|Cisco measures 450 percent more network traffic per agent task]]
- `references` [[wiki/events/2026-08-13 OtterlyAI prices Agent Analytics within paid monitoring plans|OtterlyAI prices Agent Analytics within paid monitoring plans]]
- `references` [[wiki/queries/Dageno-surfaced private agentic company watchlist|Dageno-surfaced private agentic company watchlist]]
- `references` [[wiki/events/2026-07-31 Alipay AI Pay reports 300 million agent payments|Alipay AI Pay reports 300 million agent payments]]
- `references` [[wiki/events/2026-07-30 Coinbase reports x402 concentration in on-chain agentic finance|Coinbase reports x402 concentration in on-chain agentic finance]]
- `references` [[wiki/events/2026-06-15 AWS WAF announces AI traffic monetization|AWS WAF announces AI traffic monetization]]
- `references` [[wiki/events/2026-09-09 TRM Labs bounds likely agentic x402 payment value|TRM Labs bounds likely agentic x402 payment value]]
- `references` [[wiki/events/2026-09-22 DataDome measures 52.7 billion AI requests and policy adoption|DataDome measures 52.7 billion AI requests and policy adoption]]
