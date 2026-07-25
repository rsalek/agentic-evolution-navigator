const SIGNAL_DATA = {
  weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
  geographies: {
    gb: { name: "United Kingdom", color: "#1f766b", region: "anglosphere", values: [100, 111, 116, 124, 136, 145, 151, 164, 168, 181, 188, 202] },
    us: { name: "United States", color: "#287095", region: "anglosphere", values: [100, 106, 110, 118, 123, 130, 137, 141, 147, 155, 161, 172] },
    de: { name: "Germany", color: "#a54f0c", region: "europe", values: [100, 101, 106, 108, 112, 111, 117, 119, 121, 126, 129, 136] },
    fr: { name: "France", color: "#6b5ca5", region: "europe", values: [100, 91, 86, 81, 84, 88, 86, 91, 94, 92, 96, 101] },
    jp: { name: "Japan", color: "#b5365a", region: "asia", values: [100, 88, 74, 67, 61, 58, 60, 57, 62, 66, 69, 76] },
    in: { name: "India", color: "#398f88", region: "asia", values: [100, 82, 68, 59, 51, 47, 44, 49, 51, 55, 58, 63] },
  },
  value: {
    crawl: { name: "Crawl demand", color: "#a54f0c", values: [100, 115, 126, 142, 151, 164, 178, 187, 191, 199, 202, 210] },
    referral: { name: "Referral value", color: "#1f766b", values: [100, 99, 99, 98, 94, 89, 87, 82, 77, 73, 70, 58] },
  },
  standards: ["Markdown negotiation", "robots.txt AI rules", "Agent discovery metadata", "Structured data", "Commerce protocols"],
  purposes: ["AI training / retrieval", "Search / discovery", "Monitoring / uptime", "Content rendering", "SEO / analytics", "Other / unknown"],
};

const REGION_PROFILES = {
  global: {
    name: "Global comparison",
    regions: ["anglosphere", "europe", "asia"],
    activityOffset: 0,
    accessOffset: 0,
    readiness: 37.6,
    readinessChange: 6.4,
    standards: [46.8, 38.9, 34.1, 28.2, 16.7],
    friction: [18.4, 10.2, 6.7, 2.4],
    crawlFactor: 1,
    referralFactor: 1,
  },
  europe: {
    name: "Europe",
    regions: ["europe", "anglosphere"],
    geographyNames: ["United Kingdom", "Germany", "France"],
    activityOffset: -2,
    accessOffset: 3.7,
    readiness: 42.8,
    readinessChange: 5.1,
    standards: [53.4, 45.7, 39.2, 31.6, 18.9],
    friction: [15.1, 12.4, 5.3, 1.2],
    crawlFactor: .92,
    referralFactor: 1.08,
  },
  asia: {
    name: "Asia",
    regions: ["asia"],
    activityOffset: 4,
    accessOffset: -4.6,
    readiness: 31.2,
    readinessChange: 7.8,
    standards: [39.5, 31.4, 28.7, 24.9, 14.2],
    friction: [22.6, 8.1, 8.8, 3.1],
    crawlFactor: 1.12,
    referralFactor: .85,
  },
  anglosphere: {
    name: "United Kingdom + United States",
    regions: ["anglosphere"],
    activityOffset: 7,
    accessOffset: 5.9,
    readiness: 48.9,
    readinessChange: 8.2,
    standards: [61.2, 50.1, 44.5, 35.8, 22.9],
    friction: [13.2, 9.6, 4.1, 1.5],
    crawlFactor: 1.18,
    referralFactor: .78,
  },
};

const AGENT_PROFILES = {
  all: {
    name: "All identified AI agents",
    activity: 18,
    access: 62.3,
    accessChange: 3.1,
    readinessOffset: 0,
    markdown: 1.28,
    trendFactor: 1,
    crawlFactor: 1,
    referralFactor: 1,
    frictionFactor: 1,
    purposes: [38.7, 24.5, 11.6, 9.4, 6.1, 9.7],
  },
  crawler: {
    name: "AI crawlers",
    activity: 24,
    access: 54.8,
    accessChange: 1.7,
    readinessOffset: -1.4,
    markdown: 1.46,
    trendFactor: 1.12,
    crawlFactor: 1.08,
    referralFactor: .84,
    frictionFactor: 1.18,
    purposes: [49.6, 26.4, 8.2, 5.1, 4.4, 6.3],
  },
  assistant: {
    name: "AI assistants",
    activity: 11,
    access: 74.6,
    accessChange: 5.2,
    readinessOffset: 3.2,
    markdown: .82,
    trendFactor: .76,
    crawlFactor: .72,
    referralFactor: 1.24,
    frictionFactor: .72,
    purposes: [18.2, 31.8, 8.4, 19.6, 7.1, 14.9],
  },
};

const FRICTION_META = [
  { name: "WAF / firewall", className: "firewall", color: "#a54f0c" },
  { name: "robots.txt disallow", className: "robots", color: "#b5365a" },
  { name: "Rate limiting", className: "limit", color: "#6b5ca5" },
  { name: "JS / challenge", className: "challenge", color: "#287095" },
];

const SVG_NS = "http://www.w3.org/2000/svg";
let selectedSignal = "value";
const LIVE_STATE = {
  mode: "illustrative",
  data: null,
};

function isLive() {
  return LIVE_STATE.mode === "live" && LIVE_STATE.data;
}

function formatTimestamp(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCompactNumber(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value));
}

function showDataNotice(message, tone) {
  const notice = document.querySelector("#data-notice");
  notice.textContent = message;
  notice.dataset.tone = tone || "info";
  notice.hidden = !message;
}

function renderEmptyState(target, message) {
  target.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  target.append(empty);
}

function liveActivityChange() {
  const values = LIVE_STATE.data.activity.values;
  if (!values || values.length < 2 || values[0] === 0) return null;
  return (values.at(-1) - values[0]) / Math.abs(values[0]) * 100;
}

function liveReadinessCoverage() {
  const successful = Number(LIVE_STATE.data.readiness.successfulDomains);
  const total = Number(LIVE_STATE.data.readiness.totalDomains);
  if (Number.isFinite(successful) && Number.isFinite(total) && total > 0) {
    return successful / total * 100;
  }
  return null;
}

