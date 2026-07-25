import {
  AGENT_CATEGORIES,
  accessBreakdown,
  comparableChange,
  compareSummaries,
  firstResultSeries,
  groupedReadiness,
  groupedTimeSeries,
  metadata,
  numberValue,
  previousIsoDate,
  readinessItems,
  resultSeries,
  summaryItems,
  summaryItemsFromSeries,
  timeSeries,
  topConcentration,
} from "./core.js";

const RADAR_API = "https://api.cloudflare.com/client/v4";
const CACHE_SCHEMA = "2.2";
const DEFAULT_ORIGINS = Object.freeze([
  "https://rsalek.github.io",
  "http://127.0.0.1:8767",
  "http://localhost:8767",
]);
const REGION_LOCATIONS = Object.freeze({
  global: [
    ["GB", "United Kingdom", "#1f766b"],
    ["US", "United States", "#287095"],
    ["DE", "Germany", "#a54f0c"],
    ["FR", "France", "#6b5ca5"],
    ["JP", "Japan", "#b5365a"],
    ["IN", "India", "#398f88"],
  ],
  europe: [
    ["GB", "United Kingdom", "#1f766b"],
    ["DE", "Germany", "#a54f0c"],
    ["FR", "France", "#6b5ca5"],
  ],
  asia: [
    ["JP", "Japan", "#b5365a"],
    ["IN", "India", "#398f88"],
  ],
  anglosphere: [
    ["GB", "United Kingdom", "#1f766b"],
    ["US", "United States", "#287095"],
  ],
});

function corsHeaders(origin, allowedOrigins) {
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Signals-Cache",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function appendParameter(url, name, value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (entry != null && entry !== "") url.searchParams.append(name, entry);
    });
    return;
  }
  if (value != null && value !== "") url.searchParams.set(name, value);
}

function signalsCacheKey(origin, period, region, agent) {
  return `${origin}/signals?period=${period}&region=${region}&agent=${agent}&schema=${CACHE_SCHEMA}`;
}

