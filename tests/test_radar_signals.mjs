import assert from "node:assert/strict";
import {
  accessBreakdown,
  comparableChange,
  compareSummaries,
  groupedReadiness,
  readinessItems,
} from "../workers/radar-signals/core.js";
import { __test } from "../workers/radar-signals/worker.js";

{
  const url = new URL("https://example.test/signals");
  __test.appendParameter(url, "name", ["current", "control"]);
  __test.appendParameter(url, "dateRange", ["12w", "12wcontrol"]);
  assert.deepEqual(url.searchParams.getAll("name"), ["current", "control"]);
  assert.deepEqual(url.searchParams.getAll("dateRange"), ["12w", "12wcontrol"]);
}

{
  const parameters = __test.trafficSeriesParameters(
    12,
    "assistant",
    ["current", "control"],
    ["12w", "12wcontrol"],
    ["GB", "GB"]
  );
  assert.deepEqual(parameters.botCategory, ["AI_ASSISTANT", "AI_ASSISTANT"]);
  assert.deepEqual(parameters.location, ["GB", "GB"]);
  assert.equal(parameters.aggInterval, "1w");
}

{
  const parameters = __test.trafficSeriesParameters(
    12,
    "all",
    ["current", "control"],
    ["12w", "12wcontrol"]
  );
  assert.equal(parameters.botCategory, undefined, "The all-AI endpoint must not receive a combined enum");
}

assert.equal(
  __test.signalsCacheKey("https://example.test", 12, "global", "crawler"),
  "https://example.test/signals?period=12&region=global&agent=crawler&schema=2.2"
);
assert.notEqual(
  __test.signalsCacheKey("https://example.test", 12, "global", "crawler"),
  __test.signalsCacheKey("https://example.test", 12, "global", "assistant")
);

assert.equal(comparableChange([0.8, 1], [0.4, 0.5]), 100);

{
  const compared = compareSummaries(
    [
      { key: "Training", label: "Training", value: 45 },
      { key: "Mixed Purpose", label: "Mixed Purpose", value: 40 },
    ],
    [
      { key: "Training", label: "Training", value: 42 },
      { key: "Mixed Purpose", label: "Mixed Purpose", value: 41 },
    ]
  );
  assert.equal(compared[0].changePp, 3);
  assert.equal(compared[1].changePp, -1);
  assert.equal(compared.length, 2, "Mixed Purpose must remain a separate category");
}

{
  const outcomes = accessBreakdown(
    [
      { key: "2xx", value: 75.6 },
      { key: "3xx", value: 9.4 },
      { key: "4xx", value: 14.2 },
      { key: "5xx", value: 0.8 },
    ],
    [
      { key: "401", value: 1.1 },
      { key: "403", value: 2.3 },
      { key: "404", value: 8.2 },
      { key: "429", value: 0.6 },
    ]
  );
  assert.equal(outcomes.find((item) => item.key === "constrained").value, 4);
  assert.equal(outcomes.find((item) => item.key === "otherClient").value, 10.2);
  assert.equal(outcomes.find((item) => item.key === "redirected").value, 9.4);
}

{
  const currentPayload = {
    result: {
      meta: { successfulDomains: 100, totalDomains: 150, date: "2026-07-20" },
      current: { robotsTxtAiRules: "80", webBotAuth: "2", x402: "1" },
    },
  };
  const previousPayload = {
    result: {
      meta: { successfulDomains: 80, totalDomains: 120, date: "2026-07-13" },
      previous: { robotsTxtAiRules: "60", webBotAuth: "1", x402: "0" },
    },
  };
  const current = readinessItems(currentPayload);
  const previous = readinessItems(previousPayload);
  const groups = groupedReadiness(current, previous);
  const policyRules = groups.flatMap((group) => group.items).find((item) => item.key === "robotsTxtAiRules");
  assert.equal(policyRules.value, 80);
  assert.equal(policyRules.previousValue, 75);
  assert.equal(policyRules.changePp, 5);
}

