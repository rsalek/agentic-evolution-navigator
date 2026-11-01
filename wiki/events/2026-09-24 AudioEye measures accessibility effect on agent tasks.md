---
id: event-audioeye-accessibility-agent-task-benchmark-2026-09-24
type: event
title: AudioEye measures accessibility effect on agent tasks
date: 2026-09-24
status: verified
confidence: high
stage: pilot
industry: web-infrastructure
layer: agent-runtime-and-economics
commercial_proof: unproven
updated: 2026-09-28
---

# AudioEye measures accessibility effect on agent tasks

AudioEye ran 1,560 independent agents across 13 tasks, six commercial models, and six websites. Each agent started with a new context, and each test ran ten times. Five sites were tested with and without AudioEye's accessibility fixes. The sixth used the W3C's paired accessible and inaccessible demonstration sites.

On the largest reported gap, task completion was 96% on the accessible site and 31% on the inaccessible version. Across all tests, the inaccessible versions used a median 128,000 tokens instead of 90,000, or 43% more. The highest-cost model used up to six times as many tokens. Missing labels stopped every tested model on two tasks. AudioEye used WebJudge to recheck the scoring, and WebJudge agreed with 95% of the company's labels.

The benchmark shows that website structure can affect successful agent action and compute cost. It does not measure live customer traffic, purchases, conversion, revenue, or the commercial effect of AudioEye's product.

## Commercial evidence gate

This is controlled unit-economics and task-reliability evidence, not a monetization green shoot.

- Payer and toll gate: AudioEye sells accessibility testing, remediation, and monitoring. The benchmark does not identify a customer that bought the product to improve agent outcomes or disclose agent-related pricing, attach, renewal, or revenue.
- Measured period and denominator: 1,560 independent runs across 13 tasks, six models, and six sites, with ten repeats per test condition.
- Baseline: accessible and inaccessible versions of the same site provide the comparison. The largest completion comparison was 96% versus 31%. Median token use was 90,000 versus 128,000.
- Repeatability: each condition ran ten times, and an open-source evaluator agreed with 95% of AudioEye's scoring. The study does not identify the models or the five commercial websites.
- Attribution quality: high for the disclosed controlled comparison. Generalization to live agent traffic and customer economics remains unproven because AudioEye ran and reported the benchmark.
- Still unproven: production conversion, checkout completion, payment value, customer cost savings, paid accessibility attach for agent readiness, renewal, and revenue.
- Strongest falsifier: independent replication that finds little or no completion or token-cost difference after controlling for website accessibility.
- Next verification trigger: independent replication, named customer telemetry, live agent conversion and checkout outcomes, paid product attach, contract expansion, retention, or attributable revenue.

## Evidence

- [AI Readiness Starts with an Accessible Website](https://www.audioeye.com/post/ai-readiness-starts-with-an-accessible-website/) - primary benchmark, result, and methodology disclosure.

## Relations

- `announced-by` [[wiki/entities/AudioEye|AudioEye]]
- `demonstrates` [[wiki/concepts/Production Agent Economics|Production Agent Economics]]
- `challenges` [[wiki/theses/Agent-originated traffic is becoming an addressable market|Agent-originated traffic is becoming an addressable market]]
- `challenges` [[wiki/theses/Agent payments are moving from protocol to production|Agent payments are moving from protocol to production]]