async function radarFetch(pathname, parameters, token) {
  const url = new URL(RADAR_API + pathname);
  Object.entries(parameters || {}).forEach(([name, value]) => appendParameter(url, name, value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const message = payload.errors && payload.errors[0] && payload.errors[0].message;
    throw new Error(message || `Radar request failed with HTTP ${response.status}`);
  }
  return payload;
}

function trafficSeriesParameters(period, agent, names, ranges, locations) {
  const params = {
    name: names,
    dateRange: ranges,
    aggInterval: "1w",
  };
  if (agent !== "all") {
    params.botCategory = names.map(() => AGENT_CATEGORIES[agent][0]);
  }
  if (locations) params.location = locations;
  return params;
}

async function agentBots(agent, token) {
  if (agent === "all") return { names: [], userAgents: [] };
  const payloads = await Promise.all(AGENT_CATEGORIES[agent].map((category) => (
    radarFetch("/radar/bots", { botCategory: category, limit: 1000 }, token)
  )));
  const bots = payloads.flatMap((payload) => (
    payload.result && Array.isArray(payload.result.bots) ? payload.result.bots : []
  ));
  return {
    names: [...new Set(bots.map((bot) => bot.name).filter(Boolean))],
    userAgents: [...new Set(
      bots.flatMap((bot) => [bot.name, ...(bot.userAgentPatterns || [])]).filter(Boolean)
    )],
  };
}

function aiParameters(period, userAgents, extra = {}) {
  return {
    dateRange: `${period}w`,
    name: "current",
    ...(userAgents.length ? { userAgent: userAgents.join(",") } : {}),
    ...extra,
  };
}

async function demandComparison(period, region, agent, token) {
  const names = ["current", "control"];
  const ranges = [`${period}w`, `${period}wcontrol`];
  const regionLocations = region === "global" ? null : REGION_LOCATIONS[region].map((location) => location[0]).join(",");
  const locations = regionLocations ? [regionLocations, regionLocations] : null;
  const payload = await radarFetch(
    agent === "all" ? "/radar/ai/bots/timeseries" : "/radar/bots/timeseries",
    trafficSeriesParameters(period, agent, names, ranges, locations),
    token
  );
  const series = resultSeries(payload);
  const current = timeSeries(series.current);
  const control = timeSeries(series.control);
  return {
    available: current.values.length > 0 && control.values.length > 0,
    current,
    control,
    periodChangePct: comparableChange(current.values, control.values),
    meta: metadata(payload),
  };
}

async function geographyComparison(period, region, agent, token) {
  const locations = REGION_LOCATIONS[region];
  const names = locations.map(([code]) => code.toLowerCase());
  const payload = await radarFetch(
    agent === "all" ? "/radar/ai/bots/timeseries" : "/radar/bots/timeseries",
    trafficSeriesParameters(
      period,
      agent,
      names,
      names.map(() => `${period}w`),
      locations.map(([code]) => code)
    ),
    token
  );
  const series = resultSeries(payload);
  return {
    available: names.some((name) => series[name] && Array.isArray(series[name].values)),
    series: locations.map(([code, name, color]) => ({
      code,
      name,
      color,
      ...timeSeries(series[code.toLowerCase()]),
    })),
    meta: metadata(payload),
    comparisonMethod: "All locations requested together on one Cloudflare normalization scale.",
  };
}

async function purposeSignals(period, userAgents, token) {
  const filters = userAgents.length ? userAgents.join(",") : null;
  const summaryPayload = await radarFetch("/radar/ai/bots/summary/CRAWL_PURPOSE", {
    name: ["current", "control"],
    dateRange: [`${period}w`, `${period}wcontrol`],
    ...(filters ? { userAgent: [filters, filters] } : {}),
  }, token);
  const trendPayload = await radarFetch("/radar/ai/bots/timeseries_groups/CRAWL_PURPOSE", aiParameters(
    period,
    userAgents,
    { aggInterval: "1w", normalization: "PERCENTAGE", name: "purpose" }
  ), token);
  const current = summaryItems(summaryPayload, "current");
  const control = summaryItems(summaryPayload, "control");
  return {
    available: current.length > 0,
    items: compareSummaries(current, control),
    trend: groupedTimeSeries(trendPayload, "purpose"),
    meta: metadata(summaryPayload),
    trendMeta: metadata(trendPayload),
  };
}

async function accessSignals(period, userAgents, token) {
  const common = aiParameters(period, userAgents);
  const [categoryPayload, statusPayload, trendPayload] = await Promise.all([
    radarFetch("/radar/ai/bots/summary/RESPONSE_STATUS_CATEGORY", common, token),
    radarFetch("/radar/ai/bots/summary/RESPONSE_STATUS", common, token),
    radarFetch("/radar/ai/bots/timeseries_groups/RESPONSE_STATUS_CATEGORY", {
      ...common,
      aggInterval: "1w",
      normalization: "PERCENTAGE",
      name: "outcomes",
    }, token),
  ]);
  const categories = summaryItems(categoryPayload);
  const statuses = summaryItems(statusPayload);
  const outcomes = accessBreakdown(categories, statuses);
  return {
    available: categories.length > 0,
    outcomes,
    categories,
    statusCodes: statuses,
    constrainedShare: outcomes.find((item) => item.key === "constrained")?.value ?? null,
    successfulShare: categories.find((item) => String(item.key).toLowerCase() === "2xx")?.value ?? null,
    trend: groupedTimeSeries(trendPayload, "outcomes"),
    meta: metadata(categoryPayload),
    statusMeta: metadata(statusPayload),
    trendMeta: metadata(trendPayload),
  };
}

async function operatorSignals(period, region, agent, token) {
  const location = region === "global" ? null : REGION_LOCATIONS[region].map(([code]) => code).join(",");
  if (agent === "all") {
    const names = ["crawler", "assistant", "search"];
    const payload = await radarFetch("/radar/bots/summary/BOT_OPERATOR", {
      name: names,
      dateRange: names.map(() => `${period}w`),
      botCategory: AGENT_CATEGORIES.all,
      ...(location ? { location: names.map(() => location) } : {}),
      limitPerGroup: 12,
    }, token);
    const series = resultSeries(payload);
    const segments = names.map((name, index) => {
      const items = summaryItemsFromSeries(series[name]);
      return {
        key: name,
        label: `${name[0].toUpperCase()}${name.slice(1)} operators`,
        category: AGENT_CATEGORIES.all[index],
        items,
        topThreeShare: topConcentration(items),
      };
    }).filter((segment) => segment.items.length);
    return {
      available: segments.length > 0,
      segments,
      items: [],
      topThreeShare: null,
      meta: metadata(payload),
      comparisonMethod: "Operator shares are shown within each native AI category; they are not combined across independently normalized categories.",
    };
  }
  const payload = await radarFetch("/radar/bots/summary/BOT_OPERATOR", {
    dateRange: `${period}w`,
    name: "operators",
    botCategory: AGENT_CATEGORIES[agent][0],
    ...(location ? { location } : {}),
    limitPerGroup: 12,
  }, token);
  const items = summaryItems(payload);
  return {
    available: items.length > 0,
    items,
    topThreeShare: topConcentration(items),
    meta: metadata(payload),
  };
}

async function readinessSignals(token) {
  const currentPayload = await radarFetch("/radar/agent_readiness/summary/CHECK", { name: "current" }, token);
  const currentMeta = metadata(currentPayload);
  const previousDate = previousIsoDate(currentMeta.date);
  const previousPayload = previousDate
    ? await radarFetch("/radar/agent_readiness/summary/CHECK", { name: "previous", date: previousDate }, token)
    : null;
  const currentItems = readinessItems(currentPayload);
  const previousItems = previousPayload ? readinessItems(previousPayload) : [];
  const successful = numberValue(currentMeta.successfulDomains);
  const total = numberValue(currentMeta.totalDomains);
  return {
    available: currentItems.length > 0,
    groups: groupedReadiness(currentItems, previousItems),
    items: currentItems,
    previousItems,
    successfulDomains: successful,
    totalDomains: total,
    scanCoveragePct: successful && total ? successful / total * 100 : null,
    scanDate: currentMeta.date || null,
    previousScanDate: previousPayload ? metadata(previousPayload).date || null : null,
    meta: currentMeta,
  };
}

async function efficiencySignals(period, userAgents, token) {
  const payload = await radarFetch(
    "/radar/ai/markdown_for_agents/summary",
    aiParameters(period, userAgents),
    token
  );
  const summary = firstResultSeries(payload) || {};
  return {
    available: numberValue(summary.value) != null,
    markdownReductionRatio: numberValue(summary.value),
    meta: metadata(payload),
  };
}

async function safely(name, operation) {
  try {
    return await operation();
  } catch (error) {
    return {
      available: false,
      error: `${name} unavailable`,
      reason: error instanceof Error ? error.message : "Unknown upstream error",
    };
  }
}

async function buildSignals(period, region, agent, token) {
  const botMapping = await safely("Agent category mapping", () => agentBots(agent, token));
  const mappedAgents = botMapping.available === false ? [] : botMapping.userAgents;
  const mappedBots = botMapping.available === false ? [] : botMapping.names;
  const agentMappingAvailable = agent === "all" || mappedAgents.length > 0;
  const trafficUserAgents = agent === "all" ? [] : mappedAgents;
  const categoryAggregateUnavailable = {
    available: false,
    incompatible: true,
    reason: "Cloudflare Radar does not expose native bot-category filters for this AI endpoint, and the complete user-agent set exceeds its 100-character filter limit.",
  };
  const [
    demand,
    geography,
    purpose,
    access,
    operators,
    readiness,
    efficiency,
  ] = await Promise.all([
    safely("Demand comparison", () => demandComparison(period, region, agent, token)),
    safely("Geography comparison", () => geographyComparison(period, region, agent, token)),
    agent === "all"
      ? safely("Purpose trend", () => purposeSignals(period, trafficUserAgents, token))
      : Promise.resolve(categoryAggregateUnavailable),
    agent === "all"
      ? safely("Access outcomes", () => accessSignals(period, trafficUserAgents, token))
      : Promise.resolve(categoryAggregateUnavailable),
    safely("Operator concentration", () => operatorSignals(period, region, agent, token)),
    safely("Readiness scan", () => readinessSignals(token)),
    agentMappingAvailable
      ? safely("Markdown efficiency", () => efficiencySignals(period, trafficUserAgents, token))
      : Promise.resolve({ available: false, reason: "No Radar user-agent mapping was returned for this agent category." }),
  ]);

  const activity = demand.available ? {
    timestamps: demand.current.timestamps,
    values: demand.current.values,
    meta: demand.meta,
  } : { timestamps: [], values: [], meta: {} };
  const purposeV1 = purpose.available ? { items: purpose.items, meta: purpose.meta } : { items: [], meta: {} };
  const accessV1 = access.available ? {
    items: access.categories,
    successfulShare: access.successfulShare,
    meta: access.meta,
  } : { items: [], successfulShare: null, meta: {} };
  const readinessV1 = readiness.available ? {
    items: readiness.items,
    successfulDomains: readiness.successfulDomains,
    totalDomains: readiness.totalDomains,
    scanDate: readiness.scanDate,
    meta: readiness.meta,
  } : { items: [], successfulDomains: null, totalDomains: null, scanDate: null, meta: {} };

  return {
    schemaVersion: 2,
    source: "Cloudflare Radar",
    fetchedAt: new Date().toISOString(),
    request: {
      period,
      region,
      agent,
      agentCategories: AGENT_CATEGORIES[agent],
      mappedUserAgents: mappedAgents.length,
      mappedBots: mappedBots.length,
    },
    demandComparison: demand,
    purposeTrend: purpose,
    accessOutcomes: access,
    operators,
    geography,
    readiness,
    efficiency,
    valueBoundary: {
      available: false,
      reason: "Cloudflare Radar does not provide attributable publisher referral, conversion, revenue, licensing, or serving-cost data.",
      requiredEvidence: [
        "Attributable publisher referral",
        "Conversion or task completion",
        "Revenue or paid access",
        "Serving cost",
      ],
    },
    methodology: {
      demand: "Current and preceding periods are requested together and share one Cloudflare MIN0_MAX normalization scale.",
      geography: "Locations are requested together and share one Cloudflare normalization scale.",
      purpose: "Cloudflare-classified share of identified AI-bot requests.",
      access: "HTTP outcomes; 401, 403, and 429 are grouped only as an access-constrained proxy.",
      readiness: "Weekly global bulk scan; not filtered by traffic geography or agent category.",
    },
    // Schema v1 compatibility fields. Remove after the updated Pages client has
    // been live for at least one release.
    activity,
    purpose: purposeV1,
    access: accessV1,
    markdown: {
      reductionRatio: efficiency.markdownReductionRatio ?? null,
      meta: efficiency.meta || {},
    },
    value: {
      available: false,
      reason: "Cloudflare Radar does not provide attributable publisher referral, conversion, or revenue data.",
    },
    readinessV1,
  };
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const allowedOrigins = String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || DEFAULT_ORIGINS.join(","))
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const origin = request.headers.get("Origin") || allowedOrigins[0];
    const cors = corsHeaders(origin, allowedOrigins);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, cors);
    if (url.pathname !== "/" && url.pathname !== "/signals") return json({ error: "Not found" }, 404, cors);
    if (!env.CLOUDFLARE_API_TOKEN) return json({ error: "Radar API token is not configured" }, 503, cors);

    const period = Number(url.searchParams.get("period") || 12);
    const region = url.searchParams.get("region") || "global";
    const agent = url.searchParams.get("agent") || "all";
    if (![6, 8, 12].includes(period) || !REGION_LOCATIONS[region] || !AGENT_CATEGORIES[agent]) {
      return json({ error: "Unsupported period, region, or agent category" }, 400, cors);
    }

    const cacheKey = new Request(signalsCacheKey(url.origin, period, region, agent));
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      Object.entries(cors).forEach(([name, value]) => response.headers.set(name, value));
      response.headers.set("X-Signals-Cache", "HIT");
      return response;
    }

    try {
      const payload = await buildSignals(period, region, agent, env.CLOUDFLARE_API_TOKEN);
      const coreAvailable = [
        payload.demandComparison,
        payload.purposeTrend,
        payload.accessOutcomes,
      ].some((section) => section.available);
      if (!coreAvailable) throw new Error("All core Radar signal sections were unavailable");
      const response = json(payload, 200, {
        ...cors,
        "Cache-Control": `public, max-age=${Number(env.CACHE_SECONDS) || 900}`,
        "X-Signals-Cache": "MISS",
      });
      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      return json({
        error: "Unable to refresh Radar data",
        detail: error instanceof Error ? error.message : "Unknown upstream error",
      }, 502, cors);
    }
  },
};

export const __test = Object.freeze({
  appendParameter,
  agentBots,
  buildSignals,
  safely,
  signalsCacheKey,
  trafficSeriesParameters,
});
