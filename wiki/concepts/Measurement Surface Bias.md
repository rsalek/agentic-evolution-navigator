---
id: concept-measurement-surface-bias
type: concept
title: Measurement Surface Bias
status: active
confidence: high
updated: 2026-07-25
---

# Measurement Surface Bias

The predictable distortion that arises when activity visible to one product, provider, method, unit, or population is treated as representative of the whole agent economy.

## Comparison dimensions

- Observation method: provider telemetry, worker survey, operator disclosure, vendor study, experiment, or audit.
- Product surface: consumer assistant, workplace platform, developer agent, or embedded API.
- Unit: interaction, message, conversation, session, task, user, active agent, organization, or transaction.
- Population and period: who is visible, where, and over what time window.
- Coverage boundary: excluded products, users, workflows, and definitions of automation or delegation.

## Current graph evidence

- Google ATLAS observes 15 million interactions across the Gemini App, AI Mode, and Gemini API, but excludes major workplace, enterprise, and agentic surfaces. Its breadth measures cannot establish enterprise-agent depth.
- OpenAI B2B Signals compares the 95th-percentile firm with the median firm using tokens and messages per worker. The 16x Codex gap is an intensity ratio, not an adoption rate or productivity outcome.
- Microsoft reports 15x year-over-year growth in unique active agents across Microsoft 365 and SharePoint agents. An active agent may have only one day of user-initiated use or one autonomous run, and no absolute count is published.
- A nationally representative Federal Reserve-linked survey finds generative-AI use in 40% of job tasks and explicitly explains why worker-reported task shares differ from platform chat-log estimates.
- Anthropic's consumer Claude.ai telemetry reports a rise in directive conversations from 27% to 39%, but a classifier change and the consumer-only surface limit direct comparison with enterprise APIs or agent tools.

## Analytical rule

Triangulate across surfaces instead of averaging their headline percentages. A directional production signal can be material even when absolute scale is unknown, but it must retain its original unit, population, period, and exclusions.

## Relations

- `constrained-by` [[wiki/_system/Evidence Ontology|Evidence Ontology]]
- `applies-to` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `applies-to` [[wiki/concepts/Human-AI Workforce Coordination|Human-AI Workforce Coordination]]
- `references` [[wiki/queries/Why public AI usage studies disagree|Why public AI usage studies disagree]]
