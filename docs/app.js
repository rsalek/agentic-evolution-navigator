const TYPE_COLORS = {
  event: "#b45309",
  entity: "#1f766b",
  concept: "#6b5ca5",
  thesis: "#b5365a",
  index: "#536271",
  system: "#9a9188",
  query: "#287095",
};

const VIEW_COPY = {
  map: "Seven ideas organize the evidence before deeper exploration.",
  themes: "Choose an idea area, then inspect its complete membership.",
  focus: "Explore one item and its nearest evidence relationships.",
  evidence: "Follow a theme from actors and events to concepts and theses.",
};

const VIEW_TITLES = {
  map: "Agent Economy Landscape",
  themes: "Themes",
  focus: "Explore connections",
  evidence: "Evidence flow",
};

const HIDDEN_PUBLIC_NODE_IDS = new Set(["index-home"]);

const VIEW_EXAMPLES = {
  map: {
    label: "Evidence paths",
    items: [
      { title: "Production → bounded adoption", description: "Connect a scaled deployment to the bounded-service thesis", action: "path", from: "C Spire scales agent email triage", to: "Scaled agent adoption concentrates in bounded service operations" },
      { title: "Payments → trust", description: "Follow a production payment into the trust layer", action: "path", from: "BBVA and Visa complete agent-initiated payment", to: "Trust infrastructure monetizes before full autonomy" },
      { title: "Traffic → market", description: "Trace measured agent traffic to its economic thesis", action: "path", from: "DataDome reports 45 percent Q2 agent-traffic growth", to: "Agent-originated traffic is becoming an addressable market" },
    ],
  },
  focus: {
    label: "Connected hubs",
    items: [
      { title: "ServiceNow ecosystem", description: "Explore the most cross-connected enterprise platform", action: "focus", node: "ServiceNow" },
      { title: "Trust and governance", description: "Explore the broadest control mechanism", action: "focus", node: "Agent Trust and Governance" },
      { title: "Mastercard network", description: "Follow the payment network and its production events", action: "focus", node: "Mastercard" },
    ],
  },
  themes: {
    label: "Idea themes",
    items: [
      { title: "Transaction rails", description: "Payments, procurement, settlement, and machine commerce", action: "theme", theme: "transactions-commerce" },
      { title: "Cybersecurity", description: "Agent-driven threats, controls, detection, and response", action: "theme", theme: "cybersecurity-agent-safety" },
      { title: "Adoption and economics", description: "Usage, market development, and attributable value", action: "theme", theme: "adoption-economics-monetization" },
    ],
  },
  evidence: {
    label: "Evidence chains",
    items: [
      { title: "Platform distribution", description: "Actors, events, concepts, and theses in enterprise distribution", action: "theme-evidence", theme: "platform-distribution-records" },
      { title: "Payments production", description: "Follow the machine-commerce evidence chain", action: "theme-evidence", theme: "transactions-commerce" },
      { title: "Trust infrastructure", description: "Read identity, authorization, and traffic evidence", action: "theme-evidence", theme: "trust-identity-authorization" },
    ],
  },
};

const state = {
  graph: null,
  nodeById: new Map(),
  adjacency: new Map(),
  typedAdjacency: new Map(),
  visibleTypes: new Set(["event", "entity", "concept", "thesis", "query", "index"]),
  selectedId: null,
  keyboardNodeId: null,
  pathNodes: new Set(),
  pathEdges: new Set(),
  searchMatches: null,
  transform: { x: 0, y: 0, scale: 1 },
  width: 0,
  height: 0,
  viewMode: "map",
  viewNodeIds: null,
  focusId: null,
  focusHops: 2,
  focusHistory: [],
  focusLevels: new Map(),
  focusTreePairs: new Set(),
  themeById: new Map(),
  activeThemeId: null,
  themePrimaryNodeIds: new Set(),
  themeSecondaryNodeIds: new Set(),
  labelNodeIds: null,
  layoutTargets: new Map(),
  layoutBounds: null,
  evidenceOrientation: "horizontal",
  evidenceCanvasWidth: 0,
  draggingId: null,
  layoutRun: 0,
  sidebarOpen: true,
  detailOpen: false,
  navigationReady: false,
  timelineSignature: "",
};

const appShell = document.querySelector(".app-shell");
const sidebar = document.querySelector("#graph-controls");
const detailPanel = document.querySelector("#detail-panel");
const svg = document.querySelector("#graph");
const viewport = document.querySelector("#viewport");
const guideLayer = document.querySelector("#layout-guides");
const edgeLayer = document.querySelector("#edges");
const edgeLabelLayer = document.querySelector("#edge-labels");
const nodeLayer = document.querySelector("#nodes");
const detailEmpty = document.querySelector("#detail-empty");
const detailContent = document.querySelector("#detail-content");
const focusControls = document.querySelector("#focus-controls");
const focusStatus = document.querySelector("#focus-status");
const themeControls = document.querySelector("#theme-controls");
const themeStatus = document.querySelector("#theme-status");
const viewStatus = document.querySelector("#view-status");
const graphKey = document.querySelector("#graph-key");
const workspaceContext = document.querySelector("#workspace-context");
const workspaceTitle = document.querySelector("#workspace-title");
const canvasWrap = document.querySelector("#canvas-wrap");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setPanelVisibility(panel, open) {
  if (panel === "sidebar") {
    state.sidebarOpen = open;
    appShell.classList.toggle("sidebar-collapsed", !open);
    sidebar.setAttribute("aria-hidden", open ? "false" : "true");
    document.querySelector("#toggle-sidebar").setAttribute("aria-expanded", open ? "true" : "false");
  } else {
    state.detailOpen = open;
    appShell.classList.toggle("detail-collapsed", !open);
    detailPanel.setAttribute("aria-hidden", open ? "false" : "true");
    document.querySelector("#toggle-detail").setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (state.graph) requestAnimationFrame(function refitAfterPanelChange() {
    applyCurrentLayout(true);
  });
}

function visibleNodeSequence() {
  if (!state.graph) return [];
  return visibleNodes();
}

function updateInspectorNavigation() {
  const nodes = visibleNodeSequence();
  const index = nodes.findIndex(function selectedNodeIndex(node) {
    return node.id === state.selectedId;
  });
  const up = document.querySelector("#node-up");
  const down = document.querySelector("#node-down");
  const clear = document.querySelector("#clear-selection");
  const position = document.querySelector("#inspector-position");
  up.disabled = index <= 0;
  down.disabled = index < 0 || index >= nodes.length - 1;
  clear.disabled = !state.selectedId;
  position.textContent = index >= 0 ? (index + 1) + " of " + nodes.length : "No selection";
}

function navigationUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", state.viewMode);
  if (state.selectedId) url.searchParams.set("node", state.selectedId);
  else url.searchParams.delete("node");
  if (state.activeThemeId && ["themes", "evidence"].includes(state.viewMode)) {
    url.searchParams.set("theme", state.activeThemeId);
  } else {
    url.searchParams.delete("theme");
  }
  return url;
}

function syncNavigationUrl(historyMode, previousUrl) {
  if (!state.graph) return;
  const url = navigationUrl();
  if (historyMode === "none") return;
  if (historyMode === "push" && previousUrl && previousUrl !== url.href) {
    window.history.replaceState(null, "", previousUrl);
    window.history.pushState(null, "", url);
    return;
  }
  window.history.replaceState(null, "", url);
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, function replaceCharacter(char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[char];
  });
}

function countLabel(count, singular, plural) {
  return count + " " + (count === 1 ? singular : (plural || singular + "s"));
}

function humanizeLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, function capitalize(character) {
      return character.toUpperCase();
    });
}

function edgeKey(edge) {
  return edge.source + "|" + edge.type + "|" + edge.target;
}

function isTypeVisible(node) {
  return state.visibleTypes.has(node.type);
}

function isVisible(node) {
  return isTypeVisible(node) && (!state.viewNodeIds || state.viewNodeIds.has(node.id));
}

function relatedEdges(nodeId, includeReferences) {
  return (includeReferences === false ? state.typedAdjacency : state.adjacency).get(nodeId) || [];
}

function typedRelationshipCount(nodeId) {
  const node = state.nodeById.get(nodeId);
  return node?.typedDegree ?? relatedEdges(nodeId, false).length;
}

function uniqueTypedNeighborCount(nodeId) {
  const node = state.nodeById.get(nodeId);
  if (node?.uniqueTypedNeighbors != null) return node.uniqueTypedNeighbors;
  return new Set(relatedEdges(nodeId, false).map(function toOtherId(edge) {
    return otherEnd(edge, nodeId);
  })).size;
}

function otherEnd(edge, nodeId) {
  return edge.source === nodeId ? edge.target : edge.source;
}

function buildIndexes() {
  state.nodeById = new Map(state.graph.nodes.map(function indexNode(node) {
    return [node.id, node];
  }));
  state.adjacency = new Map(state.graph.nodes.map(function seedAdjacency(node) {
    return [node.id, []];
  }));
  state.typedAdjacency = new Map(state.graph.nodes.map(function seedTypedAdjacency(node) {
    return [node.id, []];
  }));
  const parallelGroups = new Map();
  state.graph.edges.forEach(function indexEdge(edge) {
    edge.key = edgeKey(edge);
    state.adjacency.get(edge.source)?.push(edge);
    state.adjacency.get(edge.target)?.push(edge);
    if (edge.type !== "references") {
      state.typedAdjacency.get(edge.source)?.push(edge);
      state.typedAdjacency.get(edge.target)?.push(edge);
    }
    const pair = [edge.source, edge.target].sort().join("|");
    if (!parallelGroups.has(pair)) parallelGroups.set(pair, []);
    parallelGroups.get(pair).push(edge);
  });
  parallelGroups.forEach(function numberParallelEdges(edges) {
    edges.forEach(function assignParallelPosition(edge, index) {
      edge.parallelIndex = index;
      edge.parallelCount = edges.length;
    });
  });
  state.graph.nodes.forEach(function cacheNodeMetrics(node) {
    const typedEdges = relatedEdges(node.id, false);
    node.typedDegree = typedEdges.length;
    node.uniqueTypedNeighbors = new Set(typedEdges.map(function neighborId(edge) {
      return otherEnd(edge, node.id);
    })).size;
    node.radius = 6 + Math.min(12, Math.sqrt(Math.max(node.uniqueTypedNeighbors, 1)) * 2.35);
  });
  state.themeById = new Map((state.graph.themes || []).map(function indexTheme(theme) {
    return [theme.id, theme];
  }));
}

function nodeRadius(node) {
  return node.radius;
}

function updateCanvasSize() {
  const rect = svg.getBoundingClientRect();
  state.width = Math.max(rect.width, 600);
  state.height = Math.max(rect.height, 400);
}

function initializePositions() {
  updateCanvasSize();
  const cx = state.width / 2;
  const cy = state.height / 2;
  const nodes = state.graph.nodes.filter(isTypeVisible);
  const count = Math.max(nodes.length, 1);
  nodes.forEach(function positionNode(node, index) {
    const angle = index / count * Math.PI * 2 + index % 3 * 0.3;
    const ring = 86 + index % 8 * 27;
    node.x = cx + Math.cos(angle) * ring;
    node.y = cy + Math.sin(angle) * ring;
    node.vx = 0;
    node.vy = 0;
  });
}

