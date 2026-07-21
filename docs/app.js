const TYPE_COLORS = {
  event: "#b45309",
  entity: "#1f766b",
  concept: "#6b5ca5",
  thesis: "#b5365a",
  index: "#536271",
  system: "#9a9188",
  query: "#287095",
};

const state = {
  graph: null,
  nodeById: new Map(),
  adjacency: new Map(),
  visibleTypes: new Set(["event", "entity", "concept", "thesis", "index"]),
  selectedId: null,
  pathNodes: new Set(),
  pathEdges: new Set(),
  transform: { x: 0, y: 0, scale: 1 },
  width: 0,
  height: 0,
};

const svg = document.querySelector("#graph");
const viewport = document.querySelector("#viewport");
const nodeLayer = document.querySelector("#nodes");
const edgeLayer = document.querySelector("#edges");
const detailEmpty = document.querySelector("#detail-empty");
const detailContent = document.querySelector("#detail-content");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);
}

function edgeKey(edge) {
  return `${edge.source}|${edge.type}|${edge.target}`;
}

function isVisible(node) {
  return state.visibleTypes.has(node.type);
}

function relatedEdges(nodeId, includeReferences = true) {
  const edges = state.adjacency.get(nodeId) || [];
  return includeReferences ? edges : edges.filter(edge => edge.type !== "references");
}

function otherEnd(edge, nodeId) {
  return edge.source === nodeId ? edge.target : edge.source;
}

function buildIndexes() {
  state.nodeById = new Map(state.graph.nodes.map(node => [node.id, node]));
  state.adjacency = new Map(state.graph.nodes.map(node => [node.id, []]));
  state.graph.edges.forEach(edge => {
    state.adjacency.get(edge.source)?.push(edge);
    state.adjacency.get(edge.target)?.push(edge);
  });
}

function nodeRadius(node) {
  const degree = relatedEdges(node.id, false).length;
  return node.type === "thesis" ? 9 + Math.min(degree, 7) : 6 + Math.min(degree * .65, 6);
}

function initializePositions() {
  const rect = svg.getBoundingClientRect();
  state.width = Math.max(rect.width, 600);
  state.height = Math.max(rect.height, 400);
  const cx = state.width / 2;
  const cy = state.height / 2;
  const count = state.graph.nodes.length;
  state.graph.nodes.forEach((node, index) => {
    const angle = (index / count) * Math.PI * 2 + (index % 3) * .3;
    const ring = 85 + (index % 7) * 24;
    node.x = cx + Math.cos(angle) * ring;
    node.y = cy + Math.sin(angle) * ring;
    node.vx = 0;
    node.vy = 0;
  });
}

function createGraphElements() {
  edgeLayer.replaceChildren();
  nodeLayer.replaceChildren();

  state.graph.edges.forEach(edge => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("edge");
    if (edge.type === "references") line.classList.add("reference");
    line.dataset.key = edgeKey(edge);
    line.dataset.source = edge.source;
    line.dataset.target = edge.target;
    edge.element = line;
    edgeLayer.append(line);
  });

  state.graph.nodes.forEach(node => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("node");
    group.dataset.id = node.id;
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");
    group.setAttribute("aria-label", `${node.title}, ${node.type}`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", nodeRadius(node));
    circle.setAttribute("fill", TYPE_COLORS[node.type] || TYPE_COLORS.system);
    group.append(circle);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", nodeRadius(node) + 5);
    label.setAttribute("y", "3.5");
    label.textContent = node.title.length > 36 ? `${node.title.slice(0, 34)}…` : node.title;
    group.append(label);

    group.addEventListener("click", event => {
      event.stopPropagation();
      selectNode(node.id);
    });
    group.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode(node.id);
      }
    });
    installNodeDrag(group, node);
    node.element = group;
    nodeLayer.append(group);
  });
}

function simulate(iterations = 190) {
  const nodes = state.graph.nodes.filter(node => node.type !== "system");
  const cx = state.width / 2;
  const cy = state.height / 2;
  let tick = 0;

  function step() {
    const alpha = 1 - tick / iterations;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distance2 = Math.max(dx * dx + dy * dy, 80);
        const distance = Math.sqrt(distance2);
        const force = (340 / distance2) * alpha;
        dx /= distance;
        dy /= distance;
        a.vx -= dx * force;
        a.vy -= dy * force;
        b.vx += dx * force;
        b.vy += dy * force;
      }
    }

    state.graph.edges.forEach(edge => {
      if (edge.type === "references") return;
      const a = state.nodeById.get(edge.source);
      const b = state.nodeById.get(edge.target);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const desired = 88 + (a.type === "thesis" || b.type === "thesis" ? 18 : 0);
      const force = (distance - desired) * .0028 * alpha;
      a.vx += (dx / distance) * force;
      a.vy += (dy / distance) * force;
      b.vx -= (dx / distance) * force;
      b.vy -= (dy / distance) * force;
    });

    nodes.forEach(node => {
      node.vx += (cx - node.x) * .0006 * alpha;
      node.vy += (cy - node.y) * .0006 * alpha;
      node.vx *= .88;
      node.vy *= .88;
      node.x += node.vx;
      node.y += node.vy;
    });
    renderPositions();
    tick += 1;
    if (tick < iterations) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderPositions() {
  state.graph.edges.forEach(edge => {
    const source = state.nodeById.get(edge.source);
    const target = state.nodeById.get(edge.target);
    edge.element.setAttribute("x1", source.x);
    edge.element.setAttribute("y1", source.y);
    edge.element.setAttribute("x2", target.x);
    edge.element.setAttribute("y2", target.y);
  });
  state.graph.nodes.forEach(node => node.element.setAttribute("transform", `translate(${node.x} ${node.y})`));
}

