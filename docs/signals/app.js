(function signalsApplication() {
  "use strict";

  const SIGNALS = ["demand", "purpose", "access", "operators", "geography", "readiness"];
  const LEGACY_SIGNAL_MAP = { value: "demand", friction: "access" };
  const REGION_LABELS = {
    global: "Global comparison",
    europe: "Europe",
    asia: "Asia",
    anglosphere: "United Kingdom + United States",
  };
  const AGENT_LABELS = {
    all: "All identified AI agents",
    crawler: "AI crawlers",
    assistant: "AI assistants",
    search: "AI search",
  };
  const COLORS = {
    current: "#a54f0c",
    control: "#8f8881",
    Training: "#a54f0c",
    "Mixed Purpose": "#6b5ca5",
    Search: "#287095",
    "User Action": "#1f766b",
    Undeclared: "#a89d94",
    "2xx": "#1f766b",
    "3xx": "#287095",
    "4xx": "#b86b2d",
    "5xx": "#b5365a",
    "1xx": "#a89d94",
  };
  const ACCESS_GROUPS = {
    "2xx": { label: "Served successfully (2xx)", color: "#1f766b" },
    success: { label: "Served successfully (2xx)", color: "#1f766b" },
    "3xx": { label: "Redirected (3xx)", color: "#287095" },
    redirection: { label: "Redirected (3xx)", color: "#287095" },
    "4xx": { label: "Client response (4xx)", color: "#b86b2d" },
    client_error: { label: "Client response (4xx)", color: "#b86b2d" },
    "5xx": { label: "Server failure (5xx)", color: "#b5365a" },
    server_error: { label: "Server failure (5xx)", color: "#b5365a" },
    "1xx": { label: "Informational (1xx)", color: "#a89d94" },
    informational: { label: "Informational (1xx)", color: "#a89d94" },
  };

  const state = {
    data: null,
    selectedSignal: "demand",
    view: "observatory",
    loading: false,
    cacheStatus: null,
    geographyMode: "trend",
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function finite(value) {
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function round(value, digits) {
    const numeric = finite(value);
    return numeric == null ? null : Number(numeric.toFixed(digits == null ? 1 : digits));
  }

  function signed(value, suffix) {
    const numeric = round(value, 1);
    if (numeric == null) return "—";
    return `${numeric > 0 ? "+" : ""}${numeric}${suffix || ""}`;
  }

  function percent(value, digits) {
    const numeric = round(value, digits == null ? 1 : digits);
    return numeric == null ? "—" : `${numeric}%`;
  }

  function compact(value) {
    const numeric = finite(value);
    if (numeric == null) return "—";
    return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(numeric);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function firstDateRange(meta) {
    const range = meta && meta.dateRange;
    if (Array.isArray(range)) return range[0] || null;
    return range || null;
  }

  function formatRange(meta) {
    const range = firstDateRange(meta);
    if (!range) return "Selected period";
    return `${formatDate(range.startTime)} – ${formatDate(range.endTime)}`;
  }

  function sourceUpdated(section) {
    return section && section.meta && section.meta.lastUpdated
      || state.data && state.data.fetchedAt
      || null;
  }

  function currentScope(includeReadinessBoundary) {
    const period = $("#period-filter").value;
    const region = $("#region-filter").value;
    const agent = $("#agent-filter").value;
    if (includeReadinessBoundary) return "Global weekly domain scan · traffic filters do not apply";
    return `${REGION_LABELS[region]} · ${AGENT_LABELS[agent]} · ${period} weeks`;
  }

  function showNotice(message, tone) {
    const notice = $("#data-notice");
    notice.hidden = !message;
    notice.textContent = message || "";
    notice.dataset.tone = tone || "info";
  }

  function unavailableSection(reason) {
    return { available: false, reason: reason || "This Radar section is unavailable." };
  }

  function friendlyLabel(value) {
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .replace(/\bAi\b/g, "AI")
      .replace(/\bOauth\b/g, "OAuth")
      .replace(/\bApi\b/g, "API")
      .replace(/^Robots Txt$/, "robots.txt")
      .replace(/^Robots Txt AI Rules$/, "robots.txt AI rules");
  }

  function accessFromCategories(items) {
    const map = new Map((items || []).map((item) => [String(item.key).toLowerCase(), finite(item.value) || 0]));
    return [
      { key: "served", label: "Served (2xx)", value: map.get("2xx") || 0 },
      { key: "redirected", label: "Redirected (3xx)", value: map.get("3xx") || 0 },
      { key: "client", label: "Client errors (4xx)", value: map.get("4xx") || 0 },
      { key: "server", label: "Server failure (5xx)", value: map.get("5xx") || 0 },
    ].filter((item) => item.value > 0);
  }

  function readinessGroupsFromItems(items) {
    const definitions = [
      ["Policy and disclosure", ["robotsTxt", "robotsTxtAiRules", "contentSignals"]],
      ["Discoverability and delivery", ["sitemap", "linkHeaders", "markdownNegotiation", "apiCatalog"]],
      ["Identity and authorization", ["oauthDiscovery", "oauthProtectedResource", "webBotAuth"]],
      ["Transaction readiness", ["ucp", "acp", "mpp", "ap2", "x402"]],
    ];
    const map = new Map((items || []).map((item) => [item.key, item]));
    return definitions.map(([label, keys]) => ({
      key: label.toLowerCase().replaceAll(" ", "-"),
      label,
      items: keys.map((key) => map.get(key)).filter(Boolean),
    })).filter((group) => group.items.length);
  }

  function adaptVersionOne(payload) {
    const accessItems = payload.access && payload.access.items || [];
    return {
      ...payload,
      schemaVersion: 1,
      demandComparison: payload.activity && payload.activity.values.length ? {
        available: true,
        current: { timestamps: payload.activity.timestamps, values: payload.activity.values },
        control: { timestamps: [], values: [] },
        periodChangePct: null,
        meta: payload.activity.meta || {},
        compatibilityBoundary: "The deployed Worker has not yet supplied a preceding-period comparison.",
      } : unavailableSection("Radar returned no demand series."),
      purposeTrend: payload.purpose && payload.purpose.items.length ? {
        available: true,
        items: payload.purpose.items.map((item) => ({ ...item, changePp: null, previousValue: null })),
        trend: { timestamps: [], groups: [] },
        meta: payload.purpose.meta || {},
        compatibilityBoundary: "The deployed Worker has not yet supplied purpose history or period comparisons.",
      } : unavailableSection("Radar returned no purpose distribution."),
      accessOutcomes: payload.access && accessItems.length ? {
        available: true,
        outcomes: accessFromCategories(accessItems),
        categories: accessItems,
        constrainedShare: null,
        successfulShare: payload.access.successfulShare,
        trend: { timestamps: [], groups: [] },
        meta: payload.access.meta || {},
        compatibilityBoundary: "Exact 401, 403 and 429 shares require the version 2 Worker.",
      } : unavailableSection("Radar returned no access distribution."),
      operators: unavailableSection("Operator concentration requires the version 2 Worker."),
      readiness: payload.readiness ? {
        ...payload.readiness,
        available: Array.isArray(payload.readiness.items) && payload.readiness.items.length > 0,
        groups: readinessGroupsFromItems(payload.readiness.items),
        scanCoveragePct: payload.readiness.successfulDomains && payload.readiness.totalDomains
          ? payload.readiness.successfulDomains / payload.readiness.totalDomains * 100
          : null,
      } : unavailableSection("Radar returned no readiness scan."),
      efficiency: {
        available: payload.markdown && finite(payload.markdown.reductionRatio) != null,
        markdownReductionRatio: payload.markdown && payload.markdown.reductionRatio,
        meta: payload.markdown && payload.markdown.meta || {},
      },
      valueBoundary: {
        available: false,
        reason: payload.value && payload.value.reason || "Cloudflare Radar does not measure attributable publisher value.",
      },
    };
  }

  function validatePayload(payload) {
    return payload
      && payload.source === "Cloudflare Radar"
      && (payload.schemaVersion === 1 || payload.schemaVersion === 2);
  }

  function normalizedData(payload) {
    if (!validatePayload(payload)) throw new Error("Live source returned an unsupported data shape");
    return payload.schemaVersion === 2 ? payload : adaptVersionOne(payload);
  }

  function svgNode(name, attributes, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes || {}).forEach(([key, value]) => node.setAttribute(key, value));
    if (text != null) node.textContent = text;
    return node;
  }

  function renderEmpty(target, message) {
    target.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = message;
    target.append(empty);
  }

  function renderLegend(target, series) {
    target.replaceChildren();
    (series || []).forEach((item) => {
      const label = document.createElement("span");
      const swatch = document.createElement("i");
      swatch.style.background = item.color;
      label.append(swatch, document.createTextNode(item.name));
      target.append(label);
    });
  }

  function linePath(values, bounds, min, max) {
    const range = Math.max(max - min, 0.0001);
    return values.map((value, index) => {
      const x = bounds.left + index / Math.max(values.length - 1, 1) * bounds.width;
      const y = bounds.top + (max - value) / range * bounds.height;
      return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
  }

  function chartLabels(length, labels) {
    if (labels && labels.length === length) return labels;
    return Array.from({ length }, (_, index) => `W${index + 1}`);
  }

  function renderLineChart(target, series, labels, options) {
    const available = (series || []).filter((item) => Array.isArray(item.values) && item.values.length);
    if (!available.length) {
      renderEmpty(target, options && options.empty || "No comparable series available for this scope.");
      return;
    }
    const values = available.flatMap((item) => item.values);
    const config = options || {};
    const min = config.min == null ? Math.min(0, ...values) : config.min;
    const max = config.max == null ? Math.max(...values, min + 1) : config.max;
    const bounds = { left: 54, top: 18, width: 716, height: 220 };
    const svg = svgNode("svg", { viewBox: "0 0 800 276", "aria-hidden": "true" });
    for (let tick = 0; tick < 5; tick += 1) {
      const value = min + (max - min) * (4 - tick) / 4;
      const y = bounds.top + tick / 4 * bounds.height;
      svg.append(svgNode("line", { x1: bounds.left, x2: bounds.left + bounds.width, y1: y, y2: y, class: "chart-grid" }));
      svg.append(svgNode("text", { x: bounds.left - 9, y: y + 4, "text-anchor": "end", class: "axis-label" }, config.tick ? config.tick(value) : round(value, 0)));
    }
    const longest = Math.max(...available.map((item) => item.values.length));
    const xLabels = chartLabels(longest, labels);
    xLabels.forEach((label, index) => {
      if (index !== 0 && index !== xLabels.length - 1 && index % Math.max(1, Math.ceil(xLabels.length / 6)) !== 0) return;
      const x = bounds.left + index / Math.max(xLabels.length - 1, 1) * bounds.width;
      svg.append(svgNode("text", { x, y: 262, "text-anchor": index === 0 ? "start" : index === xLabels.length - 1 ? "end" : "middle", class: "axis-label" }, label));
    });
    available.forEach((item) => {
      svg.append(svgNode("path", {
        d: linePath(item.values, bounds, min, max),
        class: item.dashed ? "series-line dashed" : "series-line",
        stroke: item.color,
      }));
      if (config.points) {
        item.values.forEach((value, index) => {
          const x = bounds.left + index / Math.max(item.values.length - 1, 1) * bounds.width;
          const y = bounds.top + (max - value) / Math.max(max - min, 0.0001) * bounds.height;
          svg.append(svgNode("circle", { cx: x, cy: y, r: 2.5, fill: "#fff", stroke: item.color, "stroke-width": 1.5 }));
        });
      }
    });
    target.replaceChildren(svg);
  }

  function renderStackedChart(target, groups, timestamps) {
    const available = (groups || []).filter((group) => group.values && group.values.length);
    if (!available.length) {
      renderEmpty(target, "Weekly composition requires the version 2 Radar payload.");
      return;
    }
    const length = Math.min(...available.map((group) => group.values.length));
    const bounds = { left: 54, top: 18, width: 716, height: 220 };
    const svg = svgNode("svg", { viewBox: "0 0 800 276", "aria-hidden": "true" });
    [0, 25, 50, 75, 100].forEach((value) => {
      const y = bounds.top + (100 - value) / 100 * bounds.height;
      svg.append(svgNode("line", { x1: bounds.left, x2: bounds.left + bounds.width, y1: y, y2: y, class: "chart-grid" }));
      svg.append(svgNode("text", { x: bounds.left - 9, y: y + 4, "text-anchor": "end", class: "axis-label" }, `${value}%`));
    });
    let lower = Array(length).fill(0);
    available.forEach((group) => {
      const upper = lower.map((value, index) => value + (group.values[index] || 0));
      const topPoints = upper.map((value, index) => {
        const x = bounds.left + index / Math.max(length - 1, 1) * bounds.width;
        const y = bounds.top + (100 - value) / 100 * bounds.height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      const bottomPoints = lower.map((value, index) => {
        const reverse = length - index - 1;
        const x = bounds.left + reverse / Math.max(length - 1, 1) * bounds.width;
        const y = bounds.top + (100 - value) / 100 * bounds.height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      svg.append(svgNode("polygon", {
        points: [...topPoints, ...bottomPoints].join(" "),
        fill: COLORS[group.key] || "#8f8881",
        class: "stacked-area",
      }));
      lower = upper;
    });
    const labels = (timestamps || []).slice(-length).map((value, index) => value ? formatDate(value).replace(/ \d{4}$/, "") : `W${index + 1}`);
    chartLabels(length, labels).forEach((label, index) => {
      if (index !== 0 && index !== length - 1 && index % Math.max(1, Math.ceil(length / 5)) !== 0) return;
      const x = bounds.left + index / Math.max(length - 1, 1) * bounds.width;
      svg.append(svgNode("text", { x, y: 262, "text-anchor": index === 0 ? "start" : index === length - 1 ? "end" : "middle", class: "axis-label" }, label));
    });
    target.replaceChildren(svg);
  }

  function createBar(item, max, options) {
    const row = document.createElement("div");
    row.className = "bar-row";
    const heading = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = item.label;
    const number = document.createElement("strong");
    number.textContent = percent(item.value, options && options.digits);
    heading.append(label, number);
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("i");
    fill.style.width = `${Math.max(0, Math.min(100, item.value / Math.max(max, 0.0001) * 100))}%`;
    track.append(fill);
    row.append(heading, track);
    if (item.changePp != null) {
      const note = document.createElement("small");
      note.textContent = `${signed(item.changePp, " pp")} vs previous scan`;
      row.append(note);
    }
    return row;
  }

  function itemByKey(items, key) {
    return (items || []).find((item) => String(item.key).toLowerCase() === String(key).toLowerCase());
  }

  function accessGroup(group) {
    return ACCESS_GROUPS[String(group && group.key || "").toLowerCase()]
      || { label: group && group.label || "HTTP response", color: "#8f8881" };
  }

  function indexedValues(values) {
    const base = (values || []).find((value) => finite(value) != null && finite(value) !== 0);
    if (base == null) return [];
    return values.map((value) => finite(value) == null ? null : finite(value) / base * 100);
  }

  function renderSummary() {
    const data = state.data;
    if (!data) return;
    const demand = data.demandComparison || {};
    const purpose = data.purposeTrend || {};
    const access = data.accessOutcomes || {};
    const readiness = data.readiness || {};
    const training = itemByKey(purpose.items, "Training");
    const aiRules = itemByKey(readiness.items, "robotsTxtAiRules");

    $("#metric-demand").textContent = demand.periodChangePct == null ? "—" : signed(demand.periodChangePct, "%");
    $("#metric-demand-note").textContent = demand.periodChangePct == null ? "Preceding-period comparison unavailable" : "mean relative request volume";
    $("#metric-purpose").textContent = training ? percent(training.value) : "—";
    $("#metric-purpose-note").textContent = training && training.changePp != null
      ? `${signed(training.changePp, " pp")} vs preceding period`
      : purpose.incompatible
        ? "All-agents scope only"
        : "Mixed Purpose remains separate";
    $("#metric-access").textContent = access.constrainedShare == null ? "—" : percent(access.constrainedShare);
    $("#metric-access-note").textContent = access.constrainedShare == null
      ? access.incompatible ? "All-agents scope only" : "Exact status codes unavailable"
      : "401 + 403 + 429 proxy";
    $("#metric-readiness").textContent = aiRules ? percent(aiRules.value) : "—";
    $("#metric-readiness-note").textContent = readiness.scanDate ? `scan ${formatDate(readiness.scanDate)}` : "Global weekly scan";
  }

  function renderDemand() {
    const data = state.data;
    const demand = data.demandComparison;
    const purpose = data.purposeTrend;
    if (!demand || !demand.available) {
      renderEmpty($("#demand-chart"), demand && demand.reason || "Comparable demand data is unavailable.");
      $("#demand-state").textContent = "Demand comparison unavailable";
      return;
    }
    const currentValues = demand.current.values || [];
    const controlValues = demand.control.values || [];
    const chartSeries = [
      { name: "Current period", color: COLORS.current, values: currentValues.map((value) => value * 100) },
      { name: "Preceding period", color: COLORS.control, values: controlValues.map((value) => value * 100), dashed: true },
    ].filter((series) => series.values.length);
    renderLegend($("#demand-legend"), chartSeries);
    renderLineChart($("#demand-chart"), chartSeries, chartLabels(Math.max(currentValues.length, controlValues.length)), {
      min: 0,
      tick: (value) => round(value, 0),
      points: true,
      empty: "The deployed Worker has not yet supplied a comparable preceding period.",
    });
    const training = itemByKey(purpose && purpose.items, "Training");
    const mixed = itemByKey(purpose && purpose.items, "Mixed Purpose");
    $("#demand-context").textContent = `${formatRange(demand.meta)} · shared ${demand.meta && demand.meta.normalization || "Radar"} scale`;
    $("#demand-state").textContent = demand.periodChangePct == null
      ? "Demand visible · comparison pending"
      : `${signed(demand.periodChangePct, "%")} vs preceding period`;
    $("#demand-evidence").textContent = demand.periodChangePct == null ? "Measured · no control series" : signed(demand.periodChangePct, "%");
    $("#training-evidence").textContent = training ? `${percent(training.value)}${training.changePp == null ? "" : ` · ${signed(training.changePp, " pp")}`}` : "—";
    $("#mixed-evidence").textContent = mixed ? percent(mixed.value) : "—";
    $("#demand-reading").textContent = training
      ? `${training.label}-oriented requests are the largest identified purpose at ${percent(training.value)}, while attributable publisher value remains unmeasured.`
      : "Radar can measure demand and classified intent, but not reciprocal publisher value.";
    $("#demand-boundary").textContent = demand.compatibilityBoundary
      || "Current and preceding periods share one Cloudflare normalization scale. Relative request volume is not absolute global usage.";
    $("#dock-demand").textContent = demand.periodChangePct == null ? "Comparison pending" : `${signed(demand.periodChangePct, "%")} vs prior`;
  }

  function renderPurpose() {
    const purpose = state.data.purposeTrend;
    if (!purpose || !purpose.available) {
      $("#purpose-legend").replaceChildren();
      renderEmpty($("#purpose-chart"), purpose && purpose.reason || "Purpose data is unavailable.");
      $("#purpose-list").replaceChildren();
      $("#purpose-state").textContent = "Unavailable";
      $("#purpose-context").textContent = purpose && purpose.incompatible ? "Not compatible with the selected native agent category" : "Live Radar section unavailable";
      $("#dock-purpose").textContent = purpose && purpose.incompatible ? "All agents only" : "Unavailable";
      return;
    }
    const groups = purpose.trend && purpose.trend.groups || [];
    const legend = groups.length ? groups.map((group) => ({
      name: group.label,
      color: COLORS[group.key] || "#8f8881",
    })) : purpose.items.map((item) => ({ name: item.label, color: COLORS[item.key] || "#8f8881" }));
    renderLegend($("#purpose-legend"), legend);
    renderStackedChart($("#purpose-chart"), groups, purpose.trend && purpose.trend.timestamps);
    const list = $("#purpose-list");
    list.replaceChildren();
    purpose.items.forEach((item) => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = percent(item.value);
      const delta = document.createElement("small");
      delta.textContent = item.changePp == null ? "Prior-period comparison unavailable" : `${signed(item.changePp, " pp")} vs preceding period`;
      row.append(label, value, delta);
      list.append(row);
    });
    const top = purpose.items[0];
    $("#purpose-state").textContent = top ? `${top.label} ${percent(top.value)}` : "Unavailable";
    $("#purpose-context").textContent = `${formatRange(purpose.meta)} · classified request share`;
    $("#dock-purpose").textContent = top ? `${top.label} ${percent(top.value)}` : "Unavailable";
  }

  function renderAccess() {
    const access = state.data.accessOutcomes;
    if (!access || !access.available) {
      $("#access-legend").replaceChildren();
      renderEmpty($("#access-chart"), access && access.reason || "Access outcomes are unavailable.");
      $("#access-list").replaceChildren();
      $("#access-state").textContent = "Unavailable";
      $("#access-context").textContent = access && access.incompatible ? "Not compatible with the selected native agent category" : "Live Radar section unavailable";
      $("#dock-access").textContent = access && access.incompatible ? "All agents only" : "Unavailable";
      return;
    }
    const groups = access.trend && access.trend.groups || [];
    renderLegend($("#access-legend"), groups.map((group) => {
      const readable = accessGroup(group);
      return { name: readable.label, color: readable.color };
    }));
    renderStackedChart($("#access-chart"), groups, access.trend && access.trend.timestamps);
    const list = $("#access-list");
    list.replaceChildren();
    (access.outcomes || []).forEach((item) => {
      const block = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = percent(item.value);
      const codes = document.createElement("small");
      codes.textContent = item.codes ? item.codes.join(" · ") : "";
      block.append(label, value, codes);
      list.append(block);
    });
    $("#access-state").textContent = access.constrainedShare == null ? "Exact codes pending" : percent(access.constrainedShare);
    $("#access-context").textContent = `${formatRange(access.meta)} · exact status codes and categories`;
    $("#dock-access").textContent = access.constrainedShare == null ? `${percent(access.successfulShare)} served` : `${percent(access.constrainedShare)} constrained`;
  }

  function renderOperators() {
    const operators = state.data.operators;
    const target = $("#operators-list");
    target.replaceChildren();
    if (!operators || !operators.available) {
      renderEmpty(target, operators && operators.reason || "Operator concentration is unavailable.");
      $("#operators-state").textContent = "Unavailable";
      $("#dock-operators").textContent = "Unavailable";
      return;
    }
    if (operators.segments && operators.segments.length) {
      operators.segments.forEach((segment) => {
        const section = document.createElement("section");
        section.className = "operator-segment";
        const heading = document.createElement("div");
        heading.className = "operator-segment-heading";
        const title = document.createElement("strong");
        title.textContent = segment.label;
        const concentration = document.createElement("span");
        concentration.textContent = `Top three ${percent(segment.topThreeShare)}`;
        heading.append(title, concentration);
        section.append(heading);
        const bars = document.createElement("div");
        bars.className = "bar-list";
        const max = Math.max(...segment.items.slice(0, 6).map((item) => item.value), 1);
        segment.items.slice(0, 6).forEach((item) => bars.append(createBar(item, max)));
        section.append(bars);
        target.append(section);
      });
      $("#operators-state").textContent = "By AI category";
      $("#operators-context").textContent = `${formatRange(operators.meta)} · independently normalized category shares`;
      $("#dock-operators").textContent = `${operators.segments.length} AI categories`;
      return;
    }
    const max = Math.max(...operators.items.slice(0, 10).map((item) => item.value), 1);
    operators.items.slice(0, 10).forEach((item) => target.append(createBar(item, max)));
    $("#operators-state").textContent = percent(operators.topThreeShare);
    $("#operators-context").textContent = `${formatRange(operators.meta)} · selected traffic scope`;
    $("#dock-operators").textContent = `Top three ${percent(operators.topThreeShare)}`;
  }

  function renderGeography() {
    const geography = state.data.geography;
    if (!geography || !geography.available) {
      renderEmpty($("#geography-chart"), geography && geography.reason || "Geographic comparison is unavailable.");
      $("#dock-geography").textContent = "Unavailable";
      return;
    }
    const sourceSeries = geography.series.filter((item) => item.values && item.values.length);
    const trendMode = state.geographyMode === "trend";
    const series = sourceSeries.map((item) => ({
      name: item.name,
      color: item.color,
      values: trendMode ? indexedValues(item.values) : item.values.map((value) => value * 100),
    }));
    renderLegend($("#geography-legend"), series);
    const timestamps = geography.series.find((item) => item.timestamps && item.timestamps.length)?.timestamps || [];
    const chartValues = series.flatMap((item) => item.values).filter((value) => finite(value) != null);
    const chartMin = trendMode && chartValues.length ? Math.min(...chartValues) : 0;
    const chartMax = trendMode && chartValues.length ? Math.max(...chartValues) : null;
    const padding = trendMode && chartMin != null && chartMax != null ? Math.max((chartMax - chartMin) * 0.12, 5) : 0;
    renderLineChart($("#geography-chart"), series, timestamps.map((value) => formatDate(value).replace(/ \d{4}$/, "")), {
      min: trendMode ? Math.max(0, chartMin - padding) : 0,
      max: trendMode ? chartMax + padding : null,
      tick: (value) => round(value, 0),
    });
    $$("[data-geography-mode]").forEach((control) => {
      control.setAttribute("aria-pressed", String(control.dataset.geographyMode === state.geographyMode));
    });
    $("#geography-chart").setAttribute(
      "aria-label",
      trendMode
        ? "AI-bot request activity by geography, each location indexed to 100 at the first visible week"
        : "Comparable AI-bot request activity by geography on one shared Cloudflare scale"
    );
    $("#geography-context").textContent = trendMode
      ? `${formatRange(geography.meta)} · each location starts at 100`
      : `${formatRange(geography.meta)} · ${geography.meta && geography.meta.normalization || "Radar"} shared scale`;
    $("#geography-boundary").textContent = trendMode
      ? "Trend rebases each location to 100 at its first visible week. It compares direction and growth, not traffic magnitude or absolute market size."
      : "Relative volume preserves Radar's shared normalization so locations remain comparable in magnitude. It is not an absolute request count or market-size estimate.";
    $("#dock-geography").textContent = `${series.length} comparable locations`;
  }

  function renderReadiness() {
    const readiness = state.data.readiness;
    const target = $("#readiness-groups");
    target.replaceChildren();
    if (!readiness || !readiness.available) {
      renderEmpty(target, readiness && readiness.reason || "Readiness data is unavailable.");
      $("#readiness-state").textContent = "Unavailable";
      $("#dock-readiness").textContent = "Unavailable";
      return;
    }
    (readiness.groups || []).forEach((group) => {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.textContent = group.label;
      section.append(heading);
      group.items.forEach((item) => section.append(createBar(item, 100, { digits: item.value < 0.1 ? 3 : 1 })));
      target.append(section);
    });
    $("#readiness-state").textContent = formatDate(readiness.scanDate);
    $("#readiness-successful").textContent = compact(readiness.successfulDomains);
    $("#readiness-total").textContent = compact(readiness.totalDomains);
    $("#readiness-coverage").textContent = percent(readiness.scanCoveragePct);
    const efficiency = state.data.efficiency;
    $("#efficiency-ratio").textContent = efficiency && efficiency.available ? `${round(efficiency.markdownReductionRatio, 1)}×` : "—";
    const rules = itemByKey(readiness.items, "robotsTxtAiRules");
    $("#dock-readiness").textContent = rules ? `AI rules ${percent(rules.value)}` : `${compact(readiness.successfulDomains)} scans`;
  }

  function renderThesis() {
    const data = state.data;
    const demand = data.demandComparison || {};
    const purpose = data.purposeTrend || {};
    const access = data.accessOutcomes || {};
    const operators = data.operators || {};
    const readiness = data.readiness || {};
    const training = itemByKey(purpose.items, "Training");
    const webBotAuth = itemByKey(readiness.items, "webBotAuth");
    $("#thesis-slice").textContent = currentScope(false);
    $("#thesis-demand-metric").textContent = demand.periodChangePct == null ? "—" : signed(demand.periodChangePct, "%");
    $("#thesis-purpose-metric").textContent = training ? percent(training.value) : "—";
    $("#thesis-lead").textContent = training
      ? `${training.label} is the largest classified request purpose; returned publisher value remains unmeasured.`
      : "Radar can test agent demand, intent and access—but not publisher value.";
    $("#ladder-demand").textContent = demand.periodChangePct == null
      ? "A comparable preceding-period series is not available yet."
      : `Mean relative request volume is ${signed(demand.periodChangePct, "%")} versus the preceding period.`;
    $("#ladder-purpose").textContent = training
      ? `${training.label} accounts for ${percent(training.value)} of classified requests${training.changePp == null ? "." : `, ${signed(training.changePp, " pp")} versus the preceding period.`}`
      : purpose.incompatible ? "Purpose classification is available for the complete all-agents scope only." : "Purpose classification is unavailable.";
    $("#ladder-access").textContent = access.constrainedShare == null
      ? access.incompatible ? "Exact access outcomes are available for the complete all-agents scope only." : "Exact constrained-status evidence is unavailable."
      : `${percent(access.constrainedShare)} received 401, 403 or 429 responses; this is a proxy, not proven policy intent.`;
    $("#ladder-operators").textContent = operators.segments && operators.segments.length
      ? "Operator shares are reported separately for crawler, assistant and search categories and are not added together."
      : operators.topThreeShare == null
        ? "Operator concentration is unavailable."
        : `The top three identified operators account for ${percent(operators.topThreeShare)} of requests in scope.`;
    $("#ladder-readiness").textContent = webBotAuth
      ? `Web Bot Auth is exposed by ${percent(webBotAuth.value, webBotAuth.value < 0.1 ? 3 : 1)} of successfully scanned domains.`
      : "Identity and transaction readiness is reported by the global weekly scan.";
  }

  function renderRegimeLog() {
    const data = state.data;
    const target = $("#regime-log-body");
    target.replaceChildren();
    const observedAt = data.fetchedAt;
    const rows = [];
    if (data.demandComparison && data.demandComparison.available) {
      rows.push([
        formatDate(observedAt),
        "Comparable agent demand",
        data.demandComparison.periodChangePct == null ? "—" : signed(data.demandComparison.periodChangePct, "%"),
        "Observation",
        "Needs four comparable weeks plus breadth or a second source",
      ]);
    }
    const training = itemByKey(data.purposeTrend && data.purposeTrend.items, "Training");
    if (training) {
      rows.push([
        formatDate(observedAt),
        "Training-purpose share",
        training.changePp == null ? percent(training.value) : signed(training.changePp, " pp"),
        "Observation",
        "Confirm persistence and counterevidence",
      ]);
    }
    if (data.accessOutcomes && data.accessOutcomes.constrainedShare != null) {
      rows.push([
        formatDate(observedAt),
        "Access-constrained proxy",
        percent(data.accessOutcomes.constrainedShare),
        "Observation",
        "Separate policy from authentication and request errors",
      ]);
    }
    if (!rows.length) rows.push(["—", "No live observation", "—", "Unavailable", "Refresh the Radar source"]);
    rows.forEach((values) => {
      const row = document.createElement("tr");
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      target.append(row);
    });
    $("#regime-log-summary").textContent = `${rows.length} observations · 0 candidates · 0 promoted`;
  }

  function interpretationCopy(signal) {
    const data = state.data;
    const demand = data.demandComparison || {};
    const purpose = data.purposeTrend || {};
    const access = data.accessOutcomes || {};
    const operators = data.operators || {};
    const geography = data.geography || {};
    const readiness = data.readiness || {};
    const training = itemByKey(purpose.items, "Training");
    const common = {
      evidence: "Live Cloudflare Radar",
      scope: currentScope(signal === "readiness"),
    };
    return {
      demand: {
        ...common,
        title: "Demand pressure",
        observed: demand.periodChangePct == null ? "Current activity is visible, but a comparable preceding-period series is unavailable." : `Mean relative request volume changed ${signed(demand.periodChangePct, "%")} versus the preceding period.`,
        method: demand.meta && demand.meta.normalization || "Comparable Radar series",
        connection: "Demand growth tests whether agent-originated traffic is becoming large enough to require dedicated access, attribution and pricing infrastructure.",
        inference: "Growth strengthens the demand side of the thesis. It does not establish extraction, publisher harm or returned value.",
        boundaryTitle: "Relative request volume.",
        boundary: "Current and preceding periods must share one normalization request. Values are not absolute global request counts.",
        updated: sourceUpdated(demand),
      },
      purpose: {
        ...common,
        title: "Purpose",
        observed: training
          ? `${training.label} is the largest classified purpose at ${percent(training.value)}.`
          : purpose.incompatible
            ? purpose.reason
            : "Purpose classification is unavailable.",
        method: purpose.meta && purpose.meta.normalization || "Request distribution",
        connection: "Purpose separates training, mixed, search and user-action demand before relating it to the value-versus-extraction thesis.",
        inference: "Training-oriented activity can indicate consumption pressure, but purpose classification alone does not establish extraction or economic harm.",
        boundaryTitle: "Intent is not outcome.",
        boundary: "Mixed Purpose remains separate. User Action is not attributable referral, conversion or publisher value.",
        updated: sourceUpdated(purpose),
      },
      access: {
        ...common,
        title: "Access outcomes",
        observed: access.constrainedShare == null
          ? access.incompatible
            ? access.reason
            : "Exact constrained-status evidence is unavailable."
          : `${percent(access.constrainedShare)} of requests received 401, 403 or 429 responses.`,
        method: access.meta && access.meta.normalization || "HTTP status distribution",
        connection: "HTTP outcomes show how identified agent requests are served, redirected, constrained or failed.",
        inference: "More constrained responses may indicate stronger access control, but status codes do not reveal robots.txt, WAF or commercial intent.",
        boundaryTitle: "Constrained is a proxy.",
        boundary: "Redirects, 404s and server errors are not counted as access-constrained. Even 401, 403 and 429 require cause evidence.",
        updated: sourceUpdated(access),
      },
      operators: {
        ...common,
        title: "Operators",
        observed: operators.segments && operators.segments.length
          ? `Operator request shares are available separately for ${operators.segments.map((segment) => segment.key).join(", ")} categories.`
          : operators.topThreeShare == null
            ? "Operator concentration is unavailable."
            : `The top three identified operators account for ${percent(operators.topThreeShare)} of requests in scope.`,
        method: operators.meta && operators.meta.normalization || "Operator request share",
        connection: "Identifiable operators create counterparties for access policy, attribution and potential commercial agreements.",
        inference: "Concentration can make negotiation more addressable, but does not establish revenue, adoption or willingness to pay.",
        boundaryTitle: "Identity is not monetization.",
        boundary: operators.segments && operators.segments.length
          ? "Category shares are independently normalized and must not be added together. Operator request share is not customer share, revenue share or market share."
          : "Operator request share is not customer share, revenue share or market share.",
        updated: sourceUpdated(operators),
      },
      geography: {
        ...common,
        title: "Geography",
        observed: geography.available
          ? state.geographyMode === "trend"
            ? `${geography.series.filter((item) => item.values && item.values.length).length} locations are rebased to 100 to compare their growth paths.`
            : `${geography.series.filter((item) => item.values && item.values.length).length} locations share one Cloudflare normalization scale.`
          : "Geographic comparison is unavailable.",
        method: state.geographyMode === "trend"
          ? "First visible week = 100, calculated from one shared Radar response"
          : geography.meta && geography.meta.normalization || "Multi-series comparison",
        connection: "Geographic divergence can show where agent-traffic changes appear first and whether movement is broad.",
        inference: "Broad movement is more durable than a single-market spike, but coverage and classification still shape the signal.",
        boundaryTitle: state.geographyMode === "trend" ? "Trend hides magnitude." : "Not absolute market size.",
        boundary: state.geographyMode === "trend"
          ? "Indexing makes direction readable but removes relative traffic magnitude. Switch to Relative volume for the shared Radar scale."
          : "Locations are comparable only because they are requested together. The values do not estimate total agent usage by country.",
        updated: sourceUpdated(geography),
      },
      readiness: {
        ...common,
        title: "Readiness",
        observed: readiness.available ? `${compact(readiness.successfulDomains)} domains completed the ${formatDate(readiness.scanDate)} scan.` : "Readiness data is unavailable.",
        method: "Weekly global bulk scan",
        connection: "Policy, discovery, identity and transaction checks indicate whether the web exposes infrastructure agents can use.",
        inference: "Policy can be widespread while identity and transaction standards remain scarce, leaving the commercial layer immature.",
        boundaryTitle: "Capability exposure, not adoption.",
        boundary: "This global scan is not affected by traffic geography or agent-category filters. Denominators are successful scans.",
        updated: sourceUpdated(readiness),
      },
    }[signal];
  }

  function renderInspector() {
    if (!state.data) return;
    const copy = interpretationCopy(state.view === "thesis" ? "demand" : state.selectedSignal);
    $("#inspector-position").textContent = copy.title;
    $("#interpretation-title").textContent = copy.title;
    $("#interpretation-observed").textContent = copy.observed;
    $("#interpretation-method").textContent = copy.method;
    $("#interpretation-evidence").textContent = copy.evidence;
    $("#interpretation-scope").textContent = copy.scope;
    $("#interpretation-updated").textContent = formatTimestamp(copy.updated);
    $("#interpretation-connection").textContent = copy.connection;
    $("#interpretation-inference").textContent = copy.inference;
    $("#interpretation-boundary-title").textContent = copy.boundaryTitle;
    $("#interpretation-boundary").textContent = copy.boundary;
  }

  function renderAll() {
    if (!state.data) return;
    const schemaLabel = state.data.schemaVersion === 2 ? "Live Radar" : "Live Radar · compatibility mode";
    $("#signals-workspace-context").textContent = state.selectedSignal === "readiness"
      ? `${schemaLabel} · Global weekly readiness scan; traffic filters apply to other signals`
      : `${schemaLabel} · ${currentScope(false)}`;
    $("#thesis-data-status").textContent = state.data.schemaVersion === 2 ? "Live Cloudflare Radar" : "Live Radar · version 1";
    $("#thesis-data-detail").textContent = "Demand-side evidence · publisher value not measured";
    renderSummary();
    renderDemand();
    renderPurpose();
    renderAccess();
    renderOperators();
    renderGeography();
    renderReadiness();
    renderThesis();
    renderRegimeLog();
    renderInspector();
  }

  function selectSignal(signal, options) {
    const resolved = LEGACY_SIGNAL_MAP[signal] || signal;
    if (!SIGNALS.includes(resolved)) return;
    state.selectedSignal = resolved;
    $$("[data-signal-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.signalPanel !== resolved;
    });
    $$("[data-signal-select]").forEach((control) => {
      if (control.dataset.signalSelect === resolved) control.setAttribute("aria-current", "true");
      else control.removeAttribute("aria-current");
    });
    if (state.data) {
      renderInspector();
      $("#signals-workspace-context").textContent = resolved === "readiness"
        ? "Live Radar · Global weekly readiness scan; traffic filters apply to other signals"
        : `Live Radar · ${currentScope(false)}`;
    }
    if (!options || options.updateLocation !== false) window.history.replaceState(null, "", `#signal-${resolved}`);
    if (options && options.scroll) $(".focus-stage").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setView(view, options) {
    state.view = view;
    const thesis = view === "thesis";
    document.body.classList.toggle("thesis-mode", thesis);
    $("#observatory-view").hidden = thesis;
    $("#thesis-view").hidden = !thesis;
    $$("[data-show-view]").forEach((control) => {
      if (control.dataset.showView === view) control.setAttribute("aria-current", "page");
      else control.removeAttribute("aria-current");
    });
    if (!options || options.updateLocation !== false) {
      window.history.replaceState(null, "", thesis ? "#value-versus-extraction" : `#signal-${state.selectedSignal}`);
    }
    if (!options || options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setRailOpen(open) {
    const compactViewport = window.matchMedia("(max-width: 980px)").matches;
    $(".signals-shell").classList.toggle("rail-collapsed", !open && !compactViewport);
    $("#interpretation-rail").classList.toggle("closed", !open);
    $("#toggle-interpretation").setAttribute("aria-pressed", String(open));
    $("#open-rail").hidden = open || !compactViewport;
  }

  function syncRail() {
    setRailOpen(!window.matchMedia("(max-width: 980px)").matches);
  }

  async function refreshLiveData(options) {
    const endpoint = String(window.SIGNALS_CONFIG && window.SIGNALS_CONFIG.radarEndpoint || "").trim();
    const button = $("#refresh-data");
    if (!endpoint) {
      showNotice("The secure Radar proxy URL is not configured. No illustrative data has been substituted.", "error");
      $("#source-status").textContent = "Radar unavailable";
      $("#source-status-detail").textContent = "Proxy URL not configured";
      return;
    }
    if (state.loading) return;
    state.loading = true;
    button.disabled = true;
    button.textContent = "Refreshing…";
    $("#source-status").textContent = "Refreshing Radar";
    $("#source-status-detail").textContent = state.data ? "Keeping the last valid result visible" : "Requesting live evidence";
    if (!options || !options.silent) showNotice("Requesting the latest available Cloudflare Radar measurements…", "info");

    try {
      const url = new URL(endpoint, window.location.href);
      url.searchParams.set("period", $("#period-filter").value);
      url.searchParams.set("region", $("#region-filter").value);
      url.searchParams.set("agent", $("#agent-filter").value);
      const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || `Live source returned HTTP ${response.status}`);
      state.data = normalizedData(payload);
      state.cacheStatus = response.headers.get("X-Signals-Cache");
      renderAll();
      const updated = state.data.fetchedAt;
      $("#source-status").textContent = "Live Cloudflare Radar";
      $("#source-status-detail").textContent = `${state.cacheStatus === "HIT" ? "Cached" : "Fetched"} ${formatTimestamp(updated)}`;
      if (state.data.schemaVersion === 1) {
        showNotice("Live Radar loaded from the current Worker. New comparison, operator, exact-status and category-filter fields will appear after the version 2 Worker is deployed.", "info");
      } else {
        const unavailable = ["demandComparison", "purposeTrend", "accessOutcomes", "operators", "geography", "readiness"]
          .filter((key) => !state.data[key] || !state.data[key].available);
        showNotice(
          unavailable.length
            ? `Live Radar loaded. Unavailable sections: ${unavailable.map(friendlyLabel).join(", ")}.`
            : "Live Radar loaded. Publisher-value fields remain explicitly source-required.",
          unavailable.length ? "info" : "success"
        );
      }
    } catch (error) {
      $("#source-status").textContent = state.data ? "Live Radar · last valid result" : "Radar unavailable";
      $("#source-status-detail").textContent = state.data ? "Refresh failed; prior data preserved" : "No substitute data shown";
      showNotice(`Could not refresh Radar: ${error instanceof Error ? error.message : "unknown error"}. ${state.data ? "The last valid dataset remains visible." : "No illustrative values were substituted."}`, "error");
    } finally {
      state.loading = false;
      button.disabled = false;
      button.textContent = "Refresh latest";
    }
  }

  function syncHash() {
    if (window.location.hash === "#value-versus-extraction") {
      setView("thesis", { updateLocation: false, scroll: false });
      return;
    }
    setView("observatory", { updateLocation: false, scroll: false });
    const match = window.location.hash.match(/^#signal-(demand|purpose|access|operators|geography|readiness|value|friction)$/);
    if (match) selectSignal(match[1], { updateLocation: false });
  }

  function bindControls() {
    $$("[data-show-view]").forEach((control) => control.addEventListener("click", () => setView(control.dataset.showView)));
    $$("[data-signal-select]").forEach((control) => control.addEventListener("click", () => selectSignal(control.dataset.signalSelect, { scroll: true })));
    ["#period-filter", "#region-filter", "#agent-filter"].forEach((selector) => {
      $(selector).addEventListener("change", () => refreshLiveData());
    });
    $$("[data-geography-mode]").forEach((control) => control.addEventListener("click", () => {
      state.geographyMode = control.dataset.geographyMode;
      renderGeography();
      renderInspector();
    }));
    $("#refresh-data").addEventListener("click", () => refreshLiveData());
    $("a[href='#regime-log']").addEventListener("click", () => setView("observatory", { updateLocation: false, scroll: false }));
    $("#close-rail").addEventListener("click", () => setRailOpen(false));
    $("#open-rail").addEventListener("click", () => setRailOpen(true));
    $("#toggle-interpretation").addEventListener("click", () => setRailOpen($("#toggle-interpretation").getAttribute("aria-pressed") !== "true"));
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("resize", syncRail);
  }

  function initialize() {
    bindControls();
    syncRail();
    syncHash();
    refreshLiveData({ silent: true });
  }

  initialize();
}());
