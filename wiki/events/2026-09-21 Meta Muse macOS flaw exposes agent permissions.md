---
id: event-meta-muse-macos-zero-day-2026-09-21
type: event
title: Meta Muse macOS flaw exposes agent permissions
date: 2026-09-21
status: verified
confidence: medium
stage: production
industry: consumer-technology
layer: agent-security
commercial_proof: unproven
updated: 2026-09-22
---

# Meta Muse macOS flaw exposes agent permissions

Security researcher Patrick Wardle published a proof of concept for a local vulnerability in the production Muse macOS client. An unprivileged local process can rewrite the undocumented `endo_voyager_dictation_endpoint` setting and redirect Muse's dictation traffic to an attacker-controlled endpoint. The proof of concept shows exposure of dictated prompts and the possibility of prompt injection through the redirected path.

Ars Technica reports, based on Wardle's demonstrations and interview, that the redirected flow can expose the token used to authenticate a Muse account. The researcher demonstrated use of Muse's existing permissions to write files, take pictures, and reach a linked phone. The attack requires local code execution or a user running a command. It is not a remote compromise of an untouched Mac. Meta did not answer Ars before publication, and no primary Meta advisory or patch was located during this review.

## Commercial evidence gate

This is production security counterevidence, not a monetization green shoot.

- Payer and revenue bridge: none disclosed.
- Measured period and denominator: one disclosed vulnerability and proof of concept in the production macOS client; no affected-user, exploit, incident, or loss count.
- Repeatability: the researcher describes a deterministic setting change, but independent reproduction and affected-version coverage remain unreported.
- Attribution quality: high for the researcher's own proof-of-concept claim; medium for broader account and cross-device effects because this review relies on specialist reporting rather than a Meta advisory or independent reproduction.
- Still unproven: exploitation in the wild, affected versions, patch status, customer impact, support cost, paid security demand, or effect on Muse subscription conversion and retention.
- Strongest falsifier: Meta shows that the proof of concept does not expose reusable authentication, cannot cross the stated permission boundary, or was already fixed in the distributed client.
- Next verification trigger: a Meta advisory, patched version, CVE, independent reproduction, affected-user telemetry, or disclosed incident and remediation data.

## Why it matters

The flaw turns agent privilege concentration into an operational risk. Muse's value depends on access to files, messages, calendars, devices, and connected services. A local process that takes over the agent can inherit that reach without separately defeating every downstream permission. This directly qualifies Meta's launch claims about the Secure VM, Sentinel, credential isolation, and user control.

## Evidence

- [Patrick Wardle's not-a-mused proof of concept](https://github.com/pwardle/not-a-mused) - primary independent security disclosure.
- [Ars Technica reports Wardle's demonstrations and Meta's non-response](https://arstechnica.com/security/2026/09/muse-metas-extraordinarily-privileged-ai-assistant-has-a-serious-0-day/) - specialist security reporting.

## Relations

- `involves` [[wiki/entities/Meta|Meta]]
- `updates` [[wiki/events/2026-09-08 Meta launches priced Muse personal agent|Meta launches priced Muse personal agent]]
- `references` [[wiki/events/2026-09-20 Amazon blocks Meta Muse from its store|Amazon blocks Meta Muse from its store]]
- `constrained-by` [[wiki/concepts/Agent Trust and Governance|Agent Trust and Governance]]
- `challenges` [[wiki/theses/Trust infrastructure monetizes before full autonomy|Trust infrastructure monetizes before full autonomy]]
