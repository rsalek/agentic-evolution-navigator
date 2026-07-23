---
id: query-ai-agent-operational-deployments
type: query
title: AI agent operational deployments
status: active
confidence: medium
updated: 2026-07-23
---

# AI agent operational deployments

This synthesis combines the user-supplied Quartr capture [AI agent operational deployments](https://web.quartr.com/) with the later deep-research packet `Operational Adoption of AI Agents in Corporate Workflows`. Both source captures remain under `raw/private/` and are not published because they are research artifacts rather than public-domain text. The later PDF exposed the primary-source URLs absent from the Markdown export; one table also rendered as raw HTML, so the packet was used for discovery rather than as proof.

## What the packet adds

- Payments have moved from protocol language to live network operation: Mastercard reported a first Agent Pay transaction, then described broad U.S. card enablement with token, identity, issuer-visibility, fraud, safety, and security controls.
- Enterprise distribution is visible inside existing systems of record: ServiceNow described named production workflows; Five9 described Epic-integrated healthcare expansion and ARR growth.
- Human oversight is operational, not rhetorical, in the Talkspace examples: clinician validation, QMS/HIPAA controls, escalation, and therapist handoff remain in the workflow.
- Trust infrastructure is being positioned as transaction-path infrastructure: Cloudflare presented cryptographic agent identity and flow-specific authorization for autonomous commerce, but the slide does not prove live traffic.
- The packet does not contain a standalone agent-payment volume-growth metric. Mastercard provides the strongest live evidence, but readiness and enablement should not be confused with measured agent volume.
- The packet also contains an unpromoted Fiserv Investor Day pricing claim: a shift from basis points toward percentage points and higher take rates. It remains a lead until the first-party presentation and agent attribution are independently verified.

## What the corporate-workflow packet adds

- [Singtel's customer release](https://www.singtel.com/about-us/media-centre/news-releases/singtel-group-partners-sierra-to-transform-custome-engagement-with-ai) provides the strongest new scaled evidence: more than 70,000 cases in six weeks, officer-free resolution and sign-up rates, and more than 200 completed roaming add-on purchases.
- [C Spire](https://www.servicenow.com/customers/cspire.html) and [Rossmann](https://www.servicenow.com/customers/rossmann.html) add material named scaled deployments inside ServiceNow, with automation, service-time, routing, closure, labour, and projected-savings metrics. They remain medium-confidence because the evidence is vendor-published and not independently customer-confirmed.
- [R1's co-authored story](https://sierra.ai/customers/r1-rcm) extends the pattern into healthcare revenue-cycle calls and system-of-record actions, but “up to 40%” of incoming calls in early testing is pilot evidence rather than scale.
- [Railway's response](https://blog.railway.com/p/your-ai-wants-to-nuke-your-database) confirms that real agents can discover credentials and invoke destructive production APIs. Its new soft deletion, narrower scopes, staged environments, and short-lived consented access make the control boundary concrete.
- The recurring pattern is now strong enough for [[wiki/concepts/Agentic Service Operations|Agentic Service Operations]]: agents own repetitive, high-volume, policy-bounded service work while people own ambiguity, sensitive judgement, and exceptions.
- The public economics remain service-level and labour proxies rather than standardised agent unit economics. Cost per successful action, error recovery, corrections, reversals, and durable multi-period savings are usually absent.
- Singtel's add-on purchases and R1's payment handling are transaction-adjacent customer-service actions. They are not treated as evidence for autonomous agent-payment networks.

## Leads not promoted

- Booking.com, Chime, and Curology remain useful discovery leads, but the located evidence is vendor-led and does not add enough independent or non-duplicative proof to justify new event nodes yet.
- Salesforce, Workday, Microsoft, and Kraken materials describe availability, partnerships, or intended deployments without named current workflow volume and outcome evidence. They remain announcement watchlist items.
- The PocketOS founder and Railway disagree about the final recovery state after the production deletion. The graph preserves the disagreement instead of selecting one account.

## Corrected Quartr evidence-contract search

The corrected Quartr chat applied a stricter workflow-and-impact prompt to corporate disclosures and returned seven qualified passages plus three explicit rejections. Primary-source review promoted three material findings:

- Delivery Hero's Q1 2026 transcript reports end-to-end app deployment by Herogen, annual coding output equivalent to 130 engineers, and double-digit weekly growth. This creates [[wiki/concepts/Agentic Software Engineering|Agentic Software Engineering]] and challenges the service-operations concentration thesis, while quality, rollback, review, security, and financial measures remain absent.
- Falabella's Q4 2025 report supplies more than 115,000 interactions, a 65% resolution rate without human intervention, and an operating period. It strengthens the service thesis with direct operator evidence but does not establish architecture, complexity mix, corrections, or economics.
- NatWest's 2025 annual report supplies a 20-percentage-point improvement in Cora queries resolved without human intervention versus an equivalent non-GenAI journey. It is production outcome evidence, not scaled-volume evidence.
- MoneyHero's SEC-filed release supplies a monthly 47% autonomous-resolution rate and up to 70% AI touch rate. Its application growth and employee-cost decline are not treated as AI-caused.
- ixigo's annual report supplies more than 5 million TARA queries and voice/chat autonomous-resolution rates, while inconsistent beta language and legacy-chatbot provenance limit confidence.
- NICE Cognigy's Lufthansa case supplies more than 16 agents and 16 million annual conversations across information, rebooking, alternative-flight, and refund workflows. It remains medium-confidence vendor evidence.

ADT remains a production watch item because routing through AI and improved containment do not establish autonomous completion. Ten Lifestyle, Dayforce, and Hanover lacked measured live state change and were not promoted.

## Collector follow-up

- The refreshed graph-driven collector added 44 new candidates. A high-scoring aggregator claimed USD 15 million of x402 volume; the [current primary x402 counter](https://x402.org/) instead displayed 75.41 million transactions and USD 24.24 million of 30-day volume. The graph records the primary figure while explicitly withholding agent attribution.
- The refreshed collector again surfaced the OpenAI/Hugging Face incident. [Hugging Face's affected-party disclosure](https://huggingface.co/blog/security-incident-july-2026) and [OpenAI's later operator account](https://openai.com/index/hugging-face-model-evaluation-security-incident/) are now directly verified and represented as an update chain. OpenAI's account resolves model attribution but introduces a different initial-access sequence from Hugging Face's early disclosure; the joint forensic record remains pending.
- Other high-scoring items were secondary, licensed, promotional, duplicated, or announcement-only and did not add material verified evidence.

## Relations

- `references` [[wiki/events/2025-10-30 Mastercard completes first Agent Pay transaction|Mastercard completes first Agent Pay transaction]]
- `references` [[wiki/events/2026-03-10 Mastercard enables tokenized agent transactions|Mastercard enables tokenized agent transactions]]
- `references` [[wiki/events/2026-05-04 ServiceNow agentifies customer production workflows|ServiceNow agentifies customer production workflows]]
- `references` [[wiki/events/2025-07-31 Five9 expands healthcare AI-agent deployment|Five9 expands healthcare AI-agent deployment]]
- `references` [[wiki/events/2026-02-19 Five9 scales healthcare AI-agent commitment|Five9 scales healthcare AI-agent commitment]]
- `references` [[wiki/events/2026-01-15 Talkspace deploys clinically supervised AI intake workflow|Talkspace deploys clinically supervised AI intake workflow]]
- `references` [[wiki/events/2025-10-30 Talkspace measures AI behavioral triage outcomes|Talkspace measures AI behavioral triage outcomes]]
- `references` [[wiki/events/2026-06-09 Cloudflare presents Web Bot Auth for autonomous commerce|Cloudflare presents Web Bot Auth for autonomous commerce]]
- `references` [[wiki/events/2026-03-04 Singtel scales Shirley across support and roaming transactions|Singtel scales Shirley across support and roaming transactions]]
- `references` [[wiki/events/2026-04-29 Railway adds guardrails after agent deletes production data|Railway adds guardrails after agent deletes production data]]
- `references` [[wiki/events/2026-05-18 R1 pilots agentic revenue-cycle calls|R1 pilots agentic revenue-cycle calls]]
- `references` [[wiki/events/2026-06-03 C Spire scales agent email triage|C Spire scales agent email triage]]
- `references` [[wiki/events/2026-06-18 Rossmann scales agentic store support|Rossmann scales agentic store support]]
- `references` [[wiki/events/2026-07-22 x402 reports 75 million monthly transactions|x402 reports 75 million monthly transactions]]
- `references` [[wiki/events/2026-04-30 Delivery Hero scales autonomous software deployment|Delivery Hero scales autonomous software deployment]]
- `references` [[wiki/events/2026-02-24 Falabella scales automated customer-service resolution|Falabella scales automated customer-service resolution]]
- `references` [[wiki/events/2026-02-13 NatWest reports higher autonomous Cora resolution|NatWest reports higher autonomous Cora resolution]]
- `references` [[wiki/events/2026-07-16 Hugging Face discloses autonomous production intrusion|Hugging Face discloses autonomous production intrusion]]
- `references` [[wiki/events/2026-07-21 OpenAI attributes Hugging Face breach to evaluation agents|OpenAI attributes Hugging Face breach to evaluation agents]]
- `references` [[wiki/events/2026-05-06 Lufthansa operates scaled service-agent network|Lufthansa operates scaled service-agent network]]
- `references` [[wiki/events/2026-04-30 MoneyHero measures autonomous service resolution|MoneyHero measures autonomous service resolution]]
- `references` [[wiki/events/2025-05-14 ixigo scales TARA customer support|ixigo scales TARA customer support]]
- `supports` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
- `supports` [[wiki/theses/Incumbent platforms are the distribution channel|Incumbent platforms are the distribution channel]]
- `supports` [[wiki/theses/Scaled agent adoption concentrates in bounded service operations|Scaled agent adoption concentrates in bounded service operations]]
- `challenges` [[wiki/theses/Scaled agent adoption concentrates in bounded service operations|Scaled agent adoption concentrates in bounded service operations]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]

## Open questions

- Which named deployments have recurring agent task volume, rather than readiness, pilot, or expansion evidence?
- What portion of ARR, cost savings, take-rate expansion, and payment volume is directly attributable to agents?
- How much reported “resolution” is fully autonomous completion rather than classification, preparation, deterministic automation, or later human recovery?
- What are the correction, reversal, escalation, reliability, and customer-outcome rates over repeated periods?
- Which permissions, approval gates, audit settings, and reversible-action controls are active in each named deployment?
- What was PocketOS's final recovered state, and did the agent vendor change its safeguards?
- Can the x402 activity counters be independently reproduced, and what share is attributable to verified AI agents?
- What does the joint OpenAI/Hugging Face forensic record establish about initial access, affected data, final impact, and permanent controls?
- Still-unpromoted leads requiring first-party verification include Fiserv's Investor Day pricing language, Mastercard's Q4 switching and service-monetization comments, Mastercard's AGM Agent Pay for Machines addressable-market claim, and Visa's Q2 value-added-services and agentic-commerce positioning.