function createGraphElements() {
  edgeLayer.replaceChildren();
  edgeLabelLayer.replaceChildren();
  nodeLayer.replaceChildren();

  state.graph.edges.forEach(function createEdge(edge) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("edge");
    if (edge.type === "references") path.classList.add("reference");
    path.dataset.key = edge.key;
    path.dataset.source = edge.source;
    path.dataset.target = edge.target;
    edge.element = path;
    edgeLayer.append(path);

    if (edge.type !== "references") {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.classList.add("edge-label");
      label.textContent = edge.type;
      edge.labelElement = label;
      edgeLabelLayer.append(label);
    }
  });

  state.graph.nodes.forEach(function createNode(node) {
    const degree = typedRelationshipCount(node.id);
    const uniqueNeighbors = uniqueTypedNeighborCount(node.id);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("node", "node-" + node.type);
    if (node.type === "event") {
      group.classList.add(
        "stage-" + (node.metadata.stage || "announcement"),
        "proof-" + (node.metadata.commercial_proof || "unproven")
      );
    }
    group.dataset.id = node.id;
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "-1");
    group.setAttribute(
      "aria-label",
      node.title + ", " + humanizeLabel(node.type) + ", " +
      countLabel(uniqueNeighbors, "connected item") + ", " + countLabel(degree, "typed link")
    );

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = node.title + " · " + countLabel(degree, "typed link");
    group.append(title);

    const radius = nodeRadius(node);
    let shape;
    if (node.type === "event" || node.type === "query" || node.type === "index") {
      shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const side = radius * (node.type === "event" ? 1.55 : 1.45);
      shape.setAttribute("x", -side / 2);
      shape.setAttribute("y", -side / 2);
      shape.setAttribute("width", side);
      shape.setAttribute("height", side);
      shape.setAttribute("rx", node.type === "event" ? "3" : "1.5");
    } else if (node.type === "concept") {
      shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      shape.setAttribute("points", "0," + -radius + " " + radius + ",0 0," + radius + " " + -radius + ",0");
    } else if (node.type === "thesis") {
      const half = radius * 0.87;
      shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      shape.setAttribute(
        "points",
        -half + "," + -radius / 2 + " 0," + -radius + " " + half + "," + -radius / 2 +
        " " + half + "," + radius / 2 + " 0," + radius + " " + -half + "," + radius / 2
      );
    } else {
      shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      shape.setAttribute("r", radius);
    }
    shape.classList.add("node-shape");
    shape.setAttribute("fill", TYPE_COLORS[node.type] || TYPE_COLORS.system);
    group.append(shape);

    const count = document.createElementNS("http://www.w3.org/2000/svg", "text");
    count.classList.add("node-count");
    count.setAttribute("x", "0");
    count.setAttribute("y", "2.7");
    count.textContent = degree;
    group.append(count);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("node-title");
    label.setAttribute("x", nodeRadius(node) + 5);
    label.setAttribute("y", "3.5");
    const shortTitle = node.title.length > 30 ? node.title.slice(0, 28) + "…" : node.title;
    label.textContent = shortTitle;
    group.append(label);
    if (node.type === "event") {
      const evidenceBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
      evidenceBadge.classList.add("node-evidence-badge");
      evidenceBadge.setAttribute("x", nodeRadius(node) + 5);
      evidenceBadge.setAttribute("y", "16");
      evidenceBadge.textContent = (node.metadata.stage || "announcement") + " · " +
        (node.metadata.confidence || "low") + " confidence · " +
        (node.metadata.commercial_proof || "unproven") + " commercial proof";
      group.append(evidenceBadge);
      node.evidenceBadgeElement = evidenceBadge;
    }

    group.addEventListener("click", function handleNodeClick(event) {
      event.stopPropagation();
      if (event.detail === 0) activateNode(node.id);
    });
    group.addEventListener("pointerenter", function raiseHoveredNode() {
      nodeLayer.append(group);
      group.classList.add("label-peek");
      node.labelElement.textContent = node.title;
    });
    group.addEventListener("pointerleave", function restoreShortTitle() {
      group.classList.remove("label-peek");
      node.labelElement.textContent = node.displayTitle;
    });
    group.addEventListener("focus", function showFocusedTitle() {
      group.classList.add("label-peek");
      node.labelElement.textContent = node.title;
    });
    group.addEventListener("blur", function restoreBlurredTitle() {
      group.classList.remove("label-peek");
      node.labelElement.textContent = node.displayTitle;
    });
    group.addEventListener("keydown", function handleNodeKey(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateNode(node.id);
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        moveNodeFocus(node.id, event.key);
      } else if (event.key === "Escape" && state.viewMode === "focus" && state.focusId) {
        event.preventDefault();
        focusNodeElement(state.focusId);
      }
    });
    node.element = group;
    node.shape = shape;
    node.labelElement = label;
    node.displayTitle = shortTitle;
    node.defaultDisplayTitle = shortTitle;
    nodeLayer.append(group);
  });
}

function nodeLabelBounds(node) {
  const scale = Math.max(state.transform.scale, 0.45);
  const width = Math.min(156, Math.max(44, node.displayTitle.length * 5.45)) / scale;
  const height = 15 / scale;
  const gap = nodeRadius(node) + 5 / scale;
  return node.labelOnLeft
    ? { left: node.x - gap - width, right: node.x - gap, top: node.y - height / 2, bottom: node.y + height / 2 }
    : { left: node.x + gap, right: node.x + gap + width, top: node.y - height / 2, bottom: node.y + height / 2 };
}

function labelsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function nodeHasPersistentLabel(node) {
  return !state.labelNodeIds || state.labelNodeIds.has(node.id) || node.id === state.selectedId;
}

function simulate(iterations, fitAfter) {
  const run = ++state.layoutRun;
  const mode = state.viewMode;
  const totalIterations = reducedMotion.matches ? 1 : (iterations || 190);
  const nodes = visibleNodes().filter(function simulatedNode(node) {
    return node.type !== "system";
  });
  const nodeIds = new Set(nodes.map(function nodeId(node) { return node.id; }));
  const edges = state.graph.edges.filter(function simulatedEdge(edge) {
    return edge.type !== "references" && nodeIds.has(edge.source) && nodeIds.has(edge.target);
  });
  const cx = state.width / 2;
  const cy = state.height / 2;
  let tick = 0;

  function step() {
    if (run !== state.layoutRun || state.viewMode !== mode) return;
    const progress = tick / Math.max(totalIterations, 1);
    const alpha = Math.max(0.025, Math.pow(1 - progress, 1.35));

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        if (dx === 0 && dy === 0) {
          dx = (i % 2 ? -1 : 1) * 0.1;
          dy = (j % 2 ? -1 : 1) * 0.1;
        }
        const distance2 = Math.max(dx * dx + dy * dy, 30);
        const distance = Math.sqrt(distance2);
        const minimumDistance = nodeRadius(a) + nodeRadius(b) + (mode === "map" ? 10 : 24);
        const repulsion = (mode === "map" ? 390 : 260) / distance2 * alpha;
        const collision = distance < minimumDistance ? (minimumDistance - distance) * 0.026 * alpha : 0;
        const force = repulsion + collision;
        const unitX = dx / distance;
        const unitY = dy / distance;
        a.vx -= unitX * force;
        a.vy -= unitY * force;
        b.vx += unitX * force;
        b.vy += unitY * force;

        if (mode !== "map" && nodeHasPersistentLabel(a) && nodeHasPersistentLabel(b) &&
            labelsOverlap(nodeLabelBounds(a), nodeLabelBounds(b))) {
          const direction = a.y <= b.y ? -1 : 1;
          const labelForce = 0.85 * alpha;
          a.vy += direction * labelForce;
          b.vy -= direction * labelForce;
        }
      }
    }

    edges.forEach(function applyEdgeForce(edge) {
      const a = state.nodeById.get(edge.source);
      const b = state.nodeById.get(edge.target);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      let desired = 100 + (a.type === "thesis" || b.type === "thesis" ? 18 : 0);
      let strength = 0.0026;
      if (mode === "focus") {
        desired = state.focusTreePairs.has(edgePair(edge)) ? 112 : 148;
        strength = state.focusTreePairs.has(edgePair(edge)) ? 0.0034 : 0.00055;
      } else if (mode === "themes") {
        const sameTheme = a.theme?.primary === b.theme?.primary;
        desired = sameTheme ? 96 : 190;
        strength = sameTheme ? 0.0022 : 0.0002;
      } else if (mode === "evidence") {
        desired = 170;
        strength = 0.0007;
      }
      const force = (distance - desired) * strength * alpha;
      a.vx += dx / distance * force;
      a.vy += dy / distance * force;
      b.vx -= dx / distance * force;
      b.vy -= dy / distance * force;
    });

    nodes.forEach(function moveNode(node) {
      const target = state.layoutTargets.get(node.id);
      if (target && node.id !== state.draggingId) {
        const xStrength = mode === "evidence" || mode === "map" ? 0.055 : (mode === "focus" ? 0.0075 : 0.018);
        const yStrength = mode === "evidence" || mode === "map" ? 0.04 : (mode === "focus" ? 0.0075 : 0.018);
        node.vx += (target.x - node.x) * xStrength * alpha;
        node.vy += (target.y - node.y) * yStrength * alpha;
      }
      if (node.id === state.draggingId) {
        node.vx = 0;
        node.vy = 0;
        return;
      }
      node.vx *= mode === "map" ? 0.78 : 0.84;
      node.vy *= mode === "map" ? 0.78 : 0.84;
      node.x += node.vx;
      node.y += node.vy;
      constrainStructuredPosition(node, mode);
    });
    renderPositions();
    tick += 1;
    if (tick < totalIterations) {
      requestAnimationFrame(step);
    } else if (fitAfter && state.draggingId == null) {
      fitVisibleNodes();
    }
  }
  requestAnimationFrame(step);
}

function edgeGeometry(edge, source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const offset = (edge.parallelIndex - (edge.parallelCount - 1) / 2) * 8;

  if (state.viewMode === "evidence") {
    const controlOne = {
      x: source.x + dx * 0.42 + normalX * offset,
      y: source.y + normalY * offset,
    };
    const controlTwo = {
      x: target.x - dx * 0.42 + normalX * offset,
      y: target.y + normalY * offset,
    };
    return {
      path: "M " + source.x + " " + source.y + " C " +
        controlOne.x + " " + controlOne.y + ", " +
        controlTwo.x + " " + controlTwo.y + ", " +
        target.x + " " + target.y,
      labelX: (source.x + 3 * controlOne.x + 3 * controlTwo.x + target.x) / 8,
      labelY: (source.y + 3 * controlOne.y + 3 * controlTwo.y + target.y) / 8,
    };
  }

  const control = {
    x: (source.x + target.x) / 2 + normalX * offset * 1.8,
    y: (source.y + target.y) / 2 + normalY * offset * 1.8,
  };
  return {
    path: "M " + source.x + " " + source.y + " Q " + control.x + " " + control.y + " " + target.x + " " + target.y,
    labelX: (source.x + 2 * control.x + target.x) / 4,
    labelY: (source.y + 2 * control.y + target.y) / 4,
  };
}

function renderPositions() {
  state.graph.edges.forEach(function positionEdge(edge) {
    const source = state.nodeById.get(edge.source);
    const target = state.nodeById.get(edge.target);
    if (!source || !target || !Number.isFinite(source.x) || !Number.isFinite(target.x)) return;
    const geometry = edgeGeometry(edge, source, target);
    edge.element.setAttribute("d", geometry.path);
    if (edge.labelElement) {
      let labelX = geometry.labelX;
      let labelY = geometry.labelY;
      if (state.viewMode === "evidence" && state.selectedId &&
          (edge.source === state.selectedId || edge.target === state.selectedId)) {
        const selected = edge.source === state.selectedId ? source : target;
        const other = edge.source === state.selectedId ? target : source;
        labelX = selected.x + (other.x - selected.x) * 0.7;
        labelY = selected.y + (other.y - selected.y) * 0.7;
      }
      edge.labelElement.setAttribute("x", labelX);
      edge.labelElement.setAttribute("y", labelY - 3);
    }
  });
  state.graph.nodes.forEach(function positionNode(node) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const scale = Math.max(state.transform.scale, 0.3);
    let labelOnLeft = false;
    if (state.viewMode === "focus" && state.focusId) {
      const hub = state.nodeById.get(state.focusId);
      labelOnLeft = Boolean(hub && node.id !== hub.id && node.x < hub.x);
    } else if (state.viewMode === "evidence") {
      labelOnLeft = node.x > state.evidenceCanvasWidth * (state.evidenceOrientation === "vertical" ? 0.7 : 0.82);
    } else {
      labelOnLeft = node.x > state.width * 0.68;
    }
    node.labelOnLeft = labelOnLeft;
    node.labelElement.setAttribute("x", (labelOnLeft ? -1 : 1) * (nodeRadius(node) + 5 / scale));
    node.labelElement.setAttribute("text-anchor", labelOnLeft ? "end" : "start");
    if (node.evidenceBadgeElement) {
      node.evidenceBadgeElement.setAttribute("x", (labelOnLeft ? -1 : 1) * (nodeRadius(node) + 5 / scale));
      node.evidenceBadgeElement.setAttribute("text-anchor", labelOnLeft ? "end" : "start");
    }
    node.element.setAttribute("transform", "translate(" + node.x + " " + node.y + ")");
  });
}

