# Radar Signals proxy

This Worker keeps the Cloudflare API token out of the public GitHub Pages
application. It fetches the Radar measurements used by Signals, normalizes the
responses into a versioned payload, and caches each filter combination for
15 minutes.

## Endpoint

```text
GET /signals?period=12&region=global&agent=all
```

Supported agent scopes are `all`, `crawler`, `assistant`, and `search`. The
filtered scopes map to Cloudflare's `AI_CRAWLER`, `AI_ASSISTANT`, and
`AI_SEARCH` bot categories.

Native category filters apply to demand, geography, operators, and compatible
supporting endpoints. Radar's AI purpose and response-status endpoints accept
user-agent strings rather than native bot categories, and cap the complete
filter at 100 characters. Those two sections therefore report an explicit
incompatible state for category-specific requests rather than sampling an
incomplete bot list. Their complete distributions remain available for the
`all` scope.

Schema version 2 returns:

- `demandComparison`: current and preceding periods requested together on one
  Radar normalization scale
- `purposeTrend`: current purpose mix, prior-period changes, and weekly shares
- `accessOutcomes`: status classes, exact response codes, and a constrained
  access proxy made only from HTTP 401, 403, and 429
- `operators`: category-specific operator mix and top-three concentration;
  independently normalized crawler, assistant, and search shares are never
  added together
- `geography`: displayed locations requested together on a shared scale
- `readiness`: grouped current and previous weekly scan checks and scan coverage
- `efficiency`: Markdown response-size reduction context
- `valueBoundary`: returned-value fields that require a non-Radar source

Every section carries its own availability and method metadata. An upstream
failure therefore does not suppress unrelated measurements. Version 1 aliases
remain in the response temporarily so the Worker can be deployed before the
updated Pages frontend.

## Deploy

1. Create a Cloudflare API token that can read Radar data.
2. From this directory, set the token as a Worker secret:

   ```sh
   npx wrangler secret put CLOUDFLARE_API_TOKEN
   ```

3. Deploy the Worker:

   ```sh
   npx wrangler deploy
   ```

4. Put the deployed Worker URL in
   `docs/signals/config.js` as `radarEndpoint`.

Do not put the token in `wrangler.toml`, `config.js`, repository secrets that
are printed into a Pages build, or any browser-delivered file.

## Data boundary

The proxy returns only measurements available from Radar:

- comparable AI-bot request time series and classified purpose distributions
- HTTP response-status distributions and exact response-code summaries
- bot/operator distributions
- weekly agent-readiness scan counts and check shares
- median HTML-to-markdown reduction ratio

All time-series dates are taken from Radar metadata. `MIN0_MAX` series are
comparable only when requested together; the Worker therefore pairs current and
control periods in one call and requests all displayed geographies together.
These values are relative Cloudflare request volume, not absolute global usage.

The constrained-access measure is a proxy. HTTP 401, 403, and 429 indicate an
access outcome but do not reveal whether it came from WAF policy, robots rules,
authentication, rate limiting, or another publisher decision. Redirects and
ordinary client errors such as HTTP 404 are reported separately.

Relevant official references:

- [AI-bot request time series](https://developers.cloudflare.com/api/resources/radar/subresources/ai/subresources/bots/methods/timeseries/)
- [Agent-readiness summary](https://developers.cloudflare.com/api/resources/radar/subresources/agent_readiness/methods/summary/)
- [Markdown-for-agents summary](https://developers.cloudflare.com/api/resources/radar/subresources/ai/subresources/markdown_for_agents/methods/summary/)

Radar does not provide publisher referral, conversion, revenue, licensing,
serving-cost, or paid-access data. Signals uses Radar to test the demand,
classified-intent, access-outcome, counterparty, geography, and readiness steps
of the Value versus extraction thesis. Attributable publisher value remains
explicitly source-required.
