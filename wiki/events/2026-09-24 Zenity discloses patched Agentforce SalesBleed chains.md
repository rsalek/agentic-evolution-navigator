---
id: event-zenity-salesbleed-agentforce-chains-2026-09-24
type: event
title: Zenity discloses patched Agentforce SalesBleed chains
date: 2026-09-24
status: verified
confidence: medium
stage: production
industry: enterprise-software
layer: trust-and-governance
commercial_proof: unproven
updated: 2026-09-25
---

# Zenity discloses patched Agentforce SalesBleed chains

Zenity Labs disclosed two proof-of-concept attack chains against production Salesforce Agentforce surfaces. In the first, an external attacker could place hidden indirect-prompt-injection instructions into a public Web-to-Lead submission. Later routine internal review could cause Agentforce's general CRM subagent to query Accounts data and encode it into an attacker-controlled hostname; HTML image rendering or a Slack unfurl then generated a DNS request that carried the encoded data. Zenity says the chain relied on default read access to Leads and Accounts rather than privilege escalation.

The second chain combined indirect prompt injection with Agentforce's Slack reply action and a trusted-URL redaction bypass. A malicious insider, or an external attacker able to plant instructions in CRM data, could make the trusted agent identity send a phishing link without clear attribution or user confirmation.

Zenity reports that it disclosed the exfiltration chain to Salesforce on June 1, received confirmation on June 2, and confirmed fixes on August 18 and 19. It says fixes for the Slack chain were confirmed and tested on September 21. The demonstrated paths no longer work by default, although Zenity notes that an administrator can disable user confirmation for Slack messages. No Salesforce public advisory, observed customer compromise, exploited-account count, data-loss measure, or financial impact was located. Confidence is therefore medium: the technical evidence is primary, while vendor confirmation and remediation are reported by the researcher.

## Commercial evidence gate

This is material production-platform counterevidence and security-readiness evidence, not a monetization green shoot.

- Payer and toll gate: Salesforce customers pay for Agentforce and associated platform services, but the disclosures provide no separate security charge, paid control attach, remediation revenue, or security-product economics.
- Measured period and denominator: two proof-of-concept chains disclosed on September 24 after researcher-reported remediation; no deployed-customer or affected-instance denominator is supplied.
- Attribution quality: primary researcher reproduction with detailed mechanics and reported Salesforce confirmation; no vendor advisory or independent customer incident confirms prevalence.
- Repeatability: the demonstrated chains were reproducible before remediation, but Zenity says they no longer work by default after the fixes.
- Still unproven: exploitation in the wild, affected customers, exposed records, patch coverage, incident or dispute volume, remediation cost, churn, and whether trust controls generated incremental revenue or retention.
- Strongest falsifier of the broad risk interpretation: evidence that the vulnerable combinations were confined to research configurations, never exposed customer data, and were fully remediated before any malicious use.
- Next verification trigger: a Salesforce advisory, CVE, customer incident, patch-adoption telemetry, control attach or pricing, measured risk reduction, or agent-security revenue and retention evidence.

## Evidence

- [SalesBleed: 0-Click Data Exfiltration on Agentforce](https://labs.zenity.io/post/salesbleed-0-click-data-exfiltration-on-agentforce) - primary technical disclosure and remediation timeline.
- [SalesBleed: Hijacking Agentforce in Slack for Anonymous Phishing](https://labs.zenity.io/post/salesbleed-hijacking-agentforce-in-slack-for-anonymous-phishing) - primary technical disclosure of the messaging and trusted-URL chain.

## Relations

- `involves` [[wiki/entities/Salesforce|Salesforce]]
- `announced-by` [[wiki/entities/Zenity Labs|Zenity Labs]]
- `demonstrates` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `demonstrates` [[wiki/concepts/Agentic Cyber Operations|Agentic Cyber Operations]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `challenges` [[wiki/theses/Incumbent platforms are the distribution channel|Incumbent platforms are the distribution channel]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]