function updateVisibility() {
  let visibleCount = 0;
  state.graph.nodes.forEach(node => {
    const visible = isVisible(node);
    node.element.classList.toggle("hidden", !visible);
    if (visible) visibleCount += 1;
  });
  state.graph.edges.forEach(edge => {
    const visible = isVisible(state.nodeById.get(edge.source)) && isVisible(state.nodeById.get(edge.target));
    edge.element.classList.toggle("hidden", !visible);
  });
  document.querySelector("#empty-state").hidden = visibleCount !== 0;
}

function updateHighlights() {
  state.graph.nodes.forEach(node => {
    node.element.classList.toggle("selected", node.id === state.selectedId);
    node.element.classList.toggle("path", state.pathNodes.has(node.id));
    node.element.classList.toggle("dimmed", state.pathNodes.size > 0 && !state.pathNodes.has(node.id));
  });
  state.graph.edges.forEach(edge => edge.element.classList.toggle("path", state.pathEdges.has(edgeKey(edge))));
  document.querySelectorAll(".timeline-item").forEach(item => item.classList.toggle("selected", item.dataset.id === state.selectedId));
}

function selectNode(nodeId, center = true) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  state.selectedId = nodeId;
  state.visibleTypes.add(node.type);
  const checkbox = document.querySelector(`.filter-list input[value="${node.type}"]`);
  if (checkbox) checkbox.checked = true;
  updateVisibility();
  updateHighlights();
  renderDetails(node);
  if (center) centerNode(node);
}

