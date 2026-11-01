---
id: event-datadome-q3-agent-muse-traffic-2026-10-15
type: event
title: DataDome measures Q3 agent and Muse traffic
date: 2026-10-15
status: verified
confidence: high
stage: scaled
industry: cybersecurity
layer: traffic-and-observability
commercial_proof: unproven
commercial_signals:
  - demand
updated: 2026-10-16
---

# DataDome measures Q3 agent and Muse traffic

DataDome reports nearly 25 billion AI-agent requests across its network in the third quarter of 2026, up 41.5% from 17.7 billion in the second quarter. Agentic-browser requests rose from 12.5 million in August to 58.2 million in September, a 4.7-fold increase. Excluding Meta's Muse, September volume still tripled to 38.7 million.

Muse generated 29.1 million requests during its first 12 days of full availability, from September 22 through October 3. It accounted for 19.5 million September requests and 33% of DataDome's agentic-browser volume despite being measured for only nine days that month. Muse daily traffic increased from 0.8 million requests on September 22 to 3.7 million on October 1.

DataDome classifies 99.3% of sampled Muse requests as coming from cloud or content-delivery infrastructure. The same sample places 8.9% of requests on forms, login, payment, account-creation, or cart endpoints. These are requests to sensitive routes, not completed sign-ins, purchases, payments, or account creations.

## Commercial evidence gate

This is scaled traffic and trust-control demand evidence, but not a new monetization green shoot.

- Company: DataDome.
- Payer: in principle, an enterprise customer using DataDome's commercial traffic-classification and agent-policy products. The report identifies no new paying customer or contract expansion.
- Customer or market-share evidence: Muse reached 33% of agentic-browser requests on DataDome's network in September. This is product traffic share on one provider's measurement surface, not DataDome's commercial market share.
- Toll-gate mechanism: continuous agent detection, traffic classification, identity and intent analysis, and allow or block policy within DataDome's platform.
- Revenue or economic bridge: none in the new report. DataDome's earlier Q2 disclosure said 54% of customers had adopted agent-trust policies, but neither source isolates pricing, paid attach, expansion, revenue, renewal, or outcomes.
- Measured period: July through September 2026 for quarterly traffic; August versus September for agentic browsers; September 22 through October 3 for Muse.
- Baseline and denominator: 25 billion Q3 requests versus 17.7 billion in Q2; 58.2 million September agentic-browser requests versus 12.5 million in August; 29.1 million Muse requests over 12 days.
- Repeatability: the report provides quarterly, monthly, daily, and route-level observations. Only one partial launch month is available for Muse.
- Attribution quality: high for DataDome's first-party network telemetry; medium for broader adoption because the report does not disclose the current customer or site denominator, geography, classifier precision and recall, or independent validation.
- Still unproven: completed transactions, conversion, fraud outcomes, policy effectiveness, paid attach, contract expansion, revenue, renewal, margin, and retained Muse traffic after the launch period.
- Strongest falsifier: Muse traffic falls after the launch window, classification or customer mix overstates wider adoption, or sensitive-route requests fail to produce completed actions or willingness to pay for controls.
- Next verification trigger: retained Q4 traffic, current customer and site denominators, classifier performance, allowed-versus-blocked outcomes, completed transaction value, and DataDome pricing, paid attach, expansion, renewal, or agent-specific revenue.

## Why it matters

The report adds an absolute quarterly baseline and separates agentic browsers from crawlers. It also confirms that the September jump was not solely a Muse launch effect. The finding strengthens the case that agent traffic is measurable and reaches sensitive workflows, while preserving the gap between requests, completed actions, and commercial value.

The report also exposes measurement-surface differences. DataDome measured Muse at 33% of September agentic-browser requests, while HUMAN measured Muse at 40.34% of September agentic traffic on its platform. The categories and provider populations differ, so the shares should not be combined into a wider-web estimate.

## Evidence

- [DataDome's Q3 2026 AI Traffic Report](https://datadome.co/threat-research/ai-traffic-report-q3-2026/) - primary operator telemetry with quarterly, monthly, daily, infrastructure, and route-level measures.

## Relations

- `announced-by` [[wiki/entities/DataDome|DataDome]]
- `involves` [[wiki/entities/Meta|Meta]]
- `updates` [[wiki/events/2026-09-22 DataDome measures 52.7 billion AI requests and policy adoption|DataDome measures 52.7 billion AI requests and policy adoption]]
- `updates` [[wiki/events/2026-10-05 HUMAN measures tripling agent traffic and Muse dominance|HUMAN measures tripling agent traffic and Muse dominance]]
- `measured-by` [[wiki/concepts/Verified Agent Traffic|Verified Agent Traffic]]
- `demonstrates` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `constrained-by` [[wiki/concepts/Measurement Surface Bias|Measurement Surface Bias]]
- `supports` [[wiki/theses/Agent-originated traffic is becoming an addressable market|Agent-originated traffic is becoming an addressable market]]
- `challenges` [[wiki/theses/Agent-originated traffic is becoming an addressable market|Agent-originated traffic is becoming an addressable market]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]

## Open questions

- How many paying organizations and protected sites contributed to the Q3 observations?
- What precision, recall, and false-positive rates apply to Muse and other undeclared cloud agents?
- How many sensitive-route requests completed an authenticated action, purchase, payment, or account creation?
- Does agent traffic drive separate pricing, paid attach, contract expansion, renewal, customer outcomes, or agent-specific revenue for DataDome?