function edgeIsVisible(edge) {
  const source = state.nodeById.get(edge.source);
  const target = state.nodeById.get(edge.target);
  if (!source || !target || !isVisible(source) || !isVisible(target)) return false;
  if (state.viewMode === "map") return false;
  if (state.viewMode === "themes" && !state.activeThemeId) return false;
  if (["focus", "map", "themes", "evidence"].includes(state.viewMode) && edge.type === "references") return false;
  return true;
}

function edgePair(edge) {
  return [edge.source, edge.target].sort().join("|");
}

function updateVisibility() {
  let visibleCount = 0;
  const labelledRelationTypes = new Set();
  state.graph.nodes.forEach(function toggleNode(node) {
    const visible = isVisible(node);
    node.element.classList.toggle("hidden", !visible);
    node.element.classList.toggle(
      "label-collapsed",
      Boolean(visible && state.labelNodeIds && !state.labelNodeIds.has(node.id))
    );
    node.element.setAttribute("aria-hidden", visible ? "false" : "true");
    if (visible) visibleCount += 1;
  });
  state.graph.edges.forEach(function toggleEdge(edge) {
    const visible = edgeIsVisible(edge);
    const focusTreeEdge = state.viewMode === "focus" && state.focusTreePairs.has(edgePair(edge));
    const labelledFocusEdge = focusTreeEdge &&
      (edge.source === state.focusId || edge.target === state.focusId);
    edge.element.classList.toggle("hidden", !visible);
    edge.element.classList.toggle("focus-edge", visible && focusTreeEdge);
    edge.element.classList.toggle("focus-context-edge", visible && state.viewMode === "focus" && !focusTreeEdge);
    edge.element.classList.toggle("layer-edge", visible && state.viewMode === "evidence");
    const selectedLayerEdge = state.viewMode === "evidence" && state.selectedId &&
      (edge.source === state.selectedId || edge.target === state.selectedId);
    const contextLabelCandidate = selectedLayerEdge || labelledFocusEdge;
    const showContextLabel = contextLabelCandidate && !labelledRelationTypes.has(edge.type);
    if (showContextLabel) labelledRelationTypes.add(edge.type);
    edge.element.classList.toggle("layer-selected-edge", Boolean(visible && selectedLayerEdge));
    edge.element.classList.toggle(
      "layer-context-edge",
      Boolean(visible && state.viewMode === "evidence" && state.selectedId && !selectedLayerEdge)
    );
    if (edge.labelElement) {
      edge.labelElement.classList.toggle(
        "visible",
        visible && showContextLabel
      );
    }
    if (state.viewMode === "themes" && visible) {
      const secondaryEdge = state.themeSecondaryNodeIds.has(edge.source) ||
        state.themeSecondaryNodeIds.has(edge.target);
      edge.element.style.opacity = secondaryEdge ? "0.12" : "";
    } else {
      edge.element.style.opacity = "";
    }
  });
  const empty = document.querySelector("#empty-state");
  const summaryWithoutNodes = state.viewMode === "map" ||
    (state.viewMode === "themes" && !state.activeThemeId);
  empty.hidden = visibleCount !== 0 || summaryWithoutNodes;
  if (!visibleCount && !summaryWithoutNodes) {
    empty.textContent = state.viewMode === "focus"
      ? "No items remain in this view after filtering."
      : "No items match the current filters.";
  }
  updateRovingTabIndex();
  updateWorkspaceContext();
  updateInspectorNavigation();
}

function updateHighlights() {
  state.graph.nodes.forEach(function highlightNode(node) {
    const pathDimmed = state.pathNodes.size > 0 && !state.pathNodes.has(node.id);
    const searchDimmed = state.searchMatches && !state.searchMatches.has(node.id);
    node.element.classList.toggle("selected", node.id === state.selectedId);
    node.element.setAttribute("aria-pressed", node.id === state.selectedId ? "true" : "false");
    node.element.classList.toggle("path", state.pathNodes.has(node.id));
    node.element.classList.toggle("dimmed", Boolean(pathDimmed || searchDimmed));
  });
  state.graph.edges.forEach(function highlightEdge(edge) {
    const pathActive = state.pathNodes.size > 0;
    const onPath = state.pathEdges.has(edge.key);
    edge.element.classList.toggle("path", onPath);
    edge.element.classList.toggle("dimmed", pathActive && !onPath);
    if (edge.labelElement) {
      edge.labelElement.classList.toggle("dimmed", pathActive && !onPath);
    }
  });
  document.querySelectorAll(".timeline-item").forEach(function highlightTimelineItem(item) {
    item.classList.toggle("selected", item.dataset.id === state.selectedId);
  });
}

function visibleNodes() {
  return state.graph.nodes.filter(isVisible);
}

function updateRovingTabIndex() {
  const visible = visibleNodes();
  const visibleIds = new Set(visible.map(function toId(node) { return node.id; }));
  let activeId = state.keyboardNodeId;
  if (!visibleIds.has(activeId)) {
    activeId = [state.selectedId, state.focusId].find(function visibleCandidate(id) {
      return visibleIds.has(id);
    }) || (visible[0] && visible[0].id);
  }
  state.keyboardNodeId = activeId || null;
  state.graph.nodes.forEach(function setTabIndex(node) {
    node.element.setAttribute("tabindex", node.id === activeId ? "0" : "-1");
  });
}

function focusNodeElement(nodeId) {
  const node = state.nodeById.get(nodeId);
  if (!node || !isVisible(node)) return;
  state.keyboardNodeId = nodeId;
  updateRovingTabIndex();
  node.element.focus();
}

function moveNodeFocus(currentId, key) {
  const current = state.nodeById.get(currentId);
  if (!current) return;
  const direction = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
  }[key];
  const candidates = visibleNodes().filter(function directionalCandidate(node) {
    if (node.id === currentId) return false;
    const dx = node.x - current.x;
    const dy = node.y - current.y;
    return dx * direction.x + dy * direction.y > 3;
  }).map(function scoreCandidate(node) {
    const dx = node.x - current.x;
    const dy = node.y - current.y;
    const forward = dx * direction.x + dy * direction.y;
    const sideways = Math.abs(dx * direction.y - dy * direction.x);
    return { node: node, score: forward + sideways * 1.65 };
  }).sort(function nearestDirection(a, b) {
    return a.score - b.score;
  });
  if (candidates.length) focusNodeElement(candidates[0].node.id);
}

function activateNode(nodeId) {
  const target = state.nodeById.get(nodeId);
  const hiddenByCurrentView = state.viewMode !== "focus" &&
    state.viewNodeIds &&
    !state.viewNodeIds.has(nodeId);
  if (target && hiddenByCurrentView) {
    state.focusId = nodeId;
    state.selectedId = nodeId;
    setViewMode("focus");
    return;
  }
  if (state.viewMode === "focus" && nodeId !== state.focusId) {
    navigateFocus(nodeId, true);
  } else {
    selectNode(nodeId, true);
  }
}

function prepareNodeSelection(node, revealMobileInspector) {
  state.selectedId = node.id;
  state.keyboardNodeId = node.id;
  state.visibleTypes.add(node.type);
  const checkbox = document.querySelector('.filter-list input[value="' + node.type + '"]');
  if (checkbox) checkbox.checked = true;
  renderDetails(node);
  if (!state.detailOpen) setPanelVisibility("detail", true);
  if (window.innerWidth <= 800 && revealMobileInspector !== false) {
    requestAnimationFrame(function revealMobileInspector() {
      detailPanel.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }
  syncNavigationUrl();
}

function selectNode(nodeId, center) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  prepareNodeSelection(node);
  updateVisibility();
  updateHighlights();
  if (state.viewMode === "evidence") {
    graphKey.textContent = "Selected relationships are labelled. Drag items or scroll to adjust the view.";
  }
  if (center !== false) centerNode(node);
  simulate(110);
}

function navigateFocus(nodeId, pushHistory) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  if (pushHistory && state.focusId && state.focusId !== nodeId) state.focusHistory.push(state.focusId);
  state.focusId = nodeId;
  prepareNodeSelection(node);
  applyCurrentLayout(true);
}

function renderDetails(node) {
  detailEmpty.hidden = true;
  detailContent.hidden = false;
  const metadata = Object.entries(node.metadata || {}).filter(function filterMetadata(entry) {
    const hiddenKeys = node.type === "event"
      ? ["updated", "status", "confidence", "stage", "commercial_proof"]
      : ["updated", "status"];
    const value = entry[1];
    const empty = value == null || value === "" || (Array.isArray(value) && !value.length);
    return !hiddenKeys.includes(entry[0]) && !empty;
  });
  const relations = relatedEdges(node.id, false)
    .map(function relationItem(edge) {
      return { edge: edge, node: state.nodeById.get(otherEnd(edge, node.id)) };
    })
    .filter(function hasNode(item) {
      return Boolean(item.node);
    })
    .sort(function sortRelations(a, b) {
      return a.edge.type.localeCompare(b.edge.type) || a.node.title.localeCompare(b.node.title);
    });
  const evidence = node.evidence || [];
  const uniqueNeighbors = uniqueTypedNeighborCount(node.id);

  let html = '<div class="type-badge"><span class="dot ' + escapeHtml(node.type) + '"></span>' +
    escapeHtml(humanizeLabel(node.type)) + "</div>";
  html += '<h2 class="detail-title">' + escapeHtml(node.title) + "</h2>";
  html += '<p class="connection-summary">' + countLabel(uniqueNeighbors, "connected item") + " · " +
    countLabel(relations.length, "typed link") + "</p>";
  html += '<p class="detail-summary">' + escapeHtml(node.summary || "No summary has been written yet.") + "</p>";
  if (node.theme?.primary) {
    const primary = state.themeById.get(node.theme.primary);
    const secondary = (node.theme.secondary || []).map(function secondaryTitle(id) {
      return state.themeById.get(id)?.title || id;
    });
    const basis = (node.theme.basis || []).slice(0, 3).map(function basisLabel(item) {
      if (item.kind === "override") return "explicit taxonomy override";
      if (item.kind === "seed") return "fixed theme seed";
      if (item.kind === "keyword") return 'keyword match: "' + item.keyword + '"';
      if (item.kind === "relation") return humanizeLabel(item.relation) + " link to " +
        (state.nodeById.get(item.node)?.title || item.node);
      if (item.kind === "two-hop") return "two-hop " + humanizeLabel(item.relation) + " path";
      return item.kind;
    }).join("; ");
    html += '<section class="theme-inspector"><p><small>Primary theme</small><strong>' +
      escapeHtml(primary?.title || node.theme.primary) + "</strong></p>";
    if (secondary.length) {
      html += "<p><small>Secondary themes</small><span>" + escapeHtml(secondary.join(", ")) + "</span></p>";
    }
    html += "<p><small>Assignment basis</small><span>" + escapeHtml(basis || "deterministic taxonomy fallback") +
      "</span></p></section>";
  }
  if (node.type === "event") {
    html += '<div class="evidence-badges"><span class="maturity-badge">Maturity · ' +
      escapeHtml(node.metadata.stage || "announcement") + '</span><span class="confidence-badge">Confidence · ' +
      escapeHtml(node.metadata.confidence || "low") + '</span><span class="proof-badge proof-' +
      escapeHtml(node.metadata.commercial_proof || "unproven") + '">Commercial proof · ' +
      escapeHtml(node.metadata.commercial_proof || "unproven") + "</span></div>";
  }
  if (metadata.length) {
    html += '<dl class="meta-grid">' + metadata.map(function metadataItem(entry) {
      const displayValue = ["industry", "layer", "commercial_signals"].includes(entry[0])
        ? String(entry[1]).replaceAll("-", " ")
        : entry[1];
      return '<div class="meta-item"><dt>' + escapeHtml(humanizeLabel(entry[0])) + "</dt><dd>" +
        escapeHtml(displayValue) + "</dd></div>";
    }).join("") + "</dl>";
  }
  html += '<section class="detail-section"><h3>Relationships · ' + relations.length + "</h3>";
  html += '<ul class="relation-list">' + (relations.length ? relations.map(function relationButton(item) {
    const direction = item.edge.source === node.id ? "→" : "←";
    return '<li><button class="relation-button" data-node-id="' + escapeHtml(item.node.id) +
      '" aria-label="Open related item: ' + escapeHtml(item.node.title) + ', ' +
      escapeHtml(humanizeLabel(item.edge.type)) + '"><small>' +
      direction + " " + escapeHtml(humanizeLabel(item.edge.type)) + "</small><br>" +
      escapeHtml(item.node.title) + "</button></li>";
  }).join("") : "<li>No typed relationships.</li>") + "</ul></section>";
  if (evidence.length) {
    html += '<section class="detail-section"><h3>Sources · ' + evidence.length + '</h3><ul class="evidence-list">' +
      evidence.map(function evidenceLink(item) {
        return '<li><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer" ' +
          'aria-label="Open source in a new tab: ' + escapeHtml(item.label) + '">' +
          escapeHtml(item.label) + '<span aria-hidden="true"> ↗</span></a></li>';
      }).join("") + "</ul></section>";
  }
  detailContent.innerHTML = html;
  detailContent.querySelectorAll("[data-node-id]").forEach(function bindRelation(button) {
    button.addEventListener("click", function activateRelation() {
      activateNode(button.dataset.nodeId);
    });
  });
  updateInspectorNavigation();
}