function setLiveAgentFilter(live) {
  const select = document.querySelector("#agent-filter");
  if (live) {
    select.replaceChildren(new Option("All identified AI bots", "all"));
    select.disabled = true;
    return;
  }
  if (select.options.length === 1) {
    select.replaceChildren(
      new Option("All identified AI agents", "all"),
      new Option("AI crawlers", "crawler"),
      new Option("AI assistants", "assistant")
    );
  }
  select.disabled = false;
}

function svgElement(name, attributes, value) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes || {}).forEach(function setAttribute(entry) {
    element.setAttribute(entry[0], entry[1]);
  });
  if (value != null) element.textContent = value;
  return element;
}

function currentSlice() {
  const regionKey = document.querySelector("#region-filter").value;
  const agentKey = document.querySelector("#agent-filter").value;
  return {
    regionKey,
    agentKey,
    region: REGION_PROFILES[regionKey],
    agent: AGENT_PROFILES[agentKey],
    period: Number(document.querySelector("#period-filter").value),
    live: isLive() ? LIVE_STATE.data : null,
  };
}

function round(value, digits) {
  return Number(value.toFixed(digits == null ? 1 : digits));
}

function signed(value, suffix) {
  return (value >= 0 ? "+" : "") + round(value, 1) + (suffix || "");
}

function scaleFromBaseline(values, factor) {
  return values.map(function scale(value) {
    return 100 + (value - 100) * factor;
  });
}

function normalizeVisible(values, period) {
  const visible = values.slice(-period);
  const start = visible[0] || 100;
  return visible.map(function normalize(value) {
    return round(value / start * 100, 1);
  });
}

function linePath(values, bounds, minValue, maxValue) {
  const range = Math.max(maxValue - minValue, 1);
  return values.map(function point(value, index) {
    const x = bounds.left + index / Math.max(values.length - 1, 1) * bounds.width;
    const y = bounds.top + (maxValue - value) / range * bounds.height;
    return (index === 0 ? "M " : " L ") + x.toFixed(2) + " " + y.toFixed(2);
  }).join("");
}

function renderLineChart(target, series, labels, options) {
  target.replaceChildren();
  const config = options || {};
  const width = config.width || 900;
  const height = config.height || 360;
  const bounds = { left: 45, top: 20, width: width - 62, height: height - 54 };
  const values = series.flatMap(function flatten(item) { return item.values; });
  const minValue = config.minValue == null ? Math.floor(Math.min(...values) / 20) * 20 : config.minValue;
  const maxValue = config.maxValue == null ? Math.ceil(Math.max(...values) / 20) * 20 : config.maxValue;
  const svg = svgElement("svg", { viewBox: "0 0 " + width + " " + height, "aria-hidden": "true" });

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = minValue + (maxValue - minValue) * (4 - tick) / 4;
    const y = bounds.top + bounds.height * tick / 4;
    svg.append(svgElement("line", { x1: bounds.left, y1: y, x2: bounds.left + bounds.width, y2: y, class: "grid-line" }));
    svg.append(svgElement("text", { x: bounds.left - 8, y: y + 3, "text-anchor": "end" }, Math.round(value)));
  }

  labels.forEach(function renderLabel(label, index) {
    if (index % Math.max(1, Math.floor(labels.length / 6)) !== 0 && index !== labels.length - 1) return;
    const x = bounds.left + index / Math.max(labels.length - 1, 1) * bounds.width;
    svg.append(svgElement("text", { x, y: height - 12, "text-anchor": "middle" }, label));
  });

  if (config.candidateIndex != null && config.candidateIndex < labels.length) {
    const x = bounds.left + config.candidateIndex / Math.max(labels.length - 1, 1) * bounds.width;
    svg.append(svgElement("line", { x1: x, y1: bounds.top, x2: x, y2: bounds.top + bounds.height, class: "candidate-line" }));
    svg.append(svgElement("text", { x: x + 5, y: bounds.top + 11, class: "candidate-label" }, "Candidate inflection"));
  }

  series.forEach(function renderSeries(item) {
    svg.append(svgElement("path", { d: linePath(item.values, bounds, minValue, maxValue), class: "series-line", stroke: item.color }));
    if (config.points) {
      item.values.forEach(function renderPoint(value, index) {
        const x = bounds.left + index / Math.max(item.values.length - 1, 1) * bounds.width;
        const y = bounds.top + (maxValue - value) / Math.max(maxValue - minValue, 1) * bounds.height;
        svg.append(svgElement("circle", { cx: x, cy: y, r: 2.4, class: "series-point", stroke: item.color }));
      });
    }
  });
  target.append(svg);
}

function renderLegend(target, series) {
  target.replaceChildren();
  series.forEach(function legendItem(item) {
    const wrapper = document.createElement("span");
    wrapper.className = "legend-item" + (item.unavailable ? " is-unavailable" : "");
    const swatch = document.createElement("i");
    swatch.className = "legend-swatch";
    swatch.style.setProperty("--swatch", item.color);
    wrapper.append(swatch, document.createTextNode(item.name));
    target.append(wrapper);
  });
}

function appendChartBoundary(target, message) {
  const boundary = document.createElement("p");
  boundary.className = "chart-data-boundary";
  boundary.textContent = message;
  target.append(boundary);
}

function geographySeries(slice) {
  const all = Object.values(SIGNAL_DATA.geographies);
  const filtered = slice.regionKey === "global"
    ? all
    : all.filter(function matchesRegion(series) {
      if (slice.region.geographyNames) return slice.region.geographyNames.includes(series.name);
      return slice.region.regions.includes(series.region);
    });
  return filtered.map(function transform(series) {
    const scaled = scaleFromBaseline(series.values, slice.agent.trendFactor);
    return { ...series, values: normalizeVisible(scaled, slice.period) };
  });
}

