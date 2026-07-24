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
};

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes, text) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes || {}).forEach(function setAttribute(entry) {
    element.setAttribute(entry[0], entry[1]);
  });
  if (text != null) element.textContent = text;
  return element;
}

function linePath(values, bounds, minValue, maxValue) {
  const range = Math.max(maxValue - minValue, 1);
  return values.map(function point(value, index) {
    const x = bounds.left + index / Math.max(values.length - 1, 1) * bounds.width;
    const y = bounds.top + (maxValue - value) / range * bounds.height;
    return (index === 0 ? "M " : " L ") + x.toFixed(2) + " " + y.toFixed(2);
  }).join("");
}

function visibleGeographies() {
  const region = document.querySelector("#region-filter").value;
  const period = Number(document.querySelector("#period-filter").value);
  const all = Object.values(SIGNAL_DATA.geographies);
  const filtered = region === "global"
    ? all
    : all.filter(function matchesRegion(series) {
      return series.region === region || (region === "europe" && series.name === "United Kingdom");
    });
  return filtered.map(function trimSeries(series) {
    return { ...series, values: series.values.slice(-period) };
  });
}

function renderLineChart(target, series, labels, options) {
  target.replaceChildren();
  const config = options || {};
  const width = config.width || 760;
  const height = config.height || 270;
  const bounds = { left: 42, top: 18, width: width - 58, height: height - 50 };
  const values = series.flatMap(function flatten(item) { return item.values; });
  const minValue = config.minValue == null ? Math.floor(Math.min(...values) / 20) * 20 : config.minValue;
  const maxValue = config.maxValue == null ? Math.ceil(Math.max(...values) / 20) * 20 : config.maxValue;
  const svg = svgElement("svg", { viewBox: "0 0 " + width + " " + height, "aria-hidden": "true" });

  const tickCount = 4;
  for (let tick = 0; tick <= tickCount; tick += 1) {
    const value = minValue + (maxValue - minValue) * (tickCount - tick) / tickCount;
    const y = bounds.top + bounds.height * tick / tickCount;
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
    svg.append(svgElement("text", { x: x + 5, y: bounds.top + 10, class: "candidate-label" }, "Candidate inflection"));
  }

  series.forEach(function renderSeries(item) {
    svg.append(svgElement("path", {
      d: linePath(item.values, bounds, minValue, maxValue),
      class: "series-line",
      stroke: item.color,
    }));
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
    wrapper.className = "legend-item";
    const swatch = document.createElement("i");
    swatch.className = "legend-swatch";
    swatch.style.setProperty("--swatch", item.color);
    wrapper.append(swatch, document.createTextNode(item.name));
    target.append(wrapper);
  });
}

function renderGeography() {
  const period = Number(document.querySelector("#period-filter").value);
  const series = visibleGeographies();
  const labels = SIGNAL_DATA.weeks.slice(-period);
  renderLegend(document.querySelector("#geography-legend"), series);
  renderLineChart(document.querySelector("#geography-chart"), series, labels, {
    width: 820,
    height: 265,
    minValue: 40,
    maxValue: 220,
  });
}

function valueSeries(period) {
  return Object.values(SIGNAL_DATA.value).map(function trimValueSeries(series) {
    return { ...series, values: series.values.slice(-period) };
  });
}

function renderValueCharts() {
  const period = Number(document.querySelector("#period-filter").value);
  const labels = SIGNAL_DATA.weeks.slice(-period);
  const series = valueSeries(period);
  renderLineChart(document.querySelector("#value-mini-chart"), series, labels, {
    width: 460,
    height: 145,
    minValue: 40,
    maxValue: 220,
  });
  renderLegend(document.querySelector("#value-focus-legend"), Object.values(SIGNAL_DATA.value));
  renderLineChart(document.querySelector("#value-focus-chart"), Object.values(SIGNAL_DATA.value), SIGNAL_DATA.weeks, {
    width: 900,
    height: 390,
    minValue: 40,
    maxValue: 220,
    points: true,
    candidateIndex: 3,
  });
}

function setView(view) {
  const thesis = view === "thesis";
  document.querySelector("#observatory-view").hidden = thesis;
  document.querySelector("#thesis-view").hidden = !thesis;
  document.querySelectorAll("[data-show-view]").forEach(function updateViewControl(control) {
    const selected = control.dataset.showView === view;
    if (selected) control.setAttribute("aria-current", "page");
    else control.removeAttribute("aria-current");
  });
  if (thesis) window.history.replaceState(null, "", "#value-versus-extraction");
  else window.history.replaceState(null, "", window.location.pathname);
  document.querySelector("#signals-main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindControls() {
  document.querySelectorAll("[data-show-view]").forEach(function bindView(button) {
    button.addEventListener("click", function showView() {
      setView(button.dataset.showView);
    });
  });
  document.querySelector("#period-filter").addEventListener("change", function updatePeriod() {
    renderGeography();
    renderValueCharts();
  });
  document.querySelector("#region-filter").addEventListener("change", renderGeography);
  document.querySelector("#agent-filter").addEventListener("change", function explainPrototypeFilter(event) {
    const status = document.querySelector(".prototype-status");
    status.lastChild.textContent = " Illustrative " + event.target.options[event.target.selectedIndex].text.toLowerCase();
  });
  document.querySelector("[data-explain='geography']").addEventListener("click", function openMethod() {
    document.querySelector("#interpretation-rail").classList.remove("closed");
    document.querySelector("#open-rail").hidden = true;
    document.querySelector(".method-note").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.querySelector("#close-rail").addEventListener("click", function closeRail() {
    document.querySelector("#interpretation-rail").classList.add("closed");
    document.querySelector("#open-rail").hidden = false;
  });
  document.querySelector("#open-rail").addEventListener("click", function openRail() {
    document.querySelector("#interpretation-rail").classList.remove("closed");
    document.querySelector("#open-rail").hidden = true;
  });
  window.addEventListener("hashchange", function syncHash() {
    setView(window.location.hash === "#value-versus-extraction" ? "thesis" : "observatory");
  });
}

function initialize() {
  renderGeography();
  renderValueCharts();
  bindControls();
  setView(window.location.hash === "#value-versus-extraction" ? "thesis" : "observatory");
}

initialize();