{
  const unavailable = await __test.safely("Example", async () => {
    throw new Error("upstream failed");
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.error, "Example unavailable");
  assert.equal(unavailable.reason, "upstream failed");
}

{
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  const ok = (result) => ({
    ok: true,
    status: 200,
    async json() {
      return { success: true, result };
    },
  });
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requestedUrls.push(url);
    const path = url.pathname.replace("/client/v4", "");
    const names = url.searchParams.getAll("name");
    if (path === "/radar/bots") {
      return ok({
        bots: [
          {
            category: "AI_CRAWLER",
            name: "GPTBot",
            userAgentPatterns: ["GPTBot"],
          },
        ],
      });
    }
    if (
      (path === "/radar/ai/bots/timeseries" || path === "/radar/bots/timeseries")
      && names.includes("current")
    ) {
      return ok({
        current: { timestamps: ["2026-07-01", "2026-07-08"], values: ["0.8", "1"] },
        control: { timestamps: ["2026-04-01", "2026-04-08"], values: ["0.4", "0.5"] },
        meta: { normalization: "MIN0_MAX", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/ai/bots/timeseries" || path === "/radar/bots/timeseries") {
      const result = { meta: { normalization: "MIN0_MAX", lastUpdated: "2026-07-20" } };
      names.forEach((name) => {
        result[name] = { timestamps: ["2026-07-01"], values: ["0.5"] };
      });
      return ok(result);
    }
    if (path === "/radar/ai/bots/summary/CRAWL_PURPOSE") {
      return ok({
        current: { Training: "45", "Mixed Purpose": "40", Search: "10", "User Action": "5" },
        control: { Training: "42", "Mixed Purpose": "41", Search: "12", "User Action": "5" },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/ai/bots/timeseries_groups/CRAWL_PURPOSE") {
      return ok({
        purpose: {
          timestamps: ["2026-07-01", "2026-07-08"],
          Training: ["44", "45"],
          "Mixed Purpose": ["41", "40"],
          Search: ["10", "10"],
          "User Action": ["5", "5"],
        },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/ai/bots/summary/RESPONSE_STATUS_CATEGORY") {
      return ok({
        current: { "2xx": "75", "3xx": "10", "4xx": "14", "5xx": "1" },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/ai/bots/summary/RESPONSE_STATUS") {
      return ok({
        current: { 200: "75", 301: "10", 401: "1", 403: "2", 404: "10", 429: "1", 500: "1" },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/ai/bots/timeseries_groups/RESPONSE_STATUS_CATEGORY") {
      return ok({
        outcomes: {
          timestamps: ["2026-07-01", "2026-07-08"],
          "2xx": ["74", "75"],
          "3xx": ["10", "10"],
          "4xx": ["15", "14"],
          "5xx": ["1", "1"],
        },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/bots/summary/BOT_OPERATOR" && names.includes("crawler")) {
      return ok({
        crawler: { OpenAI: "50", Anthropic: "30", Google: "20" },
        assistant: { OpenAI: "60", Perplexity: "40" },
        search: { Google: "70", Perplexity: "30" },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/bots/summary/BOT_OPERATOR") {
      return ok({
        operators: { OpenAI: "50", Anthropic: "30", Google: "20" },
        meta: { normalization: "PERCENTAGE", lastUpdated: "2026-07-20" },
      });
    }
    if (path === "/radar/agent_readiness/summary/CHECK" && url.searchParams.has("date")) {
      return ok({
        previous: { robotsTxtAiRules: "60", webBotAuth: "1" },
        meta: { successfulDomains: 80, totalDomains: 120, date: "2026-07-13" },
      });
    }
    if (path === "/radar/agent_readiness/summary/CHECK") {
      return ok({
        current: { robotsTxtAiRules: "80", webBotAuth: "2" },
        meta: { successfulDomains: 100, totalDomains: 150, date: "2026-07-20" },
      });
    }
    if (path === "/radar/ai/markdown_for_agents/summary") throw new Error("efficiency endpoint failed");
    throw new Error(`Unexpected mock URL ${url}`);
  };

  try {
    const payload = await __test.buildSignals(12, "global", "all", "test-token");
    assert.equal(payload.schemaVersion, 2);
    assert.equal(payload.demandComparison.periodChangePct, 100);
    assert.equal(payload.purposeTrend.items.find((item) => item.key === "Training").changePp, 3);
    assert.equal(payload.accessOutcomes.constrainedShare, 4);
    assert.equal(payload.operators.available, true);
    assert.equal(payload.operators.segments.length, 3);
    assert.equal(payload.efficiency.available, false, "A partial upstream failure must remain section-local");
    assert.equal(payload.readiness.groups.flatMap((group) => group.items).find((item) => item.key === "robotsTxtAiRules").changePp, 5);

    const demandRequest = requestedUrls.find((url) => (
      url.pathname.endsWith("/radar/ai/bots/timeseries")
      && url.searchParams.getAll("name").includes("current")
    ));
    assert.deepEqual(demandRequest.searchParams.getAll("dateRange"), ["12w", "12wcontrol"]);
    assert.deepEqual(demandRequest.searchParams.getAll("botCategory"), []);

    const geographyRequest = requestedUrls.find((url) => (
      url.pathname.endsWith("/radar/ai/bots/timeseries")
      && url.searchParams.getAll("name").includes("gb")
    ));
    assert.deepEqual(geographyRequest.searchParams.getAll("location"), ["GB", "US", "DE", "FR", "JP", "IN"]);
    assert.equal(
      requestedUrls.filter((url) => url.pathname.endsWith("/radar/ai/bots/timeseries") && url.searchParams.getAll("name").includes("gb")).length,
      1,
      "All geography series must be requested together"
    );

    const crawlerPayload = await __test.buildSignals(12, "global", "crawler", "test-token");
    assert.deepEqual(crawlerPayload.request.agentCategories, ["AI_CRAWLER"]);
    assert.equal(crawlerPayload.request.mappedUserAgents, 1);
    assert.equal(crawlerPayload.purposeTrend.incompatible, true);
    assert.equal(crawlerPayload.accessOutcomes.incompatible, true);

    const crawlerDemandRequest = requestedUrls.find((url) => (
      url.pathname.endsWith("/radar/bots/timeseries")
      && url.searchParams.getAll("botCategory").includes("AI_CRAWLER")
    ));
    assert.ok(crawlerDemandRequest, "Crawler demand queries must use the native AI_CRAWLER category");

    const crawlerPurposeRequest = requestedUrls.find((url) => (
      url.pathname.endsWith("/radar/ai/bots/summary/CRAWL_PURPOSE")
      && url.searchParams.getAll("userAgent").includes("GPTBot")
    ));
    assert.equal(crawlerPurposeRequest, undefined, "Incomplete category aggregates must not be requested");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log("Radar Signals tests passed");