function valueSeries(slice) {
  const crawlFactor = slice.region.crawlFactor * slice.agent.crawlFactor;
  const referralFactor = slice.region.referralFactor * slice.agent.referralFactor;
  return [
    {
      ...SIGNAL_DATA.value.crawl,
      values: normalizeVisible(scaleFromBaseline(SIGNAL_DATA.value.crawl.values, crawlFactor), slice.period),
    },
    {
      ...SIGNAL_DATA.value.referral,
      values: normalizeVisible(scaleFromBaseline(SIGNAL_DATA.value.referral.values, referralFactor), slice.period),
    },
  ];
}

function readinessValues(slice) {
  return slice.region.standards.map(function applyAgentOffset(value) {
    return Math.max(0, round(value + slice.agent.readinessOffset, 1));
  });
}

function frictionValues(slice) {
  return slice.region.friction.map(function applyAgentFactor(value) {
    return round(value * slice.agent.frictionFactor, 1);
  });
}

function createBarRow(label, value, maxValue) {
  const row = document.createElement("div");
  const name = document.createElement("span");
  const bar = document.createElement("i");
  const number = document.createElement("strong");
  name.textContent = label;
  bar.style.setProperty("--value", Math.min(100, value / maxValue * 100) + "%");
  number.textContent = value.toFixed(1) + "%";
  row.append(name, bar, number);
  return row;
}

function renderLiveSummary(slice) {
  const live = slice.live;
  const activity = liveActivityChange();
  const access = live.access.successfulShare;
  const readiness = liveReadinessCoverage();
  const ratio = live.markdown.reductionRatio;
  const lastUpdated = live.activity.meta.lastUpdated || live.fetchedAt;

  document.querySelector("#signals-workspace-context").textContent = "Live Radar · " + slice.region.name + " · All identified AI bots · " + slice.period + " weeks · updated " + formatTimestamp(lastUpdated);
  document.querySelector("#metric-activity").textContent = activity == null ? "—" : signed(activity, "%");
  document.querySelector("#metric-activity-note").textContent = "first to latest weekly observation";
  document.querySelector("#metric-access").textContent = access == null ? "—" : access.toFixed(1) + "%";
  document.querySelector("#metric-access-note").textContent = "successful response share";
  document.querySelector("#metric-readiness").textContent = readiness == null ? "—" : readiness.toFixed(1) + "%";
  document.querySelector("#metric-readiness-note").textContent = "domains completing the latest scan";
  document.querySelector("#metric-markdown").textContent = ratio == null ? "—" : ratio.toFixed(2) + "×";
  document.querySelector("#metric-markdown-note").textContent = "Radar median reduction ratio";
  document.querySelector("#thesis-slice").textContent = slice.region.name + " · All identified AI bots · " + slice.period + " weeks";
  document.querySelector("#dock-readiness").textContent = readiness == null ? "Not reported" : readiness.toFixed(1) + "% scanned";
  document.querySelector("#thesis-data-status").textContent = "Live Radar context";
  document.querySelector("#thesis-data-detail").textContent = "Referral value not available";
  document.querySelector("#examples-context").textContent = "Explore the latest available Radar measurements.";
}

function renderSummary(slice) {
  if (slice.live) {
    renderLiveSummary(slice);
    return;
  }
  const readiness = round(slice.region.readiness + slice.agent.readinessOffset, 1);
  const readinessChange = round(slice.region.readinessChange + slice.agent.readinessOffset * .25, 1);
  const activity = slice.agent.activity + slice.region.activityOffset;
  const access = round(slice.agent.access + slice.region.accessOffset, 1);
  const accessChange = round(slice.agent.accessChange + slice.region.accessOffset * .15, 1);

  document.querySelector("#signals-workspace-context").textContent = "Illustrative model · " + slice.region.name + " · " + slice.agent.name + " · " + slice.period + " weeks";
  document.querySelector("#metric-activity").textContent = signed(activity, "%");
  document.querySelector("#metric-activity-note").textContent = slice.period + "-week illustrative trend";
  document.querySelector("#metric-access").textContent = access.toFixed(1) + "%";
  document.querySelector("#metric-access-note").textContent = signed(accessChange, " pp");
  document.querySelector("#metric-readiness").textContent = readiness.toFixed(1) + "%";
  document.querySelector("#metric-readiness-note").textContent = signed(readinessChange, " pp");
  document.querySelector("#metric-markdown").textContent = slice.agent.markdown.toFixed(2) + " PB";
  document.querySelector("#metric-markdown-note").textContent = "illustrative estimate";
  document.querySelector("#thesis-slice").textContent = slice.region.name + " · " + slice.agent.name + " · " + slice.period + " weeks";
  document.querySelector("#dock-readiness").textContent = readiness.toFixed(1) + "% · " + signed(readinessChange, " pp");
  document.querySelector("#thesis-data-status").textContent = "Illustrative model";
  document.querySelector("#thesis-data-detail").textContent = "Not live data";
  document.querySelector("#examples-context").textContent = "Explore the illustrative Radar-connected model.";
}

