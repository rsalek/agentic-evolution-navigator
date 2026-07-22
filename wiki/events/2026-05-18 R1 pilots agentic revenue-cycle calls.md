---
id: event-r1-agentic-revenue-cycle-pilot-2026-05-18
type: event
title: R1 pilots agentic revenue-cycle calls
date: 2026-05-18
status: reported
confidence: medium
stage: pilot
industry: healthcare
layer: service-operations
updated: 2026-07-22
---

# R1 pilots agentic revenue-cycle calls

R1 and Sierra described an AI-enabled contact-centre workflow for balance questions, payment processing, payment-plan setup, and account questions. The agent connects across electronic medical records, scheduling systems, and account databases.

Early testing covered up to 40% of incoming calls and cut authentication time by more than half. R1 said straightforward calls can complete automatically while higher-judgement cases transfer to human agents with context preserved.

## Why it matters

The case extends bounded service execution into a regulated healthcare revenue-cycle environment. It remains pilot evidence: the source describes early testing rather than repeated scaled production, and it does not disclose payment volume, escalation rate, errors, or unit economics.

Processing a patient-directed payment or payment plan is not treated as evidence for autonomous agent-payment networks.

## Evidence

- [How R1 left the IVR behind and built something better for patients](https://sierra.ai/customers/r1-rcm) - co-authored R1 and Sierra customer story.

## Relations

- `involves` [[wiki/entities/R1 RCM|R1 RCM]]
- `involves` [[wiki/entities/Sierra AI|Sierra AI]]
- `demonstrates` [[wiki/concepts/Agentic Service Operations|Agentic Service Operations]]
- `demonstrates` [[wiki/concepts/Human-AI Workforce Coordination|Human-AI Workforce Coordination]]
- `demonstrates` [[wiki/concepts/System-of-Record Distribution|System-of-Record Distribution]]
- `measured-by` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `supports` [[wiki/theses/Scaled agent adoption concentrates in bounded service operations|Scaled agent adoption concentrates in bounded service operations]]
- `supports` [[wiki/theses/Incumbent platforms are the distribution channel|Incumbent platforms are the distribution channel]]

## Open questions

- How many calls now complete autonomously, including payment or plan setup?
- What are the human-escalation, correction, reversal, privacy-incident, and patient-outcome rates?
- Which actions require approval and how are agent identities and permissions audited across connected systems?
