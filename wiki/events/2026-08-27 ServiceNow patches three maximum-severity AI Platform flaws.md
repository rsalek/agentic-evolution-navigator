---
id: event-servicenow-patches-ai-platform-flaws-2026-08-27
type: event
title: ServiceNow patches three maximum-severity AI Platform flaws
date: 2026-08-27
status: verified
confidence: high
stage: production
industry: cybersecurity
layer: trust-and-governance
commercial_proof: unproven
updated: 2026-08-31
---

# ServiceNow patches three maximum-severity AI Platform flaws

ServiceNow disclosed and remediated four vulnerabilities affecting the Now Platform and ServiceNow AI Platform. Three were assigned CVSS 10.0: CVE-2026-18885, a code-injection flaw in the GraphQL Composite Data API; CVE-2026-18886, improper access control in the system-configuration image-upload processor; and CVE-2026-74820, SQL injection in dynamic-schema ordering. ServiceNow's CNA records describe unauthenticated paths to code execution, instance-data access or modification, privilege escalation, or database statements under affected versions.

ServiceNow deployed updates to hosted instances and provided fixes to partners and self-hosted customers. The vendor reported no known malicious exploitation at disclosure. The event is therefore production-platform security and remediation evidence, not evidence of a realized breach, agent action, customer loss, or security-product monetization.

## Commercial evidence gate

This is material counterevidence and trust-readiness evidence, not a monetization green shoot.

- Payer and toll gate: ServiceNow customers pay for the hosted or self-managed platform, but no separate security charge, attach, incident revenue, or remediation economics are disclosed.
- Measured period and denominator: four disclosed vulnerabilities on August 27, including three CVSS 10.0 records; affected release and patch thresholds are published per CVE.
- Attribution quality: high for the vendor-assigned CVE records and remediation statement; no exploitation or customer-impact evidence was reported.
- Still unproven: exposed-instance count, patch completion, exploitation, incident volume, data loss, downtime, customer churn, remediation cost, and whether agent workflows increased practical exploit impact.
- Strongest falsifier of the risk interpretation: evidence that all affected hosted instances were patched before exposure and that vulnerable interfaces were unreachable in real deployments.
- Next verification trigger: CISA KEV inclusion, confirmed exploitation, customer incident disclosures, patch-adoption telemetry, or measured security and retention impact.

## Evidence

- [ServiceNow security advisory KB3152242](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB3152242) - primary vendor advisory.
- [Three CVSS 10.0 Flaws in ServiceNow's AI Platform](https://labs.cloudsecurityalliance.org/research/csa-research-note-servicenow-ai-platform-cvss10-20260829-csa/) - Cloud Security Alliance synthesis linking the vendor advisory, CNA records, affected components, and agent-data interface.

## Relations

- `announced-by` [[wiki/entities/ServiceNow|ServiceNow]]
- `demonstrates` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `challenges` [[wiki/theses/Incumbent platforms are the distribution channel|Incumbent platforms are the distribution channel]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]