function renderValue(slice) {
  if (slice.live) {
    const reason = slice.live.value.reason;
    const values = slice.live.activity.values;
    const timestamps = slice.live.activity.timestamps;
    const activityChange = liveActivityChange();
    const demandSeries = values.length
      ? [{
        name: "AI-bot request activity · Radar",
        color: "#a54f0c",
        values: normalizeVisible(values, values.length),
      }]
      : [];
    const legend = demandSeries.concat([{
      name: "Referral value · source required",
      color: "#9b948d",
      unavailable: true,
    }]);
    const labels = timestamps.slice(-values.length).map(function activityLabel(value) {
      return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    });
    const stageChart = document.querySelector("#value-stage-chart");
    const focusChart = document.querySelector("#value-focus-chart");

    renderLegend(document.querySelector("#value-stage-legend"), legend);
    renderLegend(document.querySelector("#value-focus-legend"), legend);
    if (demandSeries.length) {
      const chartValues = demandSeries[0].values;
      const minValue = Math.floor(Math.min(...chartValues) / 10) * 10;
      const maxValue = Math.ceil(Math.max(...chartValues) / 10) * 10;
      renderLineChart(stageChart, demandSeries, labels, {
        width: 920,
        height: 380,
        minValue,
        maxValue,
        points: true,
      });
      appendChartBoundary(stageChart, "Demand is indexed to 100 at the first visible week. Referral, conversion, and revenue are not available from Radar.");
      renderLineChart(focusChart, demandSeries, labels, {
        width: 900,
        height: 390,
        minValue,
        maxValue,
        points: true,
      });
      appendChartBoundary(focusChart, "Live demand signal only · a value gap cannot be calculated until attributable publisher analytics are connected.");
    } else {
      renderEmptyState(stageChart, "Radar returned no request-activity series for this scope.");
      renderEmptyState(focusChart, "Radar returned no request-activity series for this scope.");
    }
    stageChart.setAttribute("aria-label", "Live normalized AI-bot request activity. Referral value is unavailable from Cloudflare Radar.");
    focusChart.setAttribute("aria-label", "Live normalized AI-bot request activity. Referral value is unavailable from Cloudflare Radar.");
    document.querySelector("#value-state").textContent = "Demand visible · value source needed";
    document.querySelector("#value-gap").textContent = "Not measured";
    document.querySelector("#value-reading").textContent = activityChange == null
      ? reason
      : "Identified AI-bot request activity changed " + signed(activityChange, "%") + " across the selected period. " + reason;
    document.querySelector("#value-boundary").textContent = "Live demand shown · Radar does not measure reciprocal publisher value.";
    document.querySelector("#dock-value").textContent = activityChange == null
      ? "Value source needed"
      : "Demand " + signed(activityChange, "%") + " · value unavailable";
    document.querySelector("#thesis-demand-metric").textContent = "—";
    document.querySelector("#thesis-referral-metric").textContent = "—";
    document.querySelector("#thesis-gap-metric").textContent = "—";
    document.querySelector("#thesis-demand-label").textContent = "AI-bot activity";
    document.querySelector("#thesis-current-state").textContent = "Not measurable from Radar alone";
    document.querySelector("#thesis-signal-context").textContent = "Identified AI-bot request activity, indexed to 100 at the start of the selected period";
    document.querySelector("#thesis-chart-reading").textContent = "The orange line is the demand signal available from Radar. Referral value is not plotted because Radar does not provide attributable referral, conversion, or revenue data. No value gap is inferred.";
    document.querySelector("#thesis-observed-data-note").textContent = "The demand series is live Radar data; the reciprocal-value side still requires publisher analytics.";
    document.querySelector("#thesis-lead").textContent = "Radar can measure agent demand, but not the value returned to publishers.";
    document.querySelector("#thesis-lead-detail").textContent = "The live traffic series can test whether demand is changing. Referral, conversion, revenue, or paid-access evidence is still required before the value-versus-extraction gap can be calculated.";
    document.querySelector("#thesis-observed-copy").textContent = "Cloudflare Radar reports identified AI-bot request activity for the selected period. It does not report attributable publisher referral or commercial outcomes.";
    document.querySelector("#thesis-meaning-copy").textContent = "Traffic growth may strengthen the demand side of the thesis, but it cannot establish extraction, reciprocity, or economic harm on its own.";
    return;
  }
  const series = valueSeries(slice);
  const labels = SIGNAL_DATA.weeks.slice(-slice.period);
  const finalCrawl = series[0].values.at(-1);
  const finalReferral = series[1].values.at(-1);
  const gap = round(finalCrawl - finalReferral, 0);
  const state = gap > 60 ? "Extraction gap widening" : gap > 25 ? "Value gap emerging" : "Closer to reciprocity";

  renderLegend(document.querySelector("#value-stage-legend"), series);
  renderLineChart(document.querySelector("#value-stage-chart"), series, labels, {
    width: 920,
    height: 380,
    minValue: Math.max(20, Math.floor(Math.min(...series.flatMap(function values(item) { return item.values; })) / 20) * 20),
    maxValue: Math.ceil(Math.max(...series.flatMap(function values(item) { return item.values; })) / 20) * 20,
    points: true,
    candidateIndex: Math.max(1, Math.floor(labels.length / 3)),
  });
  renderLegend(document.querySelector("#value-focus-legend"), series);
  renderLineChart(document.querySelector("#value-focus-chart"), series, labels, {
    width: 900,
    height: 390,
    minValue: 20,
    maxValue: Math.max(180, Math.ceil(finalCrawl / 20) * 20),
    points: true,
    candidateIndex: Math.max(1, Math.floor(labels.length / 3)),
  });

  document.querySelector("#value-state").textContent = state;
  document.querySelector("#value-gap").textContent = gap + " index points";
  document.querySelector("#value-reading").textContent = slice.agentKey === "assistant"
    ? "Assistant traffic returns more referral value than crawler traffic, but the selected scenario remains below reciprocity."
    : "Demand has outpaced returned referral value across the selected " + slice.period + "-week view.";
  document.querySelector("#dock-value").textContent = "Gap +" + gap;
  document.querySelector("#thesis-demand-metric").textContent = Math.round(finalCrawl);
  document.querySelector("#thesis-referral-metric").textContent = Math.round(finalReferral);
  document.querySelector("#thesis-gap-metric").textContent = Math.round(gap);
  document.querySelector("#thesis-demand-label").textContent = "Crawl demand";
  document.querySelector("#thesis-current-state").textContent = state;
  document.querySelector("#thesis-signal-context").textContent = "Crawl demand and referral value, indexed to 100 at the start of the selected period";
  document.querySelector("#thesis-chart-reading").textContent = "The orange line represents demand placed on publishers. The green line represents attributable referral value returned. A wider distance is a warning signal, not proof of economic loss.";
  document.querySelector("#thesis-observed-data-note").textContent = "The values remain illustrative until connected to dated Radar snapshots.";
  document.querySelector("#thesis-lead").textContent = gap > 60
    ? "Agent demand is rising faster than the referral value returned."
    : gap > 25
      ? "Agent demand and returned value are beginning to separate."
      : "Agent demand and returned value remain comparatively close.";
  document.querySelector("#thesis-lead-detail").textContent = "Across " + slice.region.name.toLowerCase() + " and " + slice.agent.name.toLowerCase() + ", the selected " + slice.period + "-week scenario ends with a " + gap + "-point gap. This is a warning signal, not proof of economic harm.";
  document.querySelector("#thesis-observed-copy").textContent = "Crawl demand ends at index " + Math.round(finalCrawl) + " while attributable referral value ends at " + Math.round(finalReferral) + ", creating a " + gap + "-point divergence.";
  document.querySelector("#thesis-meaning-copy").textContent = gap > 60
    ? "The selected scenario suggests the web is becoming easier for agents to consume faster than the value exchange becomes reciprocal."
    : "The selected scenario shows an emerging imbalance that needs more periods and commercial evidence before the thesis changes.";
  document.querySelector("#value-boundary").textContent = "Illustrative scenario · a sustained inflection remains a candidate until verified across periods and sources.";
}

