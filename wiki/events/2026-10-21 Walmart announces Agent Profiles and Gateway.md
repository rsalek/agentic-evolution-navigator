---
id: event-walmart-agent-profiles-gateway-2026-10-21
type: event
title: Walmart announces Agent Profiles and Gateway
date: 2026-10-21
status: verified
confidence: high
stage: announcement
industry: ecommerce
layer: identity-authorization-and-merchant-access
commercial_proof: unproven
updated: 2026-10-26
---

# Walmart announces Agent Profiles and Gateway

Walmart says it will launch Agent Profiles for customers in November 2026 and will begin a beta of Walmart Agent Gateway for agent developers and companies. Each authorized agent will receive a separate profile inside the customer's Walmart account. Customers can set a spending limit, view agent purchases separately, and revoke the profile.

The gateway will use Model Context Protocol to expose approved Walmart capabilities. Walmart says an agent can use a customer's usual purchases without receiving the broader purchase history. Walmart's terms require purchase approval by default, permit extra approval steps, prohibit actions beyond the customer's stated intent, prevent agents from seeing payment-card data or changing payment methods, preserve Walmart's returns process, and allow Walmart to block agents that do not comply.

## Commercial evidence gate

This is merchant-access and trust readiness, not a monetization green shoot.

- Payer: none established.
- Customer or market-share evidence: none. Walmart reports no active profile, customer, agent, developer, partner, or merchant count.
- Toll-gate mechanism: Walmart controls the agent profile, authorization, spending limit, payment-method access, data permissions, order approval, returns, and gateway access.
- Revenue or economic bridge: the controls could route agent purchases through Walmart's existing retail economics, but Walmart reports no agent-attributed transaction count or value, conversion, gross merchandise value, fee, revenue, or margin.
- Measured period and baseline: the October 21 announcement points to a November profile launch and a later gateway beta. It provides no operating period or baseline.
- Repeatability: unproven because the profiles and gateway were not live in the disclosure.
- Attribution quality: high for the planned architecture and rules because Walmart is the primary source. Adoption and economics remain absent.
- Still unproven: launch completion, named agent partners, active profiles, completed and repeat purchases, fraud, refunds, disputes, support cost, conversion, revenue, and margin.
- Strongest falsifier: the beta does not launch, third-party agents do not generate repeat purchases, or fraud and support costs make the authorized path uneconomic.
- Next verification trigger: general availability, named agent partners, active profiles and customers, repeat transaction count and value, approval and rejection rates, refunds and disputes, conversion, gross merchandise value, revenue, and margin.

## Why it matters

Walmart is defining an authorized merchant path where Amazon has blocked an unidentified outside agent and US banks reportedly restrict third-party agents using customer credentials. The contrast shows that system-of-record owners can reject outside agents or admit them through explicit identity, authorization, data, and payment controls. It strengthens the incumbent-distribution thesis but does not show adoption or commercial return.

The bundled controls also challenge the assumption that an independent trust provider will capture the first revenue. Walmart may supply identity, authorization, payment restrictions, and enforcement as part of its retail platform.

## Evidence

- [Walmart describes Agent Profiles, Agent Gateway, customer controls, and agent terms](https://corporate.walmart.com/news/2026/10/Making-It-Possible-for-Agents-to-Shop-on-Behalf-of-Customers) - primary company announcement; no live usage or economics.

## Relations

- `announced-by` [[wiki/entities/Walmart|Walmart]]
- `demonstrates` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `demonstrates` [[wiki/concepts/Agentic Payments|Agentic Payments]]
- `demonstrates` [[wiki/concepts/System-of-Record Distribution|System-of-Record Distribution]]
- `supports` [[wiki/theses/Incumbent platforms are the distribution channel|Incumbent platforms are the distribution channel]]
- `supports` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
- `challenges` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]
- `references` [[wiki/events/2026-09-20 Amazon blocks Meta Muse from its store|Amazon blocks Meta Muse from its store]]
- `references` [[wiki/events/2026-10-22 US banks block third-party agents from customer accounts|US banks block third-party agents from customer accounts]]
