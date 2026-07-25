# Radar Signals proxy

This Worker keeps the Cloudflare API token out of the public GitHub Pages
application. It fetches the Radar measurements used by Signals, normalizes the
responses into one stable payload, and caches each filter combination.

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

- AI-bot request time series and request distributions
- response-status distributions
- weekly agent-readiness scan counts
- median HTML-to-markdown reduction ratio

Relevant official references:

- [AI-bot request time series](https://developers.cloudflare.com/api/resources/radar/subresources/ai/subresources/bots/methods/timeseries/)
- [Agent-readiness summary](https://developers.cloudflare.com/api/resources/radar/subresources/agent_readiness/methods/summary/)
- [Markdown-for-agents summary](https://developers.cloudflare.com/api/resources/radar/subresources/ai/subresources/markdown_for_agents/methods/summary/)

Radar does not provide publisher referral, conversion, or revenue data. The
live value-versus-extraction view therefore plots the available demand series
while leaving the referral/value series and gap explicitly unavailable until a
publisher analytics source is connected.