function renderGeography(slice) {
  if (slice.live) {
    const series = slice.live.geography.series
      .filter(function hasValues(item) { return item.values.length > 0; })
      .map(function normalize(item) {
        return { name: item.name, color: item.color, values: normalizeVisible(item.values, item.values.length) };
      });
    if (!series.length) {
      document.querySelector("#geography-legend").replaceChildren();
      renderEmptyState(document.querySelector("#geography-chart"), "Radar returned no geography series for this scope.");
      document.querySelector("#dock-geography").textContent = "No series";
      return;
    }
    const source = slice.live.geography.series.find(function hasTimestamps(item) { return item.timestamps.length; });
    const labels = source
      ? source.timestamps.map(function label(value) {
        return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      })
      : series[0].values.map(function label(_, index) { return "W" + (index + 1); });
    renderLegend(document.querySelector("#geography-legend"), series);
    renderLineChart(document.querySelector("#geography-chart"), series, labels, {
      width: 980,
      height: 390,
      minValue: Math.floor(Math.min(...series.flatMap(function values(item) { return item.values; })) / 10) * 10,
      maxValue: Math.ceil(Math.max(...series.flatMap(function values(item) { return item.values; })) / 10) * 10,
      points: true,
    });
    document.querySelector("#dock-geography").textContent = series.length + (series.length === 1 ? " live location" : " live locations");
    return;
  }
  const series = geographySeries(slice);
  renderLegend(document.querySelector("#geography-legend"), series);
  renderLineChart(document.querySelector("#geography-chart"), series, SIGNAL_DATA.weeks.slice(-slice.period), {
    width: 980,
    height: 390,
    minValue: 40,
    maxValue: Math.max(180, Math.ceil(Math.max(...series.flatMap(function values(item) { return item.values; })) / 20) * 20),
    points: true,
  });
  document.querySelector("#dock-geography").textContent = series.length + (series.length === 1 ? " location" : " locations");
}

function renderReadiness(slice) {
  if (slice.live) {
    const target = document.querySelector("#readiness-list");
    target.replaceChildren();
    const items = slice.live.readiness.items;
    if (!items.length) {
      renderEmptyState(target, "Radar returned no readiness checks for the latest bulk scan.");
    } else {
      items.forEach(function renderCheck(item) {
        target.append(createBarRow(item.label, item.value, 100));
      });
    }
    const domains = formatCompactNumber(slice.live.readiness.successfulDomains);
    document.querySelector("#readiness-context").textContent = "Weekly Radar bulk scan · " + domains + " successfully scanned domains";
    document.querySelector("#readiness-state-label").textContent = "Scan date";
    document.querySelector("#readiness-change").textContent = slice.live.readiness.scanDate || "Latest";
    return;
  }
  const values = readinessValues(slice);
  const target = document.querySelector("#readiness-list");
  target.replaceChildren();
  values.forEach(function renderStandard(value, index) {
    target.append(createBarRow(SIGNAL_DATA.standards[index], value, 70));
  });
  const readinessChange = round(slice.region.readinessChange + slice.agent.readinessOffset * .25, 1);
  document.querySelector("#readiness-context").textContent = slice.region.name + " · " + slice.agent.name + " · share of successfully scanned domains";
  document.querySelector("#readiness-state-label").textContent = "Adoption change";
  document.querySelector("#readiness-change").textContent = signed(readinessChange, " pp");
}

function renderFriction(slice) {
  if (slice.live) {
    const items = slice.live.access.items;
    const success = slice.live.access.successfulShare;
    const total = success == null ? null : Math.max(0, 100 - success);
    const target = document.querySelector("#friction-list");
    const gauge = document.querySelector("#friction-gauge");
    const colors = ["#1f766b", "#b5365a", "#6b5ca5", "#287095", "#a54f0c"];
    let cursor = 0;
    const segments = [];
    target.replaceChildren();
    items.forEach(function renderStatus(item, index) {
      const start = cursor;
      cursor = round(cursor + item.value, 2);
      segments.push(colors[index % colors.length] + " " + start + "% " + cursor + "%");
      const row = document.createElement("li");
      const key = document.createElement("span");
      const number = document.createElement("strong");
      key.className = "key";
      key.style.background = colors[index % colors.length];
      number.textContent = item.value.toFixed(1) + "%";
      row.append(key, document.createTextNode(item.label), number);
      target.append(row);
    });
    gauge.style.background = segments.length ? "conic-gradient(" + segments.join(", ") + ")" : "#e2ddd7";
    gauge.setAttribute("aria-label", total == null ? "Access friction unavailable" : total.toFixed(1) + " percent non-success responses");
    document.querySelector("#friction-total").textContent = total == null ? "—" : total.toFixed(1) + "%";
    document.querySelector("#friction-context").textContent = "Radar HTTP response-status distribution · " + slice.period + " weeks";
    document.querySelector("#friction-boundary").textContent = "Live boundary · response status shows access outcome, but does not identify WAF policy, robots.txt intent, or commercial cause.";
    document.querySelector("#dock-friction").textContent = total == null ? "Not reported" : total.toFixed(1) + "% non-success";
    return;
  }
  const values = frictionValues(slice);
  const total = round(values.reduce(function add(sum, value) { return sum + value; }, 0), 1);
  const target = document.querySelector("#friction-list");
  const gauge = document.querySelector("#friction-gauge");
  let cursor = 0;
  const segments = [];
  target.replaceChildren();

  values.forEach(function renderCause(value, index) {
    const meta = FRICTION_META[index];
    const start = cursor;
    cursor = round(cursor + value, 1);
    segments.push(meta.color + " " + start + "% " + cursor + "%");
    const item = document.createElement("li");
    const key = document.createElement("span");
    const label = document.createTextNode(meta.name);
    const number = document.createElement("strong");
    key.className = "key " + meta.className;
    number.textContent = value.toFixed(1) + "%";
    item.append(key, label, number);
    target.append(item);
  });
  segments.push("#e2ddd7 " + cursor + "% 100%");
  gauge.style.background = "conic-gradient(" + segments.join(", ") + ")";
  gauge.setAttribute("aria-label", total.toFixed(1) + " percent blocked or challenged");
  document.querySelector("#friction-total").textContent = total.toFixed(1) + "%";
  document.querySelector("#friction-context").textContent = slice.region.name + " · " + slice.agent.name + " · blocked or challenged requests";
  document.querySelector("#friction-boundary").textContent = "Friction can represent deliberate publisher policy, not only technical failure.";
  document.querySelector("#dock-friction").textContent = total.toFixed(1) + "%";
}