function clearDetails() {
  detailContent.hidden = true;
  detailContent.replaceChildren();
  detailEmpty.hidden = false;
  updateInspectorNavigation();
}

function navigateVisibleNodes(offset) {
  const nodes = visibleNodeSequence();
  const currentIndex = nodes.findIndex(function currentNodeIndex(node) {
    return node.id === state.selectedId;
  });
  const next = nodes[currentIndex + offset];
  if (!next) return;
  activateNode(next.id);
  focusNodeElement(next.id);
}

function clearCurrentSelection() {
  state.selectedId = null;
  state.keyboardNodeId = null;
  if (state.viewMode === "focus") {
    state.focusId = null;
    state.focusHistory = [];
    state.viewMode = "map";
    applyCurrentLayout(true);
  } else {
    updateVisibility();
    updateHighlights();
    clearDetails();
    simulate(90);
  }
  syncNavigationUrl();
  updateWorkspaceContext();
}

function renderTimeline() {
  const themeScoped = ["themes", "evidence"].includes(state.viewMode) && state.activeThemeId;
  const focusScoped = state.viewMode === "focus" && state.viewNodeIds;
  const events = state.graph.nodes.filter(function eventForCurrentView(node) {
    if (node.type !== "event") return false;
    if (themeScoped) return node.theme?.primary === state.activeThemeId;
    if (focusScoped) return state.viewNodeIds.has(node.id);
    return true;
  }).sort(function byDate(a, b) {
    return (a.metadata.date || "").localeCompare(b.metadata.date || "");
  });
  const signature = [
    state.viewMode,
    state.activeThemeId || "",
    state.focusId || "",
    events.map(function eventId(node) { return node.id; }).join(","),
  ].join("|");
  if (signature === state.timelineSignature) return;
  state.timelineSignature = signature;

  const container = document.querySelector("#timeline-items");
  const title = document.querySelector("#timeline-title");
  const latestButton = document.querySelector("#timeline-latest");
  title.textContent = focusScoped ? "Evidence near this item" : (themeScoped ? "Theme evidence" : "Recent evidence");
  latestButton.disabled = !events.length;
  container.innerHTML = events.length ? events.map(function timelineItem(node) {
    return '<button class="timeline-item' + (node.id === state.selectedId ? " selected" : "") +
      '" type="button" data-id="' + escapeHtml(node.id) + '">' +
      '<time datetime="' + escapeHtml(node.metadata.date) + '">' + escapeHtml(formatDate(node.metadata.date)) + "</time>" +
      "<strong>" + escapeHtml(node.title) + "</strong>" +
      "<span>" + escapeHtml(node.metadata.stage || "unknown") + " · " + escapeHtml(node.metadata.industry || "general") + "</span>" +
      "</button>";
  }).join("") : '<p class="timeline-empty">No accepted events in this view.</p>';
  container.querySelectorAll(".timeline-item").forEach(function bindTimeline(item) {
    item.addEventListener("click", function selectTimelineNode() {
      activateNode(item.dataset.id);
    });
  });
  if (events.length) {
    document.querySelector("#timeline-range").textContent =
      formatDate(events[0].metadata.date) + " — " + formatDate(events.at(-1).metadata.date) +
      " · " + countLabel(events.length, "event");
    requestAnimationFrame(function showNewestTimelineItems() {
      container.scrollLeft = container.scrollWidth - container.clientWidth;
    });
  } else {
    document.querySelector("#timeline-range").textContent = "No dated evidence";
  }
}

function formatDate(value) {
  if (!value) return "Undated";
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function renderCounts() {
  const counts = {};
  state.graph.nodes.forEach(function countNode(node) {
    counts[node.type] = (counts[node.type] || 0) + 1;
  });
  Object.entries(counts).forEach(function displayCount(entry) {
    const target = document.querySelector("#count-" + entry[0]);
    if (target) target.textContent = entry[1];
  });
  const indexFilter = document.querySelector('.filter-list input[value="index"]')?.closest("label");
  if (indexFilter) indexFilter.hidden = !counts.index;
  document.querySelector("#graph-stats").textContent =
    countLabel(state.graph.nodes.length, "record") + " · " + countLabel(state.graph.edges.length, "link");
  document.querySelector("#node-titles").innerHTML = state.graph.nodes
    .filter(function selectableTitle(node) {
      return !["system"].includes(node.type);
    })
    .map(function titleOption(node) {
      return '<option value="' + escapeHtml(node.title) + '"></option>';
    }).join("");
  updateWorkspaceContext();
}

function updateWorkspaceContext() {
  if (!state.graph) return;
  const activeTheme = state.activeThemeId ? state.themeById.get(state.activeThemeId) : null;
  workspaceTitle.textContent = VIEW_TITLES[state.viewMode];
  if (state.viewMode === "themes" && activeTheme) {
    workspaceTitle.textContent = activeTheme.shortTitle || activeTheme.title;
  }
  if (state.viewMode === "evidence" && activeTheme) {
    workspaceTitle.textContent = "Evidence flow: " + (activeTheme.shortTitle || activeTheme.title);
  }
  if (state.viewMode === "map") {
    workspaceContext.textContent = VIEW_COPY.map;
    return;
  }
  if (state.viewMode === "themes" && !activeTheme) {
    workspaceContext.textContent = countLabel(state.graph.themes?.length || 0, "theme") + " · " + VIEW_COPY.themes;
    return;
  }
  const visible = state.graph.nodes.filter(isVisible).length;
  const selected = state.selectedId ? state.nodeById.get(state.selectedId) : null;
  if (activeTheme && ["themes", "evidence"].includes(state.viewMode)) {
    workspaceContext.textContent = activeTheme.definition;
    return;
  }
  workspaceContext.textContent = selected
    ? selected.title + " · " + VIEW_COPY[state.viewMode]
    : countLabel(visible, "visible item") + " · " + VIEW_COPY[state.viewMode];
}

function performSearch(query) {
  const container = document.querySelector("#search-results");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) {
    container.replaceChildren();
    state.searchMatches = null;
    updateHighlights();
    simulate(90);
    return;
  }
  const matches = state.graph.nodes
    .map(function scoreNode(node) {
      const haystack = (node.title + " " + node.summary + " " + Object.values(node.metadata || {}).join(" ")).toLowerCase();
      const score = terms.reduce(function totalScore(total, term) {
        return total + (node.title.toLowerCase().includes(term) ? 4 : 0) + (haystack.includes(term) ? 1 : 0);
      }, 0);
      return { node: node, score: score };
    })
    .filter(function positiveScore(item) { return item.score > 0; })
    .sort(function byScore(a, b) {
      return b.score - a.score || a.node.title.localeCompare(b.node.title);
    })
    .slice(0, 7);
  state.searchMatches = new Set(matches.map(function resultId(item) { return item.node.id; }));
  container.innerHTML = matches.length
    ? matches.map(function resultButton(item) {
      return '<button class="search-result" type="button" data-node-id="' + escapeHtml(item.node.id) + '">' +
        escapeHtml(item.node.title) + "<small>" + escapeHtml(humanizeLabel(item.node.type)) + " · " +
        countLabel(typedRelationshipCount(item.node.id), "typed link") + "</small></button>";
    }).join("")
    : '<p class="status-text">No matching items.</p>';
  container.querySelectorAll("[data-node-id]").forEach(function bindResult(button) {
    button.addEventListener("click", function activateResult() {
      activateNode(button.dataset.nodeId);
    });
  });
  updateHighlights();
  simulate(90);
}

function resolveTitle(value) {
  const folded = value.trim().toLowerCase();
  return state.graph.nodes.find(function exactTitle(node) {
    return node.title.toLowerCase() === folded || node.id.toLowerCase() === folded;
  });
}

function findPath(startId, goalId) {
  const queue = [startId];
  const previous = new Map([[startId, null]]);
  while (queue.length && !previous.has(goalId)) {
    const current = queue.shift();
    relatedEdges(current, false).forEach(function visitEdge(edge) {
      const neighbor = otherEnd(edge, current);
      if (!previous.has(neighbor)) {
        previous.set(neighbor, { prior: current, edge: edge });
        queue.push(neighbor);
      }
    });
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
    status.textContent = "Choose a start and end item from the suggestions.";
    return;
  }
  const result = findPath(start.id, end.id);
  state.pathNodes.clear();
  state.pathEdges.clear();
  if (!result) {
    status.textContent = "No path was found through the accepted relationship types.";
  } else {
    result.nodes.forEach(function markPathNode(id) { state.pathNodes.add(id); });
    result.edges.forEach(function markPathEdge(edge) { state.pathEdges.add(edge.key); });
    state.focusId = start.id;
    state.selectedId = end.id;
    setViewMode("focus");
    status.textContent = "Opened this path in Explore. ";
    status.textContent += result.edges.length + " hop" + (result.edges.length === 1 ? "" : "s") + ": " +
      result.nodes.map(function pathTitle(id) { return state.nodeById.get(id).title; }).join(" → ");
    selectNode(end.id, true);
  }
  updateHighlights();
}

function applyTransform() {
  viewport.style.setProperty("--label-scale", String(1 / Math.max(state.transform.scale, 0.3)));
  viewport.setAttribute(
    "transform",
    "translate(" + state.transform.x + " " + state.transform.y + ") scale(" + state.transform.scale + ")"
  );
  document.querySelector("#zoom-reset").textContent = "Fit";
  if (state.graph) renderPositions();
}

function centerNode(node) {
  const rect = svg.getBoundingClientRect();
  state.transform.x = rect.width / 2 - node.x * state.transform.scale;
  state.transform.y = rect.height / 2 - node.y * state.transform.scale;
  applyTransform();
}

