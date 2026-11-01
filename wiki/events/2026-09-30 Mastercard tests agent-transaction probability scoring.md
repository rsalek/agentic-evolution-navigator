---
id: event-mastercard-agent-transaction-probability-score-2026-09-30
type: event
title: Mastercard tests agent-transaction probability scoring
date: 2026-09-30
status: verified
confidence: high
stage: pilot
industry: payments
layer: identity-risk-and-authorization
commercial_proof: unproven
updated: 2026-10-01
---

# Mastercard tests agent-transaction probability scoring

Mastercard announced an Agent Pay probability score that estimates whether an AI agent initiated a transaction. The service is rolling out for testing in the United States and is intended to help issuers approve legitimate agent-led purchases or route suspicious activity for additional review. Mastercard says it plans to add behavioral, merchant-risk, transaction-pattern, credential-risk, and consumer-propensity signals.

The service extends Mastercard's Agent Pay Trust Framework from identity, intent, controls, and execution into transaction intelligence. Mastercard also named Cloudflare and Skyfire as collaborators on web and payment signals and Know Your Agent verification. The release does not identify a testing issuer or merchant, measured transaction population, classification performance, approval lift, fraud reduction, pricing, paid deployment, or revenue.

## Commercial evidence gate

This is pilot-stage trust and authorization readiness, not a monetization green shoot.

- Payer: intended financial institutions and merchants. Mastercard names no paying customer for the score.
- Toll-gate mechanism: an agent-likelihood score and related identity, behavior, fraud, and authorization signals can sit in the payment decision path.
- Revenue bridge: no price, service fee, network-fee treatment, paid attach, contract value, or incremental revenue is disclosed.
- Measured period: none. The release states that U.S. testing is beginning.
- Baseline or denominator: no transaction count, agent share, approval baseline, fraud baseline, or testing population is reported.
- Repeatability: no repeated classification, authorization, fraud, dispute, or renewal measure is disclosed.
- Attribution quality: high for the announced pilot and intended mechanism, absent for customer adoption, control performance, and economics.
- Still unproven: classifier precision and recall, approval lift, fraud and dispute outcomes, active issuers and merchants, pricing, paid attach, transaction volume, revenue, and retention.

## Evidence

- [Mastercard advances agentic commerce with new trust and intelligence services](https://www.mastercard.com/ua/uk/news-and-trends/press/2026/september/new-trust-and-intelligence-services.html) - primary Mastercard release.

## Relations

- `announced-by` [[wiki/entities/Mastercard|Mastercard]]
- `partners-with` [[wiki/entities/Cloudflare|Cloudflare]]
- `demonstrates` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `demonstrates` [[wiki/concepts/Verified Agent Traffic|Verified Agent Traffic]]
- `enables` [[wiki/concepts/Agentic Payments|Agentic Payments]]
- `updates` [[wiki/events/2026-06-10 Mastercard launches Agent Pay for Machines|Mastercard launches Agent Pay for Machines]]
- `supports` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]

## Open questions

- Which issuers and merchants test or buy the score?
- What are its precision, recall, approval lift, fraud, dispute, and false-positive rates?
- Is the service separately priced, bundled, or paid through network economics?