function renderPurpose(slice) {
  if (slice.live) {
    const target = document.querySelector("#purpose-list");
    const items = slice.live.purpose.items;
    target.replaceChildren();
    if (!items.length) {
      renderEmptyState(target, "Radar returned no crawl-purpose distribution for this scope.");
      document.querySelector("#dock-purpose").textContent = "No distribution";
    } else {
      const maxValue = Math.max(...items.map(function value(item) { return item.value; }));
      items.forEach(function renderPurposeRow(item) {
        target.append(createBarRow(item.label, item.value, maxValue));
      });
      document.querySelector("#dock-purpose").textContent = items[0].label + " " + items[0].value.toFixed(1) + "%";
    }
    document.querySelector("#purpose-context").textContent = "All identified AI bots · Radar request share";
    return;
  }
  const target = document.querySelector("#purpose-list");
  target.replaceChildren();
  const maxValue = Math.max(...slice.agent.purposes);
  slice.agent.purposes.forEach(function renderPurposeRow(value, index) {
    target.append(createBarRow(SIGNAL_DATA.purposes[index], value, maxValue));
  });
  document.querySelector("#purpose-context").textContent = slice.agent.name + " · share of identified requests";
  document.querySelector("#dock-purpose").textContent = "Training " + slice.agent.purposes[0].toFixed(1) + "%";
}

function updateInterpretation(signal, slice) {
  if (slice.live) {
    updateLiveInterpretation(signal, slice);
    return;
  }
  const geographyCount = geographySeries(slice).length;
  const readiness = round(slice.region.readiness + slice.agent.readinessOffset, 1);
  const friction = round(frictionValues(slice).reduce(function add(sum, value) { return sum + value; }, 0), 1);
  const topPurpose = slice.agent.purposes[0];
  const value = valueSeries(slice);
  const valueGap = round(value[0].values.at(-1) - value[1].values.at(-1), 0);
  const copy = {
    value: {
      title: "Value vs extraction",
      observed: "For " + slice.region.name.toLowerCase() + " and " + slice.agent.name.toLowerCase() + ", crawl demand and returned referral value diverge by " + valueGap + " index points in this illustrative scenario.",
      connection: "The gap tests the thesis that agent-originated traffic is becoming economically addressable, rather than merely observable.",
      inference: "Demand is growing faster than reciprocal value. Persistence, attributable conversion, or paid access would determine whether this becomes a durable regime change.",
    },
    geography: {
      title: "Traffic geography",
      observed: geographyCount + " location trends are shown for " + slice.agent.name.toLowerCase() + " over " + slice.period + " weeks, normalized to the first visible week.",
      connection: "Regional divergence can reveal where agent-readable infrastructure, operator mix, or access policy is changing first.",
      inference: "A regional rise is directional evidence only; it needs consistent classification and breadth before it can support a market-level conclusion.",
    },
    readiness: {
      title: "Readiness",
      observed: slice.region.name + " readiness is " + readiness.toFixed(1) + "% for the selected standards and agent class.",
      connection: "Capability exposure links web standards and discovery mechanisms to the infrastructure agents can actually use.",
      inference: "Higher readiness expands technical possibility, but does not establish adoption, usage, conversion, or willingness to pay.",
    },
    friction: {
      title: "Access friction",
      observed: friction.toFixed(1) + "% of the selected illustrative traffic is blocked or challenged, with each cause shown separately.",
      connection: "Access controls connect agent identification and publisher policy to the emerging trust and compensation layer.",
      inference: "More friction can signal deliberate control as well as failure; cause and operator intent matter more than the aggregate alone.",
    },
    purpose: {
      title: "Purpose mix",
      observed: "Training and retrieval represents " + topPurpose.toFixed(1) + "% of requests for " + slice.agent.name.toLowerCase() + " in this illustrative mix.",
      connection: "Purpose classification helps separate extraction, discovery, rendering, monitoring, and potentially value-generating agent activity.",
      inference: "The mix indicates likely intent, not business outcome. Referral, conversion, revenue, and user benefit still need direct evidence.",
    },
  }[signal];

  document.querySelector("#interpretation-title").textContent = copy.title;
  document.querySelector("#inspector-position").textContent = copy.title;
  document.querySelector("#interpretation-observed").textContent = copy.observed;
  document.querySelector("#interpretation-connection").textContent = copy.connection;
  document.querySelector("#interpretation-inference").textContent = copy.inference;
  document.querySelector("#interpretation-method").textContent = "Normalized trend";
  document.querySelector("#interpretation-evidence").textContent = "Illustrative model";
}