function fitVisibleNodes() {
  const nodes = visibleNodes().filter(function positioned(node) {
    return Number.isFinite(node.x) && Number.isFinite(node.y);
  });
  if (!nodes.length && !state.layoutBounds) {
    resetTransform();
    return;
  }
  const rect = svg.getBoundingClientRect();
  const horizontalLabelRoom = state.viewMode === "evidence" ? 190 : 145;
  let minX = nodes.length
    ? Math.min.apply(null, nodes.map(function x(node) { return node.x - nodeRadius(node) - horizontalLabelRoom; }))
    : state.layoutBounds.minX;
  let maxX = nodes.length
    ? Math.max.apply(null, nodes.map(function x(node) { return node.x + nodeRadius(node) + horizontalLabelRoom; }))
    : state.layoutBounds.maxX;
  let minY = nodes.length
    ? Math.min.apply(null, nodes.map(function y(node) { return node.y - nodeRadius(node) - 24; }))
    : state.layoutBounds.minY;
  let maxY = nodes.length
    ? Math.max.apply(null, nodes.map(function y(node) { return node.y + nodeRadius(node) + 24; }))
    : state.layoutBounds.maxY;
  if (state.layoutBounds) {
    minX = Math.min(minX, state.layoutBounds.minX);
    maxX = Math.max(maxX, state.layoutBounds.maxX);
    minY = Math.min(minY, state.layoutBounds.minY);
    maxY = Math.max(maxY, state.layoutBounds.maxY);
  }
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const padding = state.viewMode === "focus" ? 62 : (state.viewMode === "map" ? 8 : 42);
  const scale = Math.min(
    1.22,
    Math.max(0.38, Math.min((rect.width - padding * 2) / contentWidth, (rect.height - padding * 2) / contentHeight))
  );
  state.transform.scale = scale;
  state.transform.x = rect.width / 2 - (minX + maxX) / 2 * scale;
  state.transform.y = rect.height / 2 - (minY + maxY) / 2 * scale;
  applyTransform();
}

function renderViewExamples() {
  const group = VIEW_EXAMPLES[state.viewMode] || VIEW_EXAMPLES.map;
  const container = document.querySelector("#view-examples");
  container.innerHTML = "<p>" + escapeHtml(group.label) + "</p>" + group.items.map(function exampleButton(item) {
    return '<button type="button" data-example-action="' + escapeHtml(item.action) + '"' +
      (item.node ? ' data-example-node="' + escapeHtml(item.node) + '"' : "") +
      (item.theme ? ' data-example-theme="' + escapeHtml(item.theme) + '"' : "") +
      (item.from ? ' data-path-from="' + escapeHtml(item.from) + '"' : "") +
      (item.to ? ' data-path-to="' + escapeHtml(item.to) + '"' : "") +
      "><strong>" + escapeHtml(item.title) + '</strong><span class="example-description">' +
      escapeHtml(item.description) + "</span></button>";
  }).join("");
}

function activateViewExample(button) {
  const action = button.dataset.exampleAction;
  if (action === "path") {
    document.querySelector("#path-from").value = button.dataset.pathFrom;
    document.querySelector("#path-to").value = button.dataset.pathTo;
    tracePath();
    return;
  }
  if (action === "theme" || action === "theme-evidence") {
    state.activeThemeId = button.dataset.exampleTheme;
    setViewMode(action === "theme" ? "themes" : "evidence");
    return;
  }
  const node = resolveTitle(button.dataset.exampleNode || "");
  if (!node) return;
  if (action === "focus") {
    state.selectedId = node.id;
    state.focusId = node.id;
    setViewMode("focus");
  } else {
    selectNode(node.id, false);
  }
}

function changeZoom(factor, origin) {
  const rect = svg.getBoundingClientRect();
  const point = origin || { x: rect.width / 2, y: rect.height / 2 };
  const oldScale = state.transform.scale;
  const newScale = Math.min(2.6, Math.max(0.3, oldScale * factor));
  const worldX = (point.x - state.transform.x) / oldScale;
  const worldY = (point.y - state.transform.y) / oldScale;
  state.transform.x = point.x - worldX * newScale;
  state.transform.y = point.y - worldY * newScale;
  state.transform.scale = newScale;
  applyTransform();
}

function installPanAndZoom() {
  let pan = null;
  svg.addEventListener("pointerdown", function startPan(event) {
    if (event.target.closest?.(
      ".node, .theme-anchor, .idea-map-theme-action, .idea-map-representative"
    )) return;
    pan = { x: event.clientX, y: event.clientY, tx: state.transform.x, ty: state.transform.y };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", function movePan(event) {
    if (!pan) return;
    state.transform.x = pan.tx + event.clientX - pan.x;
    state.transform.y = pan.ty + event.clientY - pan.y;
    applyTransform();
  });
  svg.addEventListener("pointerup", function endPan() { pan = null; });
  svg.addEventListener("wheel", function wheelZoom(event) {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    changeZoom(event.deltaY < 0 ? 1.12 : 0.89, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, { passive: false });
  svg.addEventListener("click", function clearSelection(event) {
    if (state.viewMode === "focus") return;
    if (event.target === svg || event.target.closest?.("#viewport") === viewport) {
      clearCurrentSelection();
      if (state.viewMode === "evidence") {
        graphKey.textContent = "Select an item to label its relationships. Hover for full names.";
      }
    }
  });
}

function constrainedDropTarget(node) {
  const original = state.layoutTargets.get(node.id) || { x: node.x, y: node.y };
  if (state.viewMode === "evidence") {
    return {
      x: original.x,
      y: Math.min(state.height - 34, Math.max(58, node.y)),
    };
  }
  if (state.viewMode === "focus" && node.id !== state.focusId) {
    const hubTarget = state.layoutTargets.get(state.focusId);
    if (!hubTarget) return { x: node.x, y: node.y };
    const originalRadius = Math.max(64, Math.sqrt(
      Math.pow(original.x - hubTarget.x, 2) + Math.pow(original.y - hubTarget.y, 2)
    ));
    const dx = node.x - hubTarget.x;
    const dy = node.y - hubTarget.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    return {
      x: hubTarget.x + dx / distance * originalRadius,
      y: hubTarget.y + dy / distance * originalRadius,
    };
  }
  return original;
}

function constrainStructuredPosition(node, mode) {
  const target = state.layoutTargets.get(node.id);
  if (!target) return;
  if (mode === "evidence") {
    node.x = Math.min(target.x + 22, Math.max(target.x - 22, node.x));
    return;
  }
  if (mode === "focus" && node.id !== state.focusId) {
    const hubTarget = state.layoutTargets.get(state.focusId);
    if (!hubTarget) return;
    const targetRadius = Math.max(64, Math.sqrt(
      Math.pow(target.x - hubTarget.x, 2) + Math.pow(target.y - hubTarget.y, 2)
    ));
    const dx = node.x - hubTarget.x;
    const dy = node.y - hubTarget.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const clampedRadius = Math.min(targetRadius * 1.18, Math.max(targetRadius * 0.82, distance));
    if (clampedRadius !== distance) {
      node.x = hubTarget.x + dx / distance * clampedRadius;
      node.y = hubTarget.y + dy / distance * clampedRadius;
    }
  }
}

function installNodeInteractions() {
  let drag = null;
  nodeLayer.addEventListener("pointerdown", function startDrag(event) {
    const element = event.target.closest?.(".node");
    if (!element) return;
    const node = state.nodeById.get(element.dataset.id);
    if (!node || !isVisible(node)) return;
    event.stopPropagation();
    drag = {
      node: node,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      nx: node.x,
      ny: node.y,
      moved: false,
    };
    state.draggingId = node.id;
    nodeLayer.append(element);
    element.setPointerCapture(event.pointerId);
    simulate(90);
  });
  window.addEventListener("pointermove", function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = (event.clientX - drag.x) / state.transform.scale;
    const dy = (event.clientY - drag.y) / state.transform.scale;
    drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
    const node = drag.node;
    node.x = drag.nx + dx;
    node.y = drag.ny + dy;
    node.vx = 0;
    node.vy = 0;
    renderPositions();
  });
  window.addEventListener("pointerup", function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const node = drag.node;
    const moved = drag.moved;
    if (moved) {
      event.stopPropagation();
      if (state.viewMode !== "map") {
        state.layoutTargets.set(node.id, constrainedDropTarget(node));
      }
    }
    state.draggingId = null;
    drag = null;
    if (moved) {
      prepareNodeSelection(node);
      updateVisibility();
      updateHighlights();
      simulate(100);
    } else {
      activateNode(node.id);
    }
  });
  window.addEventListener("pointercancel", function cancelDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    state.draggingId = null;
    drag = null;
    simulate(70);
  });
  nodeLayer.addEventListener("lostpointercapture", function releaseLostDrag(event) {
    if (drag && event.pointerId !== drag.pointerId) return;
    if (!drag) return;
    state.draggingId = null;
    drag = null;
    simulate(70);
  });
}

function clearLayoutGuides() {
  guideLayer.replaceChildren();
  state.themePrimaryNodeIds.clear();
  state.themeSecondaryNodeIds.clear();
  state.graph.nodes.forEach(function clearViewClasses(node) {
    node.element.classList.remove("focus-hub", "focus-level-2", "theme-secondary");
  });
}

function commercialProofLabel(theme) {
  return theme?.summary?.commercialProof || "unproven";
}

function bindSvgActivation(element, action) {
  element.addEventListener("click", function activateSvgTarget(event) {
    event.stopPropagation();
    action();
  });
  element.addEventListener("keydown", function activateSvgTargetFromKeyboard(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      action();
    }
  });
}

function truncateMapLabel(value, limit) {
  return value.length > limit ? value.slice(0, Math.max(1, limit - 1)) + "…" : value;
}

function openTheme(themeId) {
  state.activeThemeId = themeId;
  setViewMode("themes");
}

function openThemeIndex() {
  state.activeThemeId = null;
  state.selectedId = null;
  state.keyboardNodeId = null;
  clearDetails();
  if (state.detailOpen) setPanelVisibility("detail", false);
  setViewMode("themes");
}

function openMapRepresentative(nodeId) {
  if (!state.nodeById.has(nodeId)) return;
  state.focusId = nodeId;
  state.selectedId = nodeId;
  setViewMode("focus");
}

function ideaMapArrowGeometry(group, centerX, centerY) {
  const dx = group.x - centerX;
  const dy = group.y - centerY;
  const distance = Math.hypot(dx, dy);
  if (!distance) return null;

  const unitX = dx / distance;
  const unitY = dy / distance;
  const hubRadius = 48;
  const cardInset = 7;
  const halfWidth = group.width / 2 + cardInset;
  const halfHeight = group.height / 2 + cardInset;
  const cardDistance = 1 / Math.max(
    Math.abs(unitX) / halfWidth,
    Math.abs(unitY) / halfHeight
  );
  const tipX = group.x - unitX * cardDistance;
  const tipY = group.y - unitY * cardDistance;
  const arrowLength = 10;
  const arrowHalfWidth = 4;
  const baseX = tipX - unitX * arrowLength;
  const baseY = tipY - unitY * arrowLength;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;

  return {
    startX: centerX + unitX * hubRadius,
    startY: centerY + unitY * hubRadius,
    lineEndX: baseX - unitX * 2,
    lineEndY: baseY - unitY * 2,
    tipX: tipX,
    tipY: tipY,
    leftX: baseX + perpendicularX * arrowHalfWidth,
    leftY: baseY + perpendicularY * arrowHalfWidth,
    rightX: baseX - perpendicularX * arrowHalfWidth,
    rightY: baseY - perpendicularY * arrowHalfWidth,
  };
}

