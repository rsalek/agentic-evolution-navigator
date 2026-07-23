---
id: concept-human-ai-workforce-coordination
type: concept
title: Human-AI Workforce Coordination
status: active
confidence: medium
updated: 2026-07-23
---

# Human-AI Workforce Coordination

The planning, supervision, quality control, coaching, and handoff mechanisms that allocate work between people and AI agents.

## Observable signals

- Agent resolution rate and human-handoff rate.
- Supervisor span, review time, customer outcome, and exception volume.
- Workforce-planning systems that schedule or evaluate both human and AI work.

## Current graph evidence

- Talkspace reports clinician validation, risk assessment, escalation, live therapist handoff, and quality controls around AI intake and behavioral triage; its outcome metrics are pilot/test evidence.
- ServiceNow describes forward-deployed engineers agentifying workflows inside customer production environments, showing human implementation and governance around deployment rather than unsupervised replacement.
- C Spire routes possible duplicate and major-incident cases to humans after automated triage; Singtel retains human oversight; R1 transfers higher-judgement calls with context preserved.
- Falabella and NatWest disclose higher shares of resolution without human intervention, but neither provides comparable later-recovery, correction, or escalation measures.
- MoneyHero and ixigo/TARA extend autonomous-resolution evidence across financial-product and travel support, while still omitting later recovery, quality, and exception rates.
- Delivery Hero's Herogen shifts implementation work toward objective-setting and review, but the public disclosure omits review effort, failed-deployment, and rollback rates.
- Hugging Face reports AI-assisted detection and analysis over more than 17,000 incident events, compressing forensic reconstruction from days to hours while human responders contained and remediated the breach.
- These examples support a bounded allocation pattern, but the public sources do not disclose comparable escalation, correction, rework, or supervisor-effort rates.

## Relations

- `depends-on` [[wiki/concepts/System-of-Record Distribution|System-of-Record Distribution]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
