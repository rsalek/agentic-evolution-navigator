---
id: event-agibank-agentforce-service-orchestration-2026-09-04
type: event
title: Agibank scales Agentforce service and orchestration
date: 2026-09-04
status: verified
confidence: medium
stage: scaled
industry: financial-services
layer: applications
commercial_proof: unproven
updated: 2026-09-07
---

# Agibank scales Agentforce service and orchestration

Salesforce's named-customer case study says Agibank runs six Agentforce agents and 11 additional bots across WhatsApp service workflows. Specialized agents autonomously handle 70,000 inquiries per month, while a loan-status workflow handles 22,500 inquiries per month with a 75% deflection rate. The broader case study reports nearly 3.6 million model calls per month and says an FAQ agent has helped more than 60,000 customers since November 2025 with an average 30% monthly deflection rate.

The operating pattern is bounded and supervised. The routing layer interprets customer intent and hands work to a specialist agent or human representative. The loan-status agent verifies identity, retrieves records, returns a status, and writes a summary to the CRM. Lead-qualification agents hand sales-ready opportunities to representatives rather than closing the transaction autonomously.

This is strong scaled-production evidence for incumbent system-of-record distribution and human-agent coordination, but not a new monetization green shoot. Salesforce does not disclose Agibank pricing, contract value, incremental Agentforce revenue, paid attach, renewal, savings, or realised customer growth. Agibank's stated objective to grow its customer base by 40% without increasing fixed costs is a goal, not an observed result.

## Evidence assessment

- Observation method: Salesforce vendor case study with a named customer and named customer representative.
- Product surface and unit: Agentforce service and orchestration on WhatsApp; monthly inquiries, deflection rates, customers served, agents, bots, and model calls.
- Population and period: Agibank customers; current monthly rates plus FAQ use since November 2025.
- Maturity: scaled for the specialist service agents; the unified superagent migration is still expanding.
- Confidence: medium because the metrics are vendor-published and not independently confirmed in an Agibank filing or technical report.
- Commercial gap: no price, contract, paid attach, Salesforce revenue, realised cost saving, retention, margin, or customer-growth outcome.

## Evidence

- [Agibank Agentic Enterprise overview](https://www.salesforce.com/customer-stories/agibank/) - vendor-published named-customer workflow and outcome metrics.
- [Agibank superagent orchestration](https://www.salesforce.com/customer-stories/agibank/superagent-orchestration/) - vendor-published architecture, monthly inquiry volume, and migration detail.

## Relations

- `involves` [[wiki/entities/Agibank|Agibank]]
- `involves` [[wiki/entities/Salesforce|Salesforce]]
- `demonstrates` [[wiki/concepts/Agentic Service Operations|Agentic Service Operations]]
- `demonstrates` [[wiki/concepts/Human-AI Workforce Coordination|Human-AI Workforce Coordination]]
- `demonstrates` [[wiki/concepts/System-of-Record Distribution|System-of-Record Distribution]]
- `supports` [[wiki/theses/Scaled agent adoption concentrates in bounded service operations|Scaled agent adoption concentrates in bounded service operations]]
- `supports` [[wiki/theses/Incumbent platforms are the distribution channel|Incumbent platforms are the distribution channel]]
- `references` [[wiki/events/2026-08-26 Salesforce reports Q2 Agentforce ARR and work-unit acceleration|Salesforce reports Q2 Agentforce ARR and work-unit acceleration]]

## Open questions

- Are the monthly inquiry and deflection metrics stable across multiple quarters, and what is the later recovery or repeat-contact rate?
- What did Agibank pay for Agentforce, professional services, and model consumption, and did the deployment expand contract value?
- Did customer count actually grow without fixed-cost growth, and what savings or conversion outcomes were realised?
- How many model calls and human interventions are required per successfully resolved inquiry?
