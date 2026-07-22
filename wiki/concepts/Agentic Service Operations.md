---
id: concept-agentic-service-operations
type: concept
title: Agentic Service Operations
status: active
confidence: medium
updated: 2026-07-22
---

# Agentic Service Operations

High-volume customer, employee, store, and revenue-cycle workflows in which agents interpret service requests, retrieve structured records, execute a bounded set of state changes, and escalate exceptions through established service systems.

## Observable signals

- Share of requests completed without human intervention, separated from classification, preparation, and routing.
- Sustained task volume, action mix, human-handoff rate, error rate, correction rate, and reversal rate.
- Time, cost, service outcome, or revenue per successful resolution.
- Agent permissions, approval gates, audit coverage, and exception paths for consequential actions.

## Current graph evidence

- C Spire reports scaled email triage and routing with service-time and first-line-closure improvements, while retaining human verification for possible duplicates and major incidents.
- Rossmann reports six live agents across more than 200 store-support categories, with high routing accuracy and lower labour cost; its annual savings figure is projected rather than realised.
- Singtel supplies the strongest customer-side scaled evidence: more than 70,000 cases in six weeks, officer-free troubleshooting and roaming sign-ups, and more than 200 completed add-on purchases.
- R1 RCM adds pilot evidence in healthcare revenue-cycle calls, where the agent can handle balances, payments, payment plans, and account questions while escalating higher-judgement cases.
- The public cases still omit consistent correction, reversal, customer-outcome, and customer-specific control data.

## Relations

- `depends-on` [[wiki/concepts/System-of-Record Distribution|System-of-Record Distribution]]
- `depends-on` [[wiki/concepts/Human-AI Workforce Coordination|Human-AI Workforce Coordination]]
- `measured-by` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