function renderIdeaMapGuides(result) {
  if (!result.compact) {
    const centerX = result.canvasWidth / 2;
    const centerY = result.canvasHeight / 2;

    result.groups.forEach(function renderThemeDirection(group) {
      const geometry = ideaMapArrowGeometry(group, centerX, centerY);
      if (!geometry) return;

      const connector = document.createElementNS("http://www.w3.org/2000/svg", "g");
      connector.classList.add("idea-map-direction", "theme-order-" + group.theme.order);
      connector.setAttribute("aria-hidden", "true");

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("idea-map-arrow");
      line.setAttribute("x1", geometry.startX);
      line.setAttribute("y1", geometry.startY);
      line.setAttribute("x2", geometry.lineEndX);
      line.setAttribute("y2", geometry.lineEndY);
      connector.append(line);

      const arrowhead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      arrowhead.classList.add("idea-map-arrowhead");
      arrowhead.setAttribute(
        "points",
        [
          geometry.tipX + "," + geometry.tipY,
          geometry.leftX + "," + geometry.leftY,
          geometry.rightX + "," + geometry.rightY,
        ].join(" ")
      );
      connector.append(arrowhead);
      guideLayer.append(connector);
    });

    const centerHub = document.createElementNS("http://www.w3.org/2000/svg", "g");
    centerHub.classList.add("economy-hub");
    centerHub.setAttribute("aria-hidden", "true");

    const centerPlate = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    centerPlate.classList.add("economy-hub-plate");
    centerPlate.setAttribute("x", centerX - 47);
    centerPlate.setAttribute("y", centerY - 43);
    centerPlate.setAttribute("width", 94);
    centerPlate.setAttribute("height", 86);
    centerPlate.setAttribute("rx", 6);
    centerHub.append(centerPlate);

    const centerLogo = document.createElementNS("http://www.w3.org/2000/svg", "image");
    centerLogo.classList.add("economy-hub-logo");
    centerLogo.setAttribute("href", "assets/agentic-evolution-logo.png?v=20260725");
    centerLogo.setAttribute("x", centerX - 24);
    centerLogo.setAttribute("y", centerY - 34);
    centerLogo.setAttribute("width", 48);
    centerLogo.setAttribute("height", 48);
    centerLogo.setAttribute("preserveAspectRatio", "xMidYMid meet");
    centerHub.append(centerLogo);

    const centerLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    centerLabel.classList.add("economy-hub-label");
    centerLabel.setAttribute("x", centerX);
    centerLabel.setAttribute("y", centerY + 28);
    centerLabel.textContent = "Agent economy";
    centerHub.append(centerLabel);
    guideLayer.append(centerHub);
  }

  result.groups.forEach(function ideaMapCard(group) {
    const theme = group.theme;
    const left = group.x - group.width / 2;
    const top = group.y - group.height / 2;
    const guide = document.createElementNS("http://www.w3.org/2000/svg", "g");
    guide.classList.add("idea-map-card", "theme-order-" + theme.order);
    guide.dataset.themeId = theme.id;

    const boundary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    boundary.classList.add("idea-map-boundary");
    boundary.setAttribute("x", left);
    boundary.setAttribute("y", top);
    boundary.setAttribute("width", group.width);
    boundary.setAttribute("height", group.height);
    boundary.setAttribute("rx", "6");
    guide.append(boundary);

    const themeAction = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    themeAction.classList.add("idea-map-theme-action");
    themeAction.setAttribute("x", left);
    themeAction.setAttribute("y", top);
    themeAction.setAttribute("width", group.width);
    themeAction.setAttribute("height", group.height);
    themeAction.setAttribute("rx", "6");
    themeAction.setAttribute("role", "button");
    themeAction.setAttribute("tabindex", "0");
    themeAction.setAttribute("aria-label", "Open " + theme.title + " in Themes");
    bindSvgActivation(themeAction, function openMappedTheme() {
      openTheme(theme.id);
    });
    guide.append(themeAction);

    const accent = document.createElementNS("http://www.w3.org/2000/svg", "line");
    accent.classList.add("theme-accent");
    accent.setAttribute("x1", left + 1);
    accent.setAttribute("x2", left + group.width - 1);
    accent.setAttribute("y1", top + 1);
    accent.setAttribute("y2", top + 1);
    guide.append(accent);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
    title.classList.add("idea-map-title");
    title.setAttribute("x", left + 14);
    title.setAttribute("y", top + 22);
    title.textContent = theme.shortTitle || theme.title;
    guide.append(title);

    const viewTheme = document.createElementNS("http://www.w3.org/2000/svg", "text");
    viewTheme.classList.add("idea-map-view-theme");
    viewTheme.setAttribute("x", left + group.width - 14);
    viewTheme.setAttribute("y", top + 39);
    viewTheme.textContent = "Open theme →";
    guide.append(viewTheme);

    const count = document.createElementNS("http://www.w3.org/2000/svg", "text");
    count.classList.add("idea-map-meta");
    count.setAttribute("x", left + 14);
    count.setAttribute("y", top + 39);
    count.textContent = countLabel(theme.summary.memberCount, "member") + " · " +
      countLabel(theme.summary.eventCount, "event");
    guide.append(count);

    const maturity = document.createElementNS("http://www.w3.org/2000/svg", "text");
    maturity.classList.add("idea-map-maturity");
    maturity.setAttribute("x", left + 14);
    maturity.setAttribute("y", top + 53);
    maturity.textContent = "Maturity: " + theme.summary.evidenceMaturity;
    guide.append(maturity);

    const proof = document.createElementNS("http://www.w3.org/2000/svg", "text");
    proof.classList.add("idea-map-proof", "proof-" + commercialProofLabel(theme));
    proof.setAttribute("x", left + group.width - 14);
    proof.setAttribute("y", top + 53);
    proof.textContent = "Commercial proof: " + commercialProofLabel(theme);
    guide.append(proof);

    group.representativeRows.forEach(function representativeRow(row, rowIndex) {
      const rowHeight = result.compact ? 47 : 31;
      const rowStep = result.compact ? 49 : 35;
      const rowTop = top + 66 + rowIndex * rowStep;
      const rowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      rowGroup.classList.add("idea-map-representative", "representative-" + row.role);
      if (!row.interactive) rowGroup.classList.add("representative-missing");

      const rowBoundary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rowBoundary.setAttribute("x", left + 10);
      rowBoundary.setAttribute("y", rowTop);
      rowBoundary.setAttribute("width", group.width - 20);
      rowBoundary.setAttribute("height", rowHeight);
      rowBoundary.setAttribute("rx", "3");
      rowGroup.append(rowBoundary);

      const role = document.createElementNS("http://www.w3.org/2000/svg", "text");
      role.classList.add("idea-map-representative-role");
      role.setAttribute("x", left + 17);
      role.setAttribute("y", rowTop + (result.compact ? 15 : 11));
      role.textContent = row.label;
      rowGroup.append(role);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.classList.add("idea-map-representative-title");
      label.setAttribute("x", left + 17);
      label.setAttribute("y", rowTop + (result.compact ? 33 : 24));
      label.textContent = truncateMapLabel(row.title, result.compact ? 48 : 34);
      rowGroup.append(label);

      if (row.interactive) {
        rowGroup.setAttribute("role", "button");
        rowGroup.setAttribute("tabindex", "0");
        rowGroup.setAttribute("aria-label", "Explore " + row.label + ": " + row.title);
        bindSvgActivation(rowGroup, function openRepresentative() {
          openMapRepresentative(row.nodeId);
        });
      } else {
        rowGroup.setAttribute("aria-disabled", "true");
      }
      guide.append(rowGroup);
    });
    guideLayer.append(guide);
  });
}

function renderThemeGuides(result, indexMode) {
  result.groups.forEach(function themeGuide(group) {
    const theme = group.theme;
    const guide = document.createElementNS("http://www.w3.org/2000/svg", "g");
    guide.classList.add("theme-anchor", "theme-order-" + theme.order);
    if (indexMode) guide.classList.add("theme-index-anchor");
    guide.dataset.themeId = theme.id;
    guide.setAttribute("role", "button");
    guide.setAttribute("tabindex", "0");
    guide.setAttribute(
      "aria-label",
      "Open " + theme.title + ". " + countLabel(theme.summary.memberCount, "member") +
      ", maturity " + theme.summary.evidenceMaturity +
      ", commercial proof " + commercialProofLabel(theme)
    );
    const boundary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    boundary.classList.add("theme-boundary");
    boundary.setAttribute("x", group.x - group.width / 2);
    boundary.setAttribute("y", group.y - group.height / 2);
    boundary.setAttribute("width", group.width);
    boundary.setAttribute("height", group.height);
    boundary.setAttribute("rx", "6");
    guide.append(boundary);
    const accent = document.createElementNS("http://www.w3.org/2000/svg", "line");
    accent.classList.add("theme-accent");
    accent.setAttribute("x1", group.x - group.width / 2 + 1);
    accent.setAttribute("x2", group.x + group.width / 2 - 1);
    accent.setAttribute("y1", group.y - group.height / 2 + 1);
    accent.setAttribute("y2", group.y - group.height / 2 + 1);
    guide.append(accent);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("theme-label");
    label.setAttribute("x", group.x - group.width / 2 + 16);
    label.setAttribute("y", group.y - group.height / 2 + 25);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    title.textContent = theme.shortTitle || theme.title;
    title.setAttribute("x", group.x - group.width / 2 + 16);
    label.append(title);
    if (indexMode) {
      const action = document.createElementNS("http://www.w3.org/2000/svg", "text");
      action.classList.add("theme-open-action");
      action.setAttribute("x", group.x + group.width / 2 - 16);
      action.setAttribute("y", group.y - group.height / 2 + 25);
      action.textContent = "Open theme →";
      guide.append(action);
    }
    const count = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    count.classList.add("theme-label-meta");
    count.setAttribute("x", group.x - group.width / 2 + 16);
    count.setAttribute("dy", "18");
    count.textContent = countLabel(theme.summary.memberCount, "member") + " · " +
      countLabel(theme.summary.eventCount, "event");
    label.append(count);
    const maturity = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    maturity.classList.add("theme-label-maturity");
    maturity.setAttribute("x", group.x - group.width / 2 + 16);
    maturity.setAttribute("dy", "17");
    maturity.textContent = "Maturity: " + theme.summary.evidenceMaturity;
    label.append(maturity);
    const proof = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    proof.classList.add("theme-label-proof", "proof-" + commercialProofLabel(theme));
    proof.setAttribute("x", group.x - group.width / 2 + 16);
    proof.setAttribute("dy", "16");
    proof.textContent = "Commercial proof: " + commercialProofLabel(theme);
    label.append(proof);
    if (indexMode) {
      const latest = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      const stages = theme.summary.stageCounts;
      latest.classList.add("theme-label-definition");
      latest.setAttribute("x", group.x - group.width / 2 + 16);
      latest.setAttribute("dy", "16");
      latest.textContent = "Latest evidence: " +
        (theme.summary.latestEventDate ? formatDate(theme.summary.latestEventDate) : "No accepted event");
      label.append(latest);
      const stageMix = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      stageMix.classList.add("theme-label-definition");
      stageMix.setAttribute("x", group.x - group.width / 2 + 16);
      stageMix.setAttribute("dy", "14");
      stageMix.textContent = "Stages: " + stages.announcement + " announced · " + stages.pilot + " pilot · " +
        stages.production + " production · " + stages.scaled + " scaled";
      label.append(stageMix);
      const definition = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      definition.classList.add("theme-label-definition");
      definition.setAttribute("x", group.x - group.width / 2 + 16);
      definition.setAttribute("dy", "17");
      definition.textContent = theme.definition.length > 82 ? theme.definition.slice(0, 80) + "…" : theme.definition;
      label.append(definition);
    }
    guide.append(label);
    function openTheme(event) {
      event?.stopPropagation();
      state.activeThemeId = theme.id;
      setViewMode("themes");
    }
    guide.addEventListener("click", openTheme);
    guide.addEventListener("keydown", function themeKey(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTheme();
      }
    });
    guideLayer.append(guide);
  });
}