function updateLiveInterpretation(signal, slice) {
  const data = slice.live;
  const activityChange = liveActivityChange();
  const readinessCoverage = liveReadinessCoverage();
  const nonSuccess = data.access.successfulShare == null ? null : 100 - data.access.successfulShare;
  const topPurpose = data.purpose.items[0];
  const copy = {
    value: {
      title: "Value vs extraction",
      observed: "Radar measures identified AI-bot request activity, but does not report attributable publisher referral, conversion, revenue, or licensing value.",
      connection: "The demand side can now be observed from Radar. A publisher analytics source is still required to test whether that demand creates reciprocal value.",
      inference: "No extraction gap should be calculated from Radar alone. More agent traffic is not evidence of economic harm or publisher value.",
      method: "Cross-source thesis",
    },
    geography: {
      title: "Traffic geography",
      observed: data.geography.series.length + " Radar location series are normalized to their first visible weekly observation. The overall activity series changed " + (activityChange == null ? "by an unavailable amount" : signed(activityChange, "%")) + ".",
      connection: "Geographic divergence can reveal where identified AI-bot request activity is changing first.",
      inference: "This is a normalized traffic trend, not an absolute estimate of global agent usage. Classification and Cloudflare coverage shape the result.",
      method: data.geography.meta.normalization || "Radar normalization",
    },
    readiness: {
      title: "Readiness",
      observed: (readinessCoverage == null ? "Scan completion is unavailable" : readinessCoverage.toFixed(1) + "% of sampled domains completed the latest readiness scan") + " dated " + (data.readiness.scanDate || "latest") + ". Individual bars show the share of successfully scanned domains exposing each check.",
      connection: "Readiness checks show which capabilities scanned domains expose to agents.",
      inference: "Capability exposure does not prove agent adoption, usage, conversion, or willingness to pay.",
      method: "Weekly bulk scan",
    },
    friction: {
      title: "Access outcomes",
      observed: nonSuccess == null ? "Radar did not return a successful-response share." : nonSuccess.toFixed(1) + "% of identified AI-bot requests received a non-success HTTP response in this scope.",
      connection: "Response outcomes connect agent identification to the practical accessibility of publisher content.",
      inference: "A non-success response cannot by itself be attributed to WAF policy, robots.txt, rate limiting, or commercial intent.",
      method: data.access.meta.normalization || "Response distribution",
    },
    purpose: {
      title: "Purpose mix",
      observed: topPurpose ? topPurpose.label + " is the largest reported crawl-purpose category at " + topPurpose.value.toFixed(1) + "%." : "Radar returned no crawl-purpose distribution.",
      connection: "Purpose classification helps separate training, search, rendering, monitoring, and other identified bot activity.",
      inference: "Purpose indicates likely request intent, not business outcome. Referral, conversion, revenue, and user benefit still need direct evidence.",
      method: data.purpose.meta.normalization || "Request distribution",
    },
  }[signal];

  document.querySelector("#interpretation-title").textContent = copy.title;
  document.querySelector("#inspector-position").textContent = copy.title;
  document.querySelector("#interpretation-observed").textContent = copy.observed;
  document.querySelector("#interpretation-connection").textContent = copy.connection;
  document.querySelector("#interpretation-inference").textContent = copy.inference;
  document.querySelector("#interpretation-method").textContent = copy.method;
  document.querySelector("#interpretation-evidence").textContent = "Live Cloudflare Radar";
}

function createRegimeRow(values, changeClass) {
  const row = document.createElement("tr");
  values.forEach(function addCell(value, index) {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (index === 2 && changeClass) cell.className = changeClass;
    row.append(cell);
  });
  return row;
}

function renderRegimeLog(slice) {
  const target = document.querySelector("#regime-log-body");
  target.replaceChildren();
  if (slice.live) {
    const observedAt = slice.live.activity.meta.lastUpdated || slice.live.fetchedAt;
    const observedDate = new Date(observedAt);
    const label = Number.isNaN(observedDate.getTime())
      ? "Latest snapshot"
      : observedDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    target.append(createRegimeRow([
      label,
      "Cloudflare Radar snapshot",
      "—",
      "Observed",
      "Needs sustained movement and corroborating evidence before promotion",
    ]));
    document.querySelector("#regime-log-summary").textContent = "0 candidates · 0 promoted";
    return;
  }
  target.append(
    createRegimeRow(["Week 12", "Training / retrieval share", "+3.4 pp", "Monitoring", "Needs four-week persistence"], "positive"),
    createRegimeRow(["Week 11", "Readiness adoption", "+4.2 pp", "Monitoring", "Check scan methodology and breadth"], "positive"),
    createRegimeRow(["Week 10", "Access friction", "+2.1 pp", "Watching", "Confirm across multiple geographies"], "negative")
  );
  document.querySelector("#regime-log-summary").textContent = "3 candidates · 0 promoted";
}

function renderAll() {
  const slice = currentSlice();
  renderSummary(slice);
  renderValue(slice);
  renderGeography(slice);
  renderReadiness(slice);
  renderFriction(slice);
  renderPurpose(slice);
  renderRegimeLog(slice);
  updateInterpretation(selectedSignal, slice);
}

