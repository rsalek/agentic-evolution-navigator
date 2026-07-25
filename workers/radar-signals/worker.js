const RADAR_API = "https://api.cloudflare.com/client/v4";
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
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
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

function firstResultSeries(result) {
  const key = Object.keys(result || {}).find((candidate) => candidate !== "meta");
  return key ? result[key] : null;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function friendlyLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bHtml\b/g, "HTML")
    .replace(/\bHttp\b/g, "HTTP")
    .replace(/\bSeo\b/g, "SEO")
    .replace(/^Robots Txt$/, "robots.txt");
}

function summaryItems(payload) {
  const summary = firstResultSeries(payload.result) || {};
  return Object.entries(summary)
    .map(([key, value]) => ({ key, label: friendlyLabel(key), value: numberValue(value) }))
    .filter((item) => item.value != null)
    .sort((left, right) => right.value - left.value);
}

function metadata(payload) {
  return payload.result && payload.result.meta ? payload.result.meta : {};
}

async function radarFetch(pathname, parameters, token) {
  const url = new URL(RADAR_API + pathname);
  Object.entries(parameters).forEach(([name, value]) => {
    if (value != null && value !== "") url.searchParams.set(name, value);
  });
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const message = payload.errors && payload.errors[0] && payload.errors[0].message;
    throw new Error(message || `Radar request failed with HTTP ${response.status}`);
  }
  return payload;
}

async function locationSeries(location, period, token) {
  const [code, name, color] = location;
  const payload = await radarFetch("/radar/ai/bots/timeseries", {
    dateRange: `${period}w`,
    aggInterval: "1w",
    location: code,
    name: "series",
  }, token);
  const series = firstResultSeries(payload.result) || {};
  return {
    code,
    name,
    color,
    timestamps: Array.isArray(series.timestamps) ? series.timestamps : [],
    values: Array.isArray(series.values) ? series.values.map(numberValue).filter((value) => value != null) : [],
    meta: metadata(payload),
  };
}

function successfulShare(items) {
  const success = items.find((item) => /success|2xx|200/i.test(item.key));
  return success ? success.value : null;
}

async function buildSignals(period, region, token) {
  const locations = REGION_LOCATIONS[region];
  const common = { dateRange: `${period}w`, name: "summary" };
  const [
    activityPayload,
    purposePayload,
    statusPayload,
    readinessPayload,
    markdownPayload,
    geographySeries,
  ] = await Promise.all([
    radarFetch("/radar/ai/bots/timeseries", { ...common, aggInterval: "1w", name: "activity" }, token),
    radarFetch("/radar/ai/bots/summary/CRAWL_PURPOSE", common, token),
    radarFetch("/radar/ai/bots/summary/RESPONSE_STATUS_CATEGORY", common, token),
    radarFetch("/radar/agent_readiness/summary/CHECK", { name: "readiness" }, token),
    radarFetch("/radar/ai/markdown_for_agents/summary", common, token),
    Promise.all(locations.map((location) => locationSeries(location, period, token))),
  ]);

  const activitySeries = firstResultSeries(activityPayload.result) || {};
  const activityValues = Array.isArray(activitySeries.values)
    ? activitySeries.values.map(numberValue).filter((value) => value != null)
    : [];
  const purposes = summaryItems(purposePayload);
  const statuses = summaryItems(statusPayload);
  const readinessMeta = metadata(readinessPayload);
  const readiness = summaryItems(readinessPayload).map((item) => ({
    ...item,
    count: item.value,
    value: readinessMeta.successfulDomains
      ? item.value / readinessMeta.successfulDomains * 100
      : null,
  })).filter((item) => item.value != null);
  const markdownSummary = firstResultSeries(markdownPayload.result) || {};

  return {
    schemaVersion: 1,
    source: "Cloudflare Radar",
    fetchedAt: new Date().toISOString(),
    request: { period, region, agent: "all" },
    activity: {
      timestamps: Array.isArray(activitySeries.timestamps) ? activitySeries.timestamps : [],
      values: activityValues,
      meta: metadata(activityPayload),
    },
    geography: {
      series: geographySeries,
      meta: geographySeries[0] ? geographySeries[0].meta : {},
    },
    purpose: { items: purposes, meta: metadata(purposePayload) },
    access: {
      items: statuses,
      successfulShare: successfulShare(statuses),
      meta: metadata(statusPayload),
    },
    readiness: {
      items: readiness,
      successfulDomains: readinessMeta.successfulDomains || null,
      totalDomains: readinessMeta.totalDomains || null,
      scanDate: readinessMeta.date || null,
      meta: readinessMeta,
    },
    markdown: {
      reductionRatio: numberValue(markdownSummary.value),
      meta: metadata(markdownPayload),
    },
    value: {
      available: false,
      reason: "Cloudflare Radar does not provide attributable publisher referral, conversion, or revenue data.",
    },
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
    if (![6, 8, 12].includes(period) || !REGION_LOCATIONS[region]) {
      return json({ error: "Unsupported period or region" }, 400, cors);
    }

    const cacheKey = new Request(`${url.origin}/signals?period=${period}&region=${region}`);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      Object.entries(cors).forEach(([name, value]) => response.headers.set(name, value));
      response.headers.set("X-Signals-Cache", "HIT");
      return response;
    }

    try {
      const payload = await buildSignals(period, region, env.CLOUDFLARE_API_TOKEN);
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