function renderLayerGuides(result) {
  result.layers.forEach(function layerGuide(layer, layerIndex) {
    const band = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    band.classList.add("layer-band");
    if (layerIndex % 2 === 1) band.classList.add("layer-band-alt");
    if (result.orientation === "vertical") {
      const nextLane = result.layers[layerIndex + 1];
      band.setAttribute("x", 42);
      band.setAttribute("y", layer.y + 8);
      band.setAttribute("width", result.canvasWidth - 84);
      band.setAttribute("height", Math.max(170, (nextLane ? nextLane.y : result.canvasHeight - 24) - layer.y - 18));
    } else {
      const bandWidth = Math.max(150, result.canvasWidth / result.layers.length - 26);
      band.setAttribute("x", layer.x - bandWidth / 2);
      band.setAttribute("y", 48);
      band.setAttribute("width", bandWidth);
      band.setAttribute("height", Math.max(200, state.height - 74));
    }
    band.setAttribute("rx", 5);
    guideLayer.append(band);
    const rule = document.createElementNS("http://www.w3.org/2000/svg", "line");
    rule.classList.add("layer-rule");
    if (result.orientation === "vertical") {
      rule.setAttribute("x1", 42);
      rule.setAttribute("x2", result.canvasWidth - 42);
      rule.setAttribute("y1", layer.y);
      rule.setAttribute("y2", layer.y);
    } else {
      rule.setAttribute("x1", layer.x);
      rule.setAttribute("x2", layer.x);
      rule.setAttribute("y1", 48);
      rule.setAttribute("y2", state.height - 20);
    }
    guideLayer.append(rule);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("layer-label");
    label.setAttribute("x", result.orientation === "vertical" ? 48 : layer.x);
    label.setAttribute("y", result.orientation === "vertical" ? layer.y - 12 : 29);
    if (result.orientation === "vertical") label.style.textAnchor = "start";
    label.textContent = layer.label + " · " + layer.nodes.length;
    guideLayer.append(label);
  });
}

function applyPositions(positions) {
  positions.forEach(function assignPosition(position, nodeId) {
    const node = state.nodeById.get(nodeId);
    if (!node) return;
    node.x = position.x;
    node.y = position.y;
    node.vx = 0;
    node.vy = 0;
  });
}

function setNodeDisplayTitleLimit(limit) {
  state.graph.nodes.forEach(function setDisplayTitle(node) {
    const title = node.title.length > limit ? node.title.slice(0, Math.max(1, limit - 1)) + "…" : node.title;
    node.displayTitle = title;
    if (!node.element.classList.contains("label-peek")) node.labelElement.textContent = title;
  });
}

function updateFocusStatus() {
  if (state.viewMode !== "focus" || !state.focusId) return;
  const node = state.nodeById.get(state.focusId);
  const total = state.graph.nodes.filter(isTypeVisible).length;
  const shown = state.viewNodeIds ? state.viewNodeIds.size : total;
  const outside = Math.max(0, total - shown);
  const message = node.title + " · " + state.focusHops + " hop" +
    (state.focusHops === 1 ? "" : "s") + " · " + shown + " of " + total +
    " items shown · " + outside + " outside this view";
  focusStatus.textContent = message;
  viewStatus.textContent = message;
  const back = document.querySelector("#focus-back");
  back.disabled = false;
  back.setAttribute(
    "aria-label",
    state.focusHistory.length
      ? "Back to " + state.nodeById.get(state.focusHistory.at(-1)).title
      : "Back to Idea Map"
  );
}

function updateViewControls() {
  document.querySelectorAll("[data-view]").forEach(function updateViewButton(button) {
    button.setAttribute("aria-pressed", button.dataset.view === state.viewMode ? "true" : "false");
  });
  document.querySelectorAll("[data-hops]").forEach(function updateHopButton(button) {
    button.setAttribute("aria-pressed", Number(button.dataset.hops) === state.focusHops ? "true" : "false");
  });
  const focusMode = state.viewMode === "focus";
  const mapMode = state.viewMode === "map";
  focusControls.hidden = !focusMode;
  const themeDetailMode = state.viewMode === "themes" && Boolean(state.activeThemeId);
  appShell.dataset.themeDetail = themeDetailMode ? "true" : "false";
  themeControls.hidden = !themeDetailMode;
  viewStatus.hidden = focusMode || themeDetailMode || mapMode ||
    (state.viewMode === "themes" && !state.activeThemeId);
  const themeIndexMode = state.viewMode === "themes" && !state.activeThemeId;
  const canvasLabel = mapMode
    ? "Agent economy idea map"
    : (themeIndexMode
      ? "Agent economy theme directory"
      : "Interactive knowledge graph of AI-agent economy events and ideas");
  canvasWrap.setAttribute("aria-label", canvasLabel);
  svg.setAttribute("aria-label", canvasLabel);
  document.querySelector("#zoom-reset").setAttribute(
    "aria-label",
    mapMode ? "Fit Idea Map" : (themeIndexMode ? "Fit theme directory" : "Fit visible graph")
  );
  renderViewExamples();
}

function applyCurrentLayout(shouldFit) {
  state.layoutRun += 1;
  updateCanvasSize();
  clearLayoutGuides();
  setNodeDisplayTitleLimit(30);
  state.layoutBounds = null;
  viewStatus.classList.toggle(
    "summary-status",
    state.viewMode === "map" || (state.viewMode === "themes" && !state.activeThemeId)
  );

  if (state.viewMode === "map") {
    const result = GraphLayouts.ideaMapLayout(
      state.graph,
      svg.getBoundingClientRect().width,
      state.height
    );
    state.viewNodeIds = result.nodeIds;
    state.labelNodeIds = new Set();
    state.layoutTargets = new Map(result.positions);
    state.focusLevels.clear();
    state.focusTreePairs.clear();
    applyPositions(result.positions);
    renderIdeaMapGuides(result);
    state.layoutBounds = {
      minX: Math.min.apply(null, result.groups.map(function left(group) { return group.x - group.width / 2 - 18; })),
      maxX: Math.max.apply(null, result.groups.map(function right(group) { return group.x + group.width / 2 + 18; })),
      minY: Math.min.apply(null, result.groups.map(function top(group) { return group.y - group.height / 2 - 18; })),
      maxY: Math.max.apply(null, result.groups.map(function bottom(group) { return group.y + group.height / 2 + 18; })),
    };
    updateVisibility();
    updateHighlights();
    renderPositions();
    viewStatus.textContent = "";
    graphKey.textContent = "Open a theme for all members, or choose a named item to explore its connections.";
    if (shouldFit !== false) fitVisibleNodes();
  } else if (state.viewMode === "focus") {
    if (!state.focusId || !isTypeVisible(state.nodeById.get(state.focusId))) {
      state.focusId = GraphLayouts.mostConnectedConcept(state.graph.nodes, state.graph.edges, state.visibleTypes);
      state.focusHistory = [];
    }
    if (!state.focusId) return;
    const result = GraphLayouts.focusLayout(
      state.graph,
      state.focusId,
      state.focusHops,
      state.width,
      state.height,
      state.visibleTypes
    );
    if (state.pathNodes.size) {
      const pathIds = Array.from(state.pathNodes);
      pathIds.forEach(function ensurePathNode(id, index) {
        result.nodeIds.add(id);
        if (!result.positions.has(id)) {
          result.positions.set(id, {
            x: 90 + index / Math.max(pathIds.length - 1, 1) * (Math.max(state.width, 800) - 180),
            y: 82 + (index % 2) * 42,
          });
          result.levels.set(id, 2);
        }
      });
      state.graph.edges.forEach(function pathTreeEdge(edge) {
        if (state.pathEdges.has(edge.key)) result.treePairs.add(edgePair(edge));
      });
    }
    state.viewNodeIds = result.nodeIds;
    state.labelNodeIds = new Set(Array.from(result.nodeIds).filter(function focusLabel(id) {
      return (result.levels.get(id) || 0) <= 1 || id === state.selectedId;
    }));
    state.layoutTargets = new Map(result.positions);
    state.focusLevels = result.levels;
    state.focusTreePairs = result.treePairs;
    applyPositions(result.positions);
    state.graph.nodes.forEach(function markFocusLevel(node) {
      node.element.classList.toggle("focus-hub", node.id === state.focusId);
      node.element.classList.toggle("focus-level-2", result.levels.get(node.id) === 2);
    });
    updateVisibility();
    updateHighlights();
    renderPositions();
    updateFocusStatus();
    graphKey.textContent = "Select a neighbour to recenter. Drag items or scroll to adjust the view.";
    if (shouldFit !== false) fitVisibleNodes();
    simulate(110, true);
  } else if (state.viewMode === "themes") {
    state.focusTreePairs.clear();
    const result = GraphLayouts.themeLayout(
      state.graph,
      state.activeThemeId,
      svg.getBoundingClientRect().width,
      state.height,
      state.visibleTypes
    );
    state.viewNodeIds = result.nodeIds;
    state.labelNodeIds = state.activeThemeId
      ? new Set(Array.from(result.primaryNodeIds).slice(0, result.compact ? 8 : 12))
      : new Set();
    state.layoutTargets = new Map(result.positions);
    applyPositions(result.positions);
    if (state.activeThemeId) {
      state.themePrimaryNodeIds = result.primaryNodeIds;
      state.themeSecondaryNodeIds = result.secondaryNodeIds;
      result.secondaryNodeIds.forEach(function markSecondary(id) {
        state.nodeById.get(id)?.element.classList.add("theme-secondary");
      });
      const theme = result.theme;
      const summary = theme.summary;
      themeStatus.textContent = theme.title + " · " + countLabel(summary.memberCount, "primary member") + " · " +
        countLabel(result.secondaryNodeIds.size, "cross-theme link") + " · maturity " +
        summary.evidenceMaturity + " · commercial proof " + summary.commercialProof;
    } else {
      renderThemeGuides(result, true);
      state.layoutBounds = {
        minX: Math.min.apply(null, result.groups.map(function left(group) { return group.x - group.width / 2 - 16; })),
        maxX: Math.max.apply(null, result.groups.map(function right(group) { return group.x + group.width / 2 + 16; })),
        minY: Math.min.apply(null, result.groups.map(function top(group) { return group.y - group.height / 2 - 16; })),
        maxY: Math.max.apply(null, result.groups.map(function bottom(group) { return group.y + group.height / 2 + 16; })),
      };
    }
    updateVisibility();
    updateHighlights();
    renderPositions();
    viewStatus.textContent = state.activeThemeId
      ? result.theme.title + " · " + countLabel(result.primaryNodeIds.size, "primary member")
      : "";
    graphKey.textContent = state.activeThemeId
      ? "Primary members are prominent; cross-theme context is subdued."
      : "Choose a theme to open its complete membership and cross-theme context.";
    if (shouldFit !== false) fitVisibleNodes();
    if (state.activeThemeId) simulate(90, true);
  } else if (state.viewMode === "evidence") {
    state.focusTreePairs.clear();
    if (!state.activeThemeId) {
      state.activeThemeId = state.selectedId && state.nodeById.get(state.selectedId)?.theme?.primary ||
        state.graph.themes?.[0]?.id || null;
    }
    const result = GraphLayouts.evidenceFlowLayout(
      state.graph,
      state.activeThemeId,
      svg.getBoundingClientRect().width,
      Math.max(state.height, 560),
      state.visibleTypes
    );
    state.viewNodeIds = result.nodeIds;
    state.evidenceOrientation = result.orientation;
    state.evidenceCanvasWidth = result.canvasWidth;
    if (result.orientation === "vertical") setNodeDisplayTitleLimit(18);
    state.graph.nodes.forEach(function updateEvidenceBadge(node) {
      if (!node.evidenceBadgeElement) return;
      node.evidenceBadgeElement.textContent = result.orientation === "vertical"
        ? (node.metadata.stage || "announcement") + " · " + (node.metadata.confidence || "low") +
          " · " + (node.metadata.commercial_proof || "unproven")
        : (node.metadata.stage || "announcement") + " · " + (node.metadata.confidence || "low") +
          " confidence · " + (node.metadata.commercial_proof || "unproven") + " commercial proof";
    });
    state.labelNodeIds = new Set();
    result.layers.forEach(function labelLayerLeaders(layer) {
      layer.nodes.slice(0, 6).forEach(function addLayerLabel(node) {
        state.labelNodeIds.add(node.id);
      });
    });
    state.layoutTargets = new Map(result.positions);
    applyPositions(result.positions);
    renderLayerGuides(result);
    updateVisibility();
    updateHighlights();
    renderPositions();
    viewStatus.textContent = result.theme.title + " · actors → events → concepts → theses";
    graphKey.textContent = state.selectedId
      ? "Selected relationships are labelled. Drag items or scroll to adjust the view."
      : "Select an item to label its relationships. Hover for full names.";
    if (shouldFit !== false) fitVisibleNodes();
    simulate(110, true);
  }
  renderTimeline();
  updateViewControls();
}