function selectSignal(signal, shouldScroll, updateLocation) {
  if (document.querySelector("#observatory-view").hidden) {
    setView("observatory", { scroll: false, updateLocation: false });
  }
  selectedSignal = signal;
  document.querySelectorAll("[data-signal-panel]").forEach(function updatePanel(panel) {
    panel.hidden = panel.dataset.signalPanel !== signal;
  });
  document.querySelectorAll("[data-signal-select]").forEach(function updateControl(control) {
    if (control.dataset.signalSelect === signal) control.setAttribute("aria-current", "true");
    else control.removeAttribute("aria-current");
  });
  updateInterpretation(signal, currentSlice());
  if (updateLocation !== false) window.history.replaceState(null, "", "#signal-" + signal);
  if (shouldScroll) document.querySelector(".focus-stage").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setView(view, options) {
  const config = options || {};
  const thesis = view === "thesis";
  document.body.classList.toggle("thesis-mode", thesis);
  document.querySelector("#observatory-view").hidden = thesis;
  document.querySelector("#thesis-view").hidden = !thesis;
  document.querySelectorAll("[data-show-view]").forEach(function updateViewControl(control) {
    const selected = control.dataset.showView === view;
    if (selected) control.setAttribute("aria-current", "page");
    else control.removeAttribute("aria-current");
  });
  updateInterpretation(thesis ? "value" : selectedSignal, currentSlice());
  if (config.updateLocation !== false) {
    const targetUrl = thesis ? "#value-versus-extraction" : "#signal-" + selectedSignal;
    window.history.replaceState(null, "", targetUrl);
  }
  document.querySelector("#signals-main").focus({ preventScroll: true });
  if (config.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}

function setRailOpen(open) {
  const compact = window.matchMedia("(max-width: 980px)").matches;
  const shell = document.querySelector(".signals-shell");
  const rail = document.querySelector("#interpretation-rail");
  const openButton = document.querySelector("#open-rail");
  const toggleButton = document.querySelector("#toggle-interpretation");
  shell.classList.toggle("rail-collapsed", !open && !compact);
  rail.classList.toggle("closed", !open);
  toggleButton.setAttribute("aria-pressed", String(open));
  openButton.hidden = open || !compact;
}

function syncRailForViewport() {
  const compact = window.matchMedia("(max-width: 980px)").matches;
  if (compact) {
    setRailOpen(false);
  } else {
    setRailOpen(true);
  }
}

function validateLivePayload(payload) {
  return payload
    && payload.schemaVersion === 1
    && payload.source === "Cloudflare Radar"
    && payload.activity
    && Array.isArray(payload.activity.values)
    && payload.geography
    && Array.isArray(payload.geography.series)
    && payload.purpose
    && Array.isArray(payload.purpose.items)
    && payload.access
    && Array.isArray(payload.access.items)
    && payload.readiness
    && Array.isArray(payload.readiness.items);
}

async function refreshLiveData(options) {
  const config = options || {};
  const endpoint = String(window.SIGNALS_CONFIG && window.SIGNALS_CONFIG.radarEndpoint || "").trim();
  const button = document.querySelector("#refresh-data");
  const sourceStatus = document.querySelector("#source-status");
  const sourceDetail = document.querySelector("#source-status-detail");
  if (!endpoint) {
    showDataNotice("Live Radar is ready in the interface, but its secure proxy URL is not configured. The illustrative fallback remains visible.", "error");
    sourceStatus.textContent = "Illustrative fallback";
    sourceDetail.textContent = "Secure Radar proxy not configured";
    return;
  }

  button.disabled = true;
  button.textContent = "Refreshing…";
  sourceStatus.textContent = "Refreshing Radar";
  sourceDetail.textContent = "Keeping the last good dataset visible";
  if (!config.silent) showDataNotice("Requesting the latest available Cloudflare Radar measurements…", "info");

  try {
    const url = new URL(endpoint, window.location.href);
    url.searchParams.set("period", document.querySelector("#period-filter").value);
    url.searchParams.set("region", document.querySelector("#region-filter").value);
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || "Live source returned HTTP " + response.status);
    if (!validateLivePayload(payload)) throw new Error("Live source returned an unsupported data shape");

    LIVE_STATE.mode = "live";
    LIVE_STATE.data = payload;
    setLiveAgentFilter(true);
    renderAll();
    const lastUpdated = payload.activity.meta.lastUpdated || payload.fetchedAt;
    sourceStatus.textContent = "Live Cloudflare Radar";
    sourceDetail.textContent = "Updated " + formatTimestamp(lastUpdated);
    showDataNotice("Live Radar loaded. Thesis fields that Radar does not measure are marked unavailable.", "success");
  } catch (error) {
    sourceStatus.textContent = isLive() ? "Live Radar · last good result" : "Illustrative fallback";
    sourceDetail.textContent = isLive() ? "Refresh failed; prior data preserved" : "Live refresh unavailable";
    showDataNotice("Could not refresh Radar: " + (error instanceof Error ? error.message : "unknown error") + ". " + (isLive() ? "The last good live dataset remains visible." : "The illustrative fallback remains visible."), "error");
  } finally {
    button.disabled = false;
    button.textContent = "Refresh data";
  }
}

function bindControls() {
  document.querySelectorAll("[data-show-view]").forEach(function bindView(button) {
    button.addEventListener("click", function showView() {
      setView(button.dataset.showView);
    });
  });
  document.querySelectorAll("[data-signal-select]").forEach(function bindSignal(button) {
    button.addEventListener("click", function showSignal() {
      selectSignal(button.dataset.signalSelect, true, true);
    });
  });
  ["#period-filter", "#region-filter", "#agent-filter"].forEach(function bindFilter(selector) {
    document.querySelector(selector).addEventListener("change", function updateScope() {
      if (isLive() && selector !== "#agent-filter") refreshLiveData();
      else renderAll();
    });
  });
  document.querySelector("#refresh-data").addEventListener("click", function refreshData() {
    refreshLiveData();
  });
  document.querySelector("a[href='#regime-log']").addEventListener("click", function showRegimeLog() {
    setView("observatory", { scroll: false, updateLocation: false });
  });
  document.querySelector("[data-explain='geography']").addEventListener("click", function openMethod() {
    setRailOpen(true);
    document.querySelector(".method-note").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.querySelector("#close-rail").addEventListener("click", function closeRail() {
    setRailOpen(false);
  });
  document.querySelector("#open-rail").addEventListener("click", function openRail() {
    setRailOpen(true);
  });
  document.querySelector("#toggle-interpretation").addEventListener("click", function toggleRail() {
    setRailOpen(document.querySelector("#toggle-interpretation").getAttribute("aria-pressed") !== "true");
  });
  window.addEventListener("hashchange", function syncHash() {
    if (window.location.hash === "#value-versus-extraction") {
      setView("thesis", { scroll: false, updateLocation: false });
      return;
    }
    setView("observatory", { scroll: false, updateLocation: false });
    const signalMatch = window.location.hash.match(/^#signal-(value|geography|readiness|friction|purpose)$/);
    if (signalMatch) selectSignal(signalMatch[1], false, false);
  });
  window.addEventListener("resize", syncRailForViewport);
}

function initialize() {
  renderAll();
  bindControls();
  syncRailForViewport();
  const signalMatch = window.location.hash.match(/^#signal-(value|geography|readiness|friction|purpose)$/);
  if (signalMatch) selectedSignal = signalMatch[1];
  selectSignal(selectedSignal, false, false);
  setView(window.location.hash === "#value-versus-extraction" ? "thesis" : "observatory", { scroll: false, updateLocation: false });
  if (window.SIGNALS_CONFIG && window.SIGNALS_CONFIG.radarEndpoint) {
    refreshLiveData({ silent: true });
  }
}

initialize();
