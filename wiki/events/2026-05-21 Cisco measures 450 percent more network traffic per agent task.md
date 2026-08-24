---
id: event-cisco-agent-task-traffic-benchmark-2026-05-21
type: event
title: Cisco measures 450 percent more network traffic per agent task
date: 2026-05-21
status: verified
confidence: high
stage: pilot
industry: network-infrastructure
layer: traffic-and-observability
commercial_proof: unproven
updated: 2026-08-13
---

# Cisco measures 450 percent more network traffic per agent task

Cisco's 2026 *AI Impact on Wide Area Networks* report describes a controlled test using an Open Deep Research agent from LangChain. For a task asking the agent to gather Cisco's public investor-relations, social, news, partnership, executive, organizational, and competitive information, the report records 26.8 MB of agent-triggered traffic across 44 web sources and labels agent-driven traffic growth at 450% versus a human-performed equivalent. Cisco says approximately 70% of the agent-triggered traffic was AI inference.

## Evidence boundary

The 450% figure is real, but it measures total network traffic associated with one controlled agent workflow, not agent activity count, market-wide traffic share, customer adoption, or revenue. Cisco's report also contains live AI-inference measurements from service-provider production networks, but the 450% agent-versus-human benchmark is presented as empirical testing in a controlled environment. The report does not publish the human baseline byte count in the Figure 7 text, so the percentage cannot be independently recomputed from the displayed 26.8 MB figure alone.

## Commercial evidence gate

This is high-confidence traffic-intensity and network-readiness evidence, not a monetization green shoot.

- Payer: none identified; the test is Cisco research rather than a paid customer deployment.
- Toll-gate mechanism: network capacity, inference-path resilience, observability, and security are the implicated product surfaces, but no Cisco pricing, attach, usage fee, or monitoring charge is disclosed.
- Revenue bridge: none attributes Cisco revenue, ARR, margin, retention, or demand to the measured agent traffic.
- Measured period: one controlled task; no multi-period series is supplied for the 450% comparison.
- Baseline or denominator: a human-performed equivalent is the comparison, but its byte count and task protocol are not fully disclosed in the figure text.
- Repeatability: unknown; Cisco says other agents may behave similarly, but no independent replication or task suite is provided.
- Attribution quality: high for the reported Cisco experiment and its component traffic paths; low for generalizing from one research workflow to enterprise-wide agent traffic or economics.
- Still unproven: live agent adoption, agent-only traffic share, customer or market-share growth, paid deployment, pricing, revenue, conversion, and agent-attributed unit economics.

## Evidence

- [AI Impact on Wide Area Networks: Cisco 2026 report](https://www.cisco.com/c/dam/en/us/solutions/collateral/artificial-intelligence/mass-scale-infrastructure/ai-network-traffic-report.pdf) - primary Cisco report; Figure 7 and the agentic traffic methodology are on pages 15-16.
- [The impact of AI on wide area network traffic: we need to talk](https://blogs.cisco.com/sp/the-impact-of-ai-on-wide-area-network-traffic-we-need-to-talk) - Cisco research summary dated May 21, 2026.

## Relations

- `announced-by` [[wiki/entities/Cisco|Cisco]]
- `demonstrates` [[wiki/concepts/Verified Agent Traffic|Verified Agent Traffic]]
- `applies-to` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `constrained-by` [[wiki/concepts/Measurement Surface Bias|Measurement Surface Bias]]
- `supports` [[wiki/theses/Agent-originated traffic is becoming an addressable market|Agent-originated traffic is becoming an addressable market]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]
- `updates` [[wiki/events/2025-08-13 Cisco frames agentic network traffic as a new capacity model|Cisco frames agentic network traffic as a new capacity model]]
