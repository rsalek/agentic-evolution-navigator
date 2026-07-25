export const AGENT_CATEGORIES = Object.freeze({
  all: ["AI_CRAWLER", "AI_ASSISTANT", "AI_SEARCH"],
  crawler: ["AI_CRAWLER"],
  assistant: ["AI_ASSISTANT"],
  search: ["AI_SEARCH"],
});

export const READINESS_GROUPS = Object.freeze([
  {
    key: "policy",
    label: "Policy and disclosure",
    checks: ["robotsTxt", "robotsTxtAiRules", "contentSignals"],
  },
  {
    key: "delivery",
    label: "Discoverability and delivery",
    checks: ["sitemap", "linkHeaders", "markdownNegotiation", "apiCatalog"],
  },
  {
    key: "identity",
    label: "Identity and authorization",
    checks: ["oauthDiscovery", "oauthProtectedResource", "webBotAuth"],
  },
  {
    key: "transaction",
    label: "Transaction readiness",
    checks: ["ucp", "acp", "mpp", "ap2", "x402"],
  },
]);

export function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function round(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(digits));
}

export function friendlyLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bApi\b/g, "API")
    .replace(/\bHtml\b/g, "HTML")
    .replace(/\bHttp\b/g, "HTTP")
    .replace(/\bOauth\b/g, "OAuth")
    .replace(/\bMcp\b/g, "MCP")
    .replace(/\bUcp\b/g, "UCP")
    .replace(/\bAcp\b/g, "ACP")
    .replace(/\bMpp\b/g, "MPP")
    .replace(/\bAp2\b/g, "AP2")
    .replace(/^Robots Txt$/, "robots.txt")
    .replace(/^Robots Txt AI Rules$/, "robots.txt AI rules");
}

export function resultSeries(payload) {
  return Object.fromEntries(
    Object.entries(payload && payload.result || {}).filter(([key]) => key !== "meta")
  );
}

export function firstResultSeries(payload) {
  return Object.values(resultSeries(payload))[0] || null;
}

export function metadata(payload) {
  return payload && payload.result && payload.result.meta ? payload.result.meta : {};
}

export function summaryItemsFromSeries(series) {
  return Object.entries(series || {})
    .map(([key, value]) => ({ key, label: friendlyLabel(key), value: numberValue(value) }))
    .filter((item) => item.value != null)
    .sort((left, right) => right.value - left.value);
}

export function summaryItems(payload, name) {
  const series = name ? resultSeries(payload)[name] : firstResultSeries(payload);
  return summaryItemsFromSeries(series);
}

export function timeSeries(series) {
  return {
    timestamps: Array.isArray(series && series.timestamps) ? series.timestamps : [],
    values: Array.isArray(series && series.values)
      ? series.values.map(numberValue).filter((value) => value != null)
      : [],
  };
}

export function groupedTimeSeries(payload, name) {
  const source = name ? resultSeries(payload)[name] : firstResultSeries(payload);
  if (!source) return { timestamps: [], groups: [] };
  const timestamps = Array.isArray(source.timestamps) ? source.timestamps : [];
  const groups = Object.entries(source)
    .filter(([key, value]) => key !== "timestamps" && Array.isArray(value))
    .map(([key, values]) => ({
      key,
      label: friendlyLabel(key),
      values: values.map(numberValue).filter((value) => value != null),
    }))
    .filter((group) => group.values.length)
    .sort((left, right) => {
      const leftLatest = left.values.at(-1) || 0;
      const rightLatest = right.values.at(-1) || 0;
      return rightLatest - leftLatest;
    });
  return { timestamps, groups };
}

export function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function comparableChange(currentValues, controlValues) {
  const current = mean(currentValues);
  const control = mean(controlValues);
  if (current == null || control == null || control === 0) return null;
  return round((current - control) / Math.abs(control) * 100, 1);
}

export function compareSummaries(currentItems, controlItems) {
  const control = new Map((controlItems || []).map((item) => [item.key, item.value]));
  return (currentItems || []).map((item) => ({
    ...item,
    previousValue: control.has(item.key) ? control.get(item.key) : null,
    changePp: control.has(item.key) ? round(item.value - control.get(item.key), 1) : null,
  }));
}

export function accessBreakdown(categoryItems, statusItems) {
  const categories = new Map((categoryItems || []).map((item) => [String(item.key).toLowerCase(), item.value]));
  const statuses = new Map((statusItems || []).map((item) => [String(item.key), item.value]));
  const constrained = ["401", "403", "429"].reduce((sum, code) => sum + (statuses.get(code) || 0), 0);
  const clientErrors = categories.get("4xx") || 0;
  const served = categories.get("2xx") || 0;
  const redirected = categories.get("3xx") || 0;
  const serverFailure = categories.get("5xx") || 0;
  const informational = categories.get("1xx") || 0;
  return [
    { key: "served", label: "Served (2xx)", value: round(served, 2), codes: ["2xx"] },
    { key: "redirected", label: "Redirected (3xx)", value: round(redirected, 2), codes: ["3xx"] },
    {
      key: "constrained",
      label: "Access-constrained proxy",
      value: round(constrained, 2),
      codes: ["401", "403", "429"],
    },
    {
      key: "otherClient",
      label: "Other client errors",
      value: round(Math.max(0, clientErrors - constrained), 2),
      codes: ["remaining 4xx"],
    },
    { key: "server", label: "Server failure (5xx)", value: round(serverFailure, 2), codes: ["5xx"] },
    { key: "informational", label: "Informational (1xx)", value: round(informational, 2), codes: ["1xx"] },
  ].filter((item) => item.value > 0);
}

export function readinessItems(payload) {
  const meta = metadata(payload);
  const successful = numberValue(meta.successfulDomains);
  return summaryItems(payload).map((item) => ({
    ...item,
    count: item.value,
    value: successful ? item.value / successful * 100 : null,
  })).filter((item) => item.value != null);
}

export function groupedReadiness(currentItems, previousItems) {
  const current = new Map((currentItems || []).map((item) => [item.key, item]));
  const previous = new Map((previousItems || []).map((item) => [item.key, item]));
  return READINESS_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    items: group.checks.map((key) => {
      const item = current.get(key);
      if (!item) return null;
      const prior = previous.get(key);
      return {
        ...item,
        previousValue: prior ? prior.value : null,
        changePp: prior ? round(item.value - prior.value, 2) : null,
      };
    }).filter(Boolean),
  })).filter((group) => group.items.length);
}

export function topConcentration(items, count = 3) {
  return round((items || []).slice(0, count).reduce((sum, item) => sum + item.value, 0), 1);
}

export function previousIsoDate(value, days = 7) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