function setViewMode(mode, historyMode) {
  if (!VIEW_COPY[mode]) return;
  const previousUrl = window.location.href;
  const navigationMode = historyMode || (state.navigationReady ? "push" : "replace");
  state.viewMode = mode;
  svg.dataset.view = mode;
  appShell.dataset.currentView = mode;
  if (mode === "map") {
    state.selectedId = null;
    state.keyboardNodeId = null;
    state.focusId = null;
    state.focusHistory = [];
    state.activeThemeId = null;
    state.pathNodes.clear();
    state.pathEdges.clear();
    clearDetails();
    if (state.detailOpen) setPanelVisibility("detail", false);
  }
  if (mode === "focus") {
    const selected = state.selectedId && state.nodeById.get(state.selectedId);
    if (!state.focusId && selected && isTypeVisible(selected)) state.focusId = selected.id;
    if (!state.focusId) {
      state.focusId = GraphLayouts.mostConnectedConcept(state.graph.nodes, state.graph.edges, state.visibleTypes);
    }
    state.focusHistory = [];
    if (state.focusId) {
      prepareNodeSelection(state.nodeById.get(state.focusId), false);
    }
  }
  applyCurrentLayout(true);
  syncNavigationUrl(navigationMode, previousUrl);
  updateWorkspaceContext();
}

function handleTypeFilterChange(input) {
  if (input.checked) state.visibleTypes.add(input.value);
  else state.visibleTypes.delete(input.value);
  if (state.viewMode === "focus" && state.focusId && !isTypeVisible(state.nodeById.get(state.focusId))) {
    state.focusId = GraphLayouts.mostConnectedConcept(state.graph.nodes, state.graph.edges, state.visibleTypes);
    state.focusHistory = [];
    if (state.focusId) {
      prepareNodeSelection(state.nodeById.get(state.focusId));
    }
  }
  applyCurrentLayout(true);
}

function bindControls() {
  document.querySelector("#toggle-sidebar").addEventListener("click", function toggleSidebar() {
    setPanelVisibility("sidebar", !state.sidebarOpen);
  });
  document.querySelector("#toggle-detail").addEventListener("click", function toggleInspector() {
    setPanelVisibility("detail", !state.detailOpen);
  });
  document.querySelector("#collapse-detail").addEventListener("click", function hideInspector() {
    setPanelVisibility("detail", false);
    if (window.innerWidth <= 800) document.querySelector("#graph-panel").scrollIntoView({ block: "start" });
  });
  document.querySelector("#node-up").addEventListener("click", function previousVisibleNode() {
    navigateVisibleNodes(-1);
  });
  document.querySelector("#node-down").addEventListener("click", function nextVisibleNode() {
    navigateVisibleNodes(1);
  });
  document.querySelector("#clear-selection").addEventListener("click", function clearSelection() {
    clearCurrentSelection();
  });
  document.querySelector("#search").addEventListener("input", function searchInput(event) {
    performSearch(event.target.value);
  });
  document.querySelector("#clear-search").addEventListener("click", function clearSearch() {
    document.querySelector("#search").value = "";
    performSearch("");
  });
  document.querySelectorAll(".filter-list input").forEach(function bindFilter(input) {
    input.addEventListener("change", function filterChanged() {
      handleTypeFilterChange(input);
    });
  });
  document.querySelectorAll("[data-view]").forEach(function bindView(button) {
    button.addEventListener("click", function switchView() {
      if (button.dataset.view === "themes") {
        openThemeIndex();
      } else {
        setViewMode(button.dataset.view);
      }
    });
  });
  document.querySelectorAll("[data-hops]").forEach(function bindHopDepth(button) {
    button.addEventListener("click", function switchDepth() {
      state.focusHops = Number(button.dataset.hops);
      applyCurrentLayout(true);
      focusNodeElement(state.focusId);
    });
  });
  document.querySelector("#focus-back").addEventListener("click", function backFocus() {
    if (state.focusHistory.length) {
      navigateFocus(state.focusHistory.pop(), false);
      focusNodeElement(state.focusId);
    } else {
      setViewMode("map");
    }
  });
  document.querySelector("#theme-back").addEventListener("click", function backToThemeIndex() {
    openThemeIndex();
  });
  document.querySelector("#find-path").addEventListener("click", tracePath);
  document.querySelector("#view-examples").addEventListener("click", function chooseExample(event) {
    const button = event.target.closest("[data-example-action]");
    if (button) activateViewExample(button);
  });
  document.querySelector("#swap-path").addEventListener("click", function swapPath() {
    const from = document.querySelector("#path-from");
    const to = document.querySelector("#path-to");
    const previous = from.value;
    from.value = to.value;
    to.value = previous;
  });
  document.querySelector("#zoom-in").addEventListener("click", function zoomIn() { changeZoom(1.18); });
  document.querySelector("#zoom-out").addEventListener("click", function zoomOut() { changeZoom(0.84); });
  document.querySelector("#zoom-reset").addEventListener("click", fitVisibleNodes);
  document.querySelector("#timeline-latest").addEventListener("click", function showLatestEvidence() {
    const timeline = document.querySelector("#timeline-items");
    const latest = timeline.querySelector(".timeline-item:last-child");
    if (latest) latest.focus({ preventScroll: true });
    timeline.scrollLeft = timeline.scrollWidth - timeline.clientWidth;
  });
  document.querySelector("#reset-view").addEventListener("click", function resetView() {
    state.pathNodes.clear();
    state.pathEdges.clear();
    state.selectedId = null;
    state.focusId = null;
    state.focusHistory = [];
    state.activeThemeId = null;
    state.searchMatches = null;
    document.querySelector("#search").value = "";
    document.querySelector("#search-results").replaceChildren();
    document.querySelector("#path-from").value = "";
    document.querySelector("#path-to").value = "";
    document.querySelector("#path-status").textContent = "Uses typed links; generic references are excluded.";
    clearDetails();
    setViewMode("map");
    updateHighlights();
    updateInspectorNavigation();
  });

  window.addEventListener("keydown", function globalNavigationKeys(event) {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement || target?.isContentEditable;
    const isControl = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;
    if (event.key === "/" && !isTyping && !isControl) {
      event.preventDefault();
      if (!state.sidebarOpen && window.innerWidth > 800) setPanelVisibility("sidebar", true);
      document.querySelector("#search").focus();
      return;
    }
    if (event.key === "Escape" && !isTyping && !isControl && state.selectedId) {
      event.preventDefault();
      clearCurrentSelection();
      return;
    }
    if (!isTyping && !isControl && ["1", "2", "3", "4"].includes(event.key)) {
      const mode = ["map", "themes", "focus", "evidence"][Number(event.key) - 1];
      event.preventDefault();
      if (mode === "themes") openThemeIndex();
      else setViewMode(mode);
    }
  });
  window.addEventListener("popstate", restoreNavigationFromLocation);
}

function resetTransform() {
  state.transform = { x: 0, y: 0, scale: 1 };
  applyTransform();
}

function installResizeHandling() {
  let pending = false;
  const observer = new ResizeObserver(function graphResized() {
    if (pending || !state.graph) return;
    pending = true;
    requestAnimationFrame(function applyResize() {
      pending = false;
      applyCurrentLayout(true);
    });
  });
  observer.observe(svg);
}

function restoreNavigationFromLocation() {
  if (!state.graph) return;
  const params = new URLSearchParams(window.location.search);
  const mode = GraphLayouts.normalizeViewName(params.get("view")) || "map";
  const themeId = params.get("theme");
  const requestedNode = params.get("node");
  const linkedNode = requestedNode
    ? state.nodeById.get(requestedNode) || state.graph.nodes.find(function matchNavigationNode(node) {
      return node.title.toLowerCase() === requestedNode.toLowerCase();
    })
    : null;
  state.activeThemeId = themeId && state.themeById.has(themeId) ? themeId : null;
  state.selectedId = linkedNode ? linkedNode.id : null;
  state.keyboardNodeId = linkedNode ? linkedNode.id : null;
  state.focusId = mode === "focus" && linkedNode ? linkedNode.id : null;
  if (!linkedNode && mode !== "focus") {
    clearDetails();
    if (state.detailOpen) setPanelVisibility("detail", false);
  }
  setViewMode(mode, "none");
  if (linkedNode && !["map", "focus"].includes(mode)) {
    if (!isVisible(linkedNode)) {
      state.focusId = linkedNode.id;
      state.selectedId = linkedNode.id;
      setViewMode("focus", "none");
    } else {
      prepareNodeSelection(linkedNode, false);
      updateVisibility();
      updateHighlights();
    }
  }
}

async function loadGraphData() {
  if (window.AGENTIC_EVOLUTION_GRAPH) {
    return window.AGENTIC_EVOLUTION_GRAPH;
  }
  const response = await fetch("graph.json", { cache: "no-store" });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

async function initialize() {
  try {
    const navigationParams = new URLSearchParams(window.location.search);
    const requestedNode = navigationParams.get("node");
    const rawRequestedView = navigationParams.get("view");
    const requestedView = GraphLayouts.normalizeViewName(rawRequestedView);
    const requestedTheme = navigationParams.get("theme");
    if (window.innerWidth <= 800) {
      setPanelVisibility("sidebar", false);
      setPanelVisibility("detail", false);
    }
    state.graph = await loadGraphData();
    state.graph.nodes = state.graph.nodes.filter(function publicNode(node) {
      return !HIDDEN_PUBLIC_NODE_IDS.has(node.id);
    });
    const publicNodeIds = new Set(state.graph.nodes.map(function publicNodeId(node) { return node.id; }));
    state.graph.edges = state.graph.edges.filter(function publicEdge(edge) {
      return publicNodeIds.has(edge.source) && publicNodeIds.has(edge.target);
    });
    buildIndexes();
    initializePositions();
    createGraphElements();
    installNodeInteractions();
    renderCounts();
    installPanAndZoom();
    bindControls();
    installResizeHandling();
    setViewMode("map");
    if (requestedTheme && state.themeById.has(requestedTheme)) {
      state.activeThemeId = requestedTheme;
    }
    if (requestedView && VIEW_COPY[requestedView] && requestedView !== "map") {
      setViewMode(requestedView);
    }
    if (requestedNode) {
      const linkedNode = state.nodeById.get(requestedNode) || state.graph.nodes.find(function matchLinkedNode(node) {
        return node.title.toLowerCase() === requestedNode.toLowerCase();
      });
      if (linkedNode && isTypeVisible(linkedNode)) {
        activateNode(linkedNode.id);
      }
    }
    updateInspectorNavigation();
    syncNavigationUrl();
    state.navigationReady = true;
  } catch (error) {
    document.querySelector("#graph-stats").textContent = "Navigator unavailable";
    document.querySelector("#empty-state").hidden = false;
    document.querySelector("#empty-state").textContent = "Could not load the evidence map: " + error.message;
  }
}

initialize();
