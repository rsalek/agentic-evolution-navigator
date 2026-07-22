---
id: concept-system-of-record-distribution
type: concept
title: System-of-Record Distribution
status: active
confidence: medium
updated: 2026-07-22
---

# System-of-Record Distribution

Adoption through incumbent platforms that already control enterprise data, permissions, workflows, users, and budget ownership.

## Observable signals

- Native integrations rather than separate agent destinations.
- Named enterprise deployments and enabled employee populations.
- Workflow completion inside CRM, contact-centre, ERP, ITSM, or productivity systems.

## Current graph evidence

- ServiceNow describes forward-deployed engineers agentifying named customer production environments, including large operating estates; the surrounding customer figures are not agent-attributed.
- Five9 connects healthcare expansion to Epic integration, and its first-party Epic Toolbox release corroborates native workflow integration; the academic health-system customer remains unnamed.
- ServiceNow's C Spire and Rossmann stories add named scaled workflows with agent-attributed routing, time, closure, accuracy, and labour metrics inside established service operations.
- R1's pilot connects the Sierra agent layer across electronic medical records, scheduling systems, and account databases; Singtel similarly distributes Shirley through an existing customer-service channel.
- The remaining gap is action-level evidence showing which system writes are autonomous, which are deterministic, which require approval, and how permission failures are handled.

## Relations

- `enables` [[wiki/concepts/Human-AI Workforce Coordination|Human-AI Workforce Coordination]]
- `enables` [[wiki/concepts/Agentic Marketing Automation|Agentic Marketing Automation]]
- `depends-on` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