function renderDetails(node) {
  detailEmpty.hidden = true;
  detailContent.hidden = false;
  const metadata = Object.entries(node.metadata || {}).filter(([key]) => !["updated", "status"].includes(key));
  const relations = relatedEdges(node.id, false)
    .map(edge => ({ edge, node: state.nodeById.get(otherEnd(edge, node.id)) }))
    .filter(item => item.node)
    .sort((a, b) => a.edge.type.localeCompare(b.edge.type) || a.node.title.localeCompare(b.node.title));
  const evidence = node.evidence || [];

  detailContent.innerHTML = `
    <div class="type-badge"><span class="dot ${escapeHtml(node.type)}"></span>${escapeHtml(node.type)}</div>
    <h2 class="detail-title">${escapeHtml(node.title)}</h2>
    <p class="detail-summary">${escapeHtml(node.summary || "No summary has been written yet.")}</p>
    ${metadata.length ? `<dl class="meta-grid">${metadata.map(([key, value]) => `<div class="meta-item"><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}
    <section class="detail-section">
      <h3>Typed relationships · ${relations.length}</h3>
      <ul class="relation-list">${relations.length ? relations.map(({ edge, node: related }) => {
        const direction = edge.source === node.id ? "→" : "←";
        return `<li><button class="relation-button" data-node-id="${escapeHtml(related.id)}"><small>${direction} ${escapeHtml(edge.type)}</small><br>${escapeHtml(related.title)}</button></li>`;
      }).join("") : "<li>No typed relationships.</li>"}</ul>
    </section>
    ${evidence.length ? `<section class="detail-section"><h3>Evidence · ${evidence.length}</h3><ul class="evidence-list">${evidence.map(item => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul></section>` : ""}
    <div class="note-path">Obsidian note: ${escapeHtml(node.path)}</div>
  `;

  detailContent.querySelectorAll("[data-node-id]").forEach(button => {
    button.addEventListener("click", () => selectNode(button.dataset.nodeId));
  });
}

function renderTimeline() {
  const events = state.graph.nodes
    .filter(node => node.type === "event")
    .sort((a, b) => (a.metadata.date || "").localeCompare(b.metadata.date || ""));
  const container = document.querySelector("#timeline-items");
  container.innerHTML = events.map(node => `
    <button class="timeline-item" type="button" data-id="${escapeHtml(node.id)}">
      <time datetime="${escapeHtml(node.metadata.date)}">${escapeHtml(formatDate(node.metadata.date))}</time>
      <strong>${escapeHtml(node.title)}</strong>
      <span>${escapeHtml(node.metadata.stage || "unknown")} · ${escapeHtml(node.metadata.industry || "general")}</span>
    </button>
  `).join("");
  container.querySelectorAll(".timeline-item").forEach(item => item.addEventListener("click", () => selectNode(item.dataset.id)));
  if (events.length) {
    document.querySelector("#timeline-range").textContent = `${formatDate(events[0].metadata.date)} — ${formatDate(events.at(-1).metadata.date)}`;
  }
}

function formatDate(value) {
  if (!value) return "Undated";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function renderCounts() {
  const counts = {};
  state.graph.nodes.forEach(node => { counts[node.type] = (counts[node.type] || 0) + 1; });
  Object.entries(counts).forEach(([type, count]) => {
    const target = document.querySelector(`#count-${type}`);
    if (target) target.textContent = count;
  });
  document.querySelector("#graph-stats").textContent = `${state.graph.nodeCount} nodes · ${state.graph.edgeCount} links`;
  document.querySelector("#node-titles").innerHTML = state.graph.nodes
    .filter(node => !["system", "index"].includes(node.type))
    .map(node => `<option value="${escapeHtml(node.title)}"></option>`).join("");
}

function performSearch(query) {
  const container = document.querySelector("#search-results");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) {
    container.replaceChildren();
    state.graph.nodes.forEach(node => node.element.classList.remove("dimmed"));
    updateHighlights();
    return;
  }
  const matches = state.graph.nodes
    .map(node => {
      const haystack = `${node.title} ${node.summary} ${Object.values(node.metadata || {}).join(" ")}`.toLowerCase();
      return { node, score: terms.reduce((score, term) => score + (node.title.toLowerCase().includes(term) ? 4 : 0) + (haystack.includes(term) ? 1 : 0), 0) };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title))
    .slice(0, 7);
  const ids = new Set(matches.map(item => item.node.id));
  state.graph.nodes.forEach(node => node.element.classList.toggle("dimmed", !ids.has(node.id)));
  container.innerHTML = matches.length
    ? matches.map(({ node }) => `<button class="search-result" type="button" data-node-id="${escapeHtml(node.id)}">${escapeHtml(node.title)}<small>${escapeHtml(node.type)}</small></button>`).join("")
    : `<p class="status-text">No matching nodes.</p>`;
  container.querySelectorAll("[data-node-id]").forEach(button => button.addEventListener("click", () => selectNode(button.dataset.nodeId)));
}

function resolveTitle(value) {
  const folded = value.trim().toLowerCase();
  return state.graph.nodes.find(node => node.title.toLowerCase() === folded || node.id.toLowerCase() === folded);
}

function findPath(startId, goalId) {
  const queue = [startId];
  const previous = new Map([[startId, null]]);
  while (queue.length && !previous.has(goalId)) {
    const current = queue.shift();
    for (const edge of relatedEdges(current, false)) {
      const neighbor = otherEnd(edge, current);
      if (!previous.has(neighbor)) {
        previous.set(neighbor, { prior: current, edge });
        queue.push(neighbor);
      }
    }
  }
  if (!previous.has(goalId)) return null;
  const nodes = [goalId];
  const edges = [];
  let cursor = goalId;
  while (cursor !== startId) {
    const step = previous.get(cursor);
    edges.push(step.edge);
    cursor = step.prior;
    nodes.push(cursor);
  }
  return { nodes: nodes.reverse(), edges: edges.reverse() };
}

function tracePath() {
  const start = resolveTitle(document.querySelector("#path-from").value);
  const end = resolveTitle(document.querySelector("#path-to").value);
  const status = document.querySelector("#path-status");
  if (!start || !end) {
    status.textContent = "Choose two exact node titles from the suggestions.";
    return;
  }
  const result = findPath(start.id, end.id);
  state.pathNodes.clear();
  state.pathEdges.clear();
  if (!result) {
    status.textContent = "No typed-relation path was found.";
  } else {
    result.nodes.forEach(id => state.pathNodes.add(id));
    result.edges.forEach(edge => state.pathEdges.add(edgeKey(edge)));
    status.textContent = `${result.edges.length} hop${result.edges.length === 1 ? "" : "s"}: ${result.nodes.map(id => state.nodeById.get(id).title).join(" → ")}`;
    selectNode(end.id);
  }
  updateHighlights();
}

function applyTransform() {
  viewport.setAttribute("transform", `translate(${state.transform.x} ${state.transform.y}) scale(${state.transform.scale})`);
  document.querySelector("#zoom-reset").textContent = `${Math.round(state.transform.scale * 100)}%`;
}

function centerNode(node) {
  const rect = svg.getBoundingClientRect();
  state.transform.x = rect.width / 2 - node.x * state.transform.scale;
  state.transform.y = rect.height / 2 - node.y * state.transform.scale;
  applyTransform();
}

function changeZoom(factor, origin = null) {
  const rect = svg.getBoundingClientRect();
  const point = origin || { x: rect.width / 2, y: rect.height / 2 };
  const oldScale = state.transform.scale;
  const newScale = Math.min(2.4, Math.max(.38, oldScale * factor));
  const worldX = (point.x - state.transform.x) / oldScale;
  const worldY = (point.y - state.transform.y) / oldScale;
  state.transform.x = point.x - worldX * newScale;
  state.transform.y = point.y - worldY * newScale;
  state.transform.scale = newScale;
  applyTransform();
}

function installPanAndZoom() {
  let pan = null;
  svg.addEventListener("pointerdown", event => {
    if (event.target.closest?.(".node")) return;
    pan = { x: event.clientX, y: event.clientY, tx: state.transform.x, ty: state.transform.y };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", event => {
    if (!pan) return;
    state.transform.x = pan.tx + event.clientX - pan.x;
    state.transform.y = pan.ty + event.clientY - pan.y;
    applyTransform();
  });
  svg.addEventListener("pointerup", () => { pan = null; });
  svg.addEventListener("wheel", event => {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    changeZoom(event.deltaY < 0 ? 1.12 : .89, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { passive: false });
  svg.addEventListener("click", event => {
    if (event.target === svg || event.target.closest?.("#viewport") === viewport) {
      state.selectedId = null;
      updateHighlights();
    }
  });
}

function installNodeDrag(element, node) {
  let drag = null;
  element.addEventListener("pointerdown", event => {
    event.stopPropagation();
    drag = { x: event.clientX, y: event.clientY, nx: node.x, ny: node.y, moved: false };
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("pointermove", event => {
    if (!drag) return;
    const dx = (event.clientX - drag.x) / state.transform.scale;
    const dy = (event.clientY - drag.y) / state.transform.scale;
    drag.moved ||= Math.abs(dx) + Math.abs(dy) > 3;
    node.x = drag.nx + dx;
    node.y = drag.ny + dy;
    node.vx = 0;
    node.vy = 0;
    renderPositions();
  });
  element.addEventListener("pointerup", event => {
    if (drag?.moved) event.stopPropagation();
    drag = null;
  });
}

function bindControls() {
  document.querySelector("#search").addEventListener("input", event => performSearch(event.target.value));
  document.querySelector("#clear-search").addEventListener("click", () => {
    document.querySelector("#search").value = "";
    performSearch("");
  });
  document.querySelectorAll(".filter-list input").forEach(input => {
    input.addEventListener("change", () => {
      if (input.checked) state.visibleTypes.add(input.value);
      else state.visibleTypes.delete(input.value);
      updateVisibility();
    });
  });
  document.querySelector("#find-path").addEventListener("click", tracePath);
  document.querySelectorAll("[data-path-from][data-path-to]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector("#path-from").value = button.dataset.pathFrom;
      document.querySelector("#path-to").value = button.dataset.pathTo;
      tracePath();
    });
  });
  document.querySelector("#swap-path").addEventListener("click", () => {
    const from = document.querySelector("#path-from");
    const to = document.querySelector("#path-to");
    [from.value, to.value] = [to.value, from.value];
  });
  document.querySelector("#zoom-in").addEventListener("click", () => changeZoom(1.18));
  document.querySelector("#zoom-out").addEventListener("click", () => changeZoom(.84));
  document.querySelector("#zoom-reset").addEventListener("click", resetTransform);
  document.querySelector("#reset-view").addEventListener("click", () => {
    state.pathNodes.clear();
    state.pathEdges.clear();
    state.selectedId = null;
    document.querySelector("#path-from").value = "";
    document.querySelector("#path-to").value = "";
    document.querySelector("#path-status").textContent = "Uses typed relations, excluding generic references.";
    performSearch("");
    updateHighlights();
    resetTransform();
  });
}

function resetTransform() {
  state.transform = { x: 0, y: 0, scale: 1 };
  applyTransform();
}

async function initialize() {
  try {
    const response = await fetch("graph.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.graph = await response.json();
    buildIndexes();
    initializePositions();
    createGraphElements();
    renderCounts();
    renderTimeline();
    updateVisibility();
    installPanAndZoom();
    bindControls();
    renderPositions();
    simulate();
  } catch (error) {
    document.querySelector("#graph-stats").textContent = "Graph unavailable";
    document.querySelector("#empty-state").hidden = false;
    document.querySelector("#empty-state").textContent = `Could not load graph.json: ${error.message}`;
  }
}

initialize();
