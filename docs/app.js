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
  overview: "All visible nodes in one network.",
  focus: "Explore one node and its nearest connections.",
  clusters: "Group nodes by the connections they share.",
  layers: "Read the evidence flow from entities to events, concepts, and theses.",
};

const HIDDEN_PUBLIC_NODE_IDS = new Set(["index-home"]);

const VIEW_EXAMPLES = {
  overview: {
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
      { title: "Trust and governance", description: "Open the graph's broadest control mechanism", action: "focus", node: "Agent Trust and Governance" },
      { title: "Mastercard network", description: "Follow the payment network and its production events", action: "focus", node: "Mastercard" },
    ],
  },
  clusters: {
    label: "Community anchors",
    items: [
      { title: "ServiceNow", description: "Highlight its enterprise-workflow community", action: "select", node: "ServiceNow" },
      { title: "Agent trust", description: "Highlight the security and governance community", action: "select", node: "Agent Trust and Governance" },
      { title: "Agent payments", description: "Highlight the payments and protocol community", action: "select", node: "Agentic Payments" },
    ],
  },
  layers: {
    label: "Evidence chains",
    items: [
      { title: "Platform distribution", description: "Read ServiceNow across entity, event, concept, and thesis", action: "path", from: "ServiceNow", to: "Incumbent platforms are the distribution channel" },
      { title: "Payments production", description: "Read Mastercard across the payment evidence chain", action: "path", from: "Mastercard", to: "Agent payments are moving from protocol to production" },
      { title: "Traffic economics", description: "Read DataDome across measurement and monetization", action: "path", from: "DataDome", to: "Agent-originated traffic is becoming an addressable market" },
    ],
  },
};

const state = {
  graph: null,
  nodeById: new Map(),
  adjacency: new Map(),
  visibleTypes: new Set(["event", "entity", "concept", "thesis", "query", "index"]),
  selectedId: null,
  keyboardNodeId: null,
  pathNodes: new Set(),
  pathEdges: new Set(),
  searchMatches: null,
  transform: { x: 0, y: 0, scale: 1 },
  width: 0,
  height: 0,
  viewMode: "overview",
  viewNodeIds: null,
  focusId: null,
  focusHops: 2,
  focusHistory: [],
  focusLevels: new Map(),
  focusTreePairs: new Set(),
  communityByNode: new Map(),
  communityCenters: new Map(),
  labelNodeIds: null,
  layoutTargets: new Map(),
  draggingId: null,
  layoutRun: 0,
};

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
const viewStatus = document.querySelector("#view-status");
const graphKey = document.querySelector("#graph-key");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
  const edges = state.adjacency.get(nodeId) || [];
  return includeReferences === false ? edges.filter(function typedOnly(edge) {
    return edge.type !== "references";
  }) : edges;
}

function typedRelationshipCount(nodeId) {
  return relatedEdges(nodeId, false).length;
}

function uniqueTypedNeighborCount(nodeId) {
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
  const parallelGroups = new Map();
  state.graph.edges.forEach(function indexEdge(edge) {
    state.adjacency.get(edge.source)?.push(edge);
    state.adjacency.get(edge.target)?.push(edge);
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
}

function nodeRadius(node) {
  const degree = uniqueTypedNeighborCount(node.id);
  return 6 + Math.min(12, Math.sqrt(Math.max(degree, 1)) * 2.35);
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
    path.dataset.key = edgeKey(edge);
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
    group.classList.add("node");
    group.dataset.id = node.id;
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "-1");
    group.setAttribute(
      "aria-label",
      node.title + ", " + node.type + ", " + uniqueNeighbors + " connected nodes, " + degree + " typed relationships"
    );

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = node.title + " · " + degree + " typed relationships";
    group.append(title);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", nodeRadius(node));
    circle.setAttribute("fill", TYPE_COLORS[node.type] || TYPE_COLORS.system);
    group.append(circle);

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
    installNodeDrag(group, node);
    node.element = group;
    node.circle = circle;
    node.labelElement = label;
    node.displayTitle = shortTitle;
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
        const minimumDistance = nodeRadius(a) + nodeRadius(b) + (mode === "overview" ? 10 : 24);
        const repulsion = (mode === "overview" ? 390 : 260) / distance2 * alpha;
        const collision = distance < minimumDistance ? (minimumDistance - distance) * 0.026 * alpha : 0;
        const force = repulsion + collision;
        const unitX = dx / distance;
        const unitY = dy / distance;
        a.vx -= unitX * force;
        a.vy -= unitY * force;
        b.vx += unitX * force;
        b.vy += unitY * force;

        if (mode !== "overview" && nodeHasPersistentLabel(a) && nodeHasPersistentLabel(b) &&
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
      } else if (mode === "clusters") {
        const sameCommunity = state.communityByNode.get(a.id) === state.communityByNode.get(b.id);
        desired = sameCommunity ? 78 : 190;
        strength = sameCommunity ? 0.003 : 0.00025;
      } else if (mode === "layers") {
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
      if (target && mode !== "overview" && node.id !== state.draggingId) {
        const xStrength = mode === "layers" ? 0.045 : (mode === "focus" ? 0.0075 : 0.009);
        const yStrength = mode === "layers" ? 0.012 : (mode === "focus" ? 0.0075 : 0.009);
        node.vx += (target.x - node.x) * xStrength * alpha;
        node.vy += (target.y - node.y) * yStrength * alpha;
      } else if (mode === "overview") {
        node.vx += (cx - node.x) * 0.00055 * alpha;
        node.vy += (cy - node.y) * 0.00055 * alpha;
      }
      if (node.id === state.draggingId) {
        node.vx = 0;
        node.vy = 0;
        return;
      }
      node.vx *= mode === "overview" ? 0.88 : 0.84;
      node.vy *= mode === "overview" ? 0.88 : 0.84;
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

  if (state.viewMode === "layers") {
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
      if (state.viewMode === "layers" && state.selectedId &&
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
    } else if (state.viewMode === "layers") {
      labelOnLeft = false;
    } else {
      labelOnLeft = node.x > state.width * 0.68;
    }
    node.labelOnLeft = labelOnLeft;
    node.labelElement.setAttribute("x", (labelOnLeft ? -1 : 1) * (nodeRadius(node) + 5 / scale));
    node.labelElement.setAttribute("text-anchor", labelOnLeft ? "end" : "start");
    node.element.setAttribute("transform", "translate(" + node.x + " " + node.y + ")");
  });
}

function edgeIsVisible(edge) {
  const source = state.nodeById.get(edge.source);
  const target = state.nodeById.get(edge.target);
  if (!source || !target || !isVisible(source) || !isVisible(target)) return false;
  if ((state.viewMode === "focus" || state.viewMode === "layers") && edge.type === "references") return false;
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
    edge.element.classList.toggle("layer-edge", visible && state.viewMode === "layers");
    const selectedLayerEdge = state.viewMode === "layers" && state.selectedId &&
      (edge.source === state.selectedId || edge.target === state.selectedId);
    const contextLabelCandidate = selectedLayerEdge || labelledFocusEdge;
    const showContextLabel = contextLabelCandidate && !labelledRelationTypes.has(edge.type);
    if (showContextLabel) labelledRelationTypes.add(edge.type);
    edge.element.classList.toggle("layer-selected-edge", Boolean(visible && selectedLayerEdge));
    edge.element.classList.toggle(
      "layer-context-edge",
      Boolean(visible && state.viewMode === "layers" && state.selectedId && !selectedLayerEdge)
    );
    if (edge.labelElement) {
      edge.labelElement.classList.toggle(
        "visible",
        visible && showContextLabel
      );
    }
    if (state.viewMode === "clusters" && visible) {
      const sourceCommunity = state.communityByNode.get(edge.source);
      const targetCommunity = state.communityByNode.get(edge.target);
      edge.element.style.opacity = sourceCommunity && targetCommunity && sourceCommunity !== targetCommunity ? "0.13" : "";
    } else {
      edge.element.style.opacity = "";
    }
  });
  const empty = document.querySelector("#empty-state");
  empty.hidden = visibleCount !== 0;
  if (!visibleCount) {
    empty.textContent = state.viewMode === "focus"
      ? "No nodes remain in this focus after filtering."
      : "No nodes match the current filters.";
  }
  updateRovingTabIndex();
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
    const onPath = state.pathEdges.has(edgeKey(edge));
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
  if (state.viewMode === "focus" && nodeId !== state.focusId) {
    navigateFocus(nodeId, true);
  } else {
    selectNode(nodeId, true);
  }
}

function selectNode(nodeId, center) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  state.selectedId = nodeId;
  state.keyboardNodeId = nodeId;
  state.visibleTypes.add(node.type);
  const checkbox = document.querySelector('.filter-list input[value="' + node.type + '"]');
  if (checkbox) checkbox.checked = true;
  updateVisibility();
  updateHighlights();
  renderDetails(node);
  if (state.viewMode === "layers") {
    graphKey.textContent = "Drag to rearrange · hover nodes for names · edge labels show each relation type once";
  }
  if (center !== false) centerNode(node);
  simulate(110);
}

function navigateFocus(nodeId, pushHistory) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  if (pushHistory && state.focusId && state.focusId !== nodeId) state.focusHistory.push(state.focusId);
  state.focusId = nodeId;
  state.selectedId = nodeId;
  state.keyboardNodeId = nodeId;
  state.visibleTypes.add(node.type);
  const checkbox = document.querySelector('.filter-list input[value="' + node.type + '"]');
  if (checkbox) checkbox.checked = true;
  renderDetails(node);
  applyCurrentLayout(true);
}

function renderDetails(node) {
  detailEmpty.hidden = true;
  detailContent.hidden = false;
  const metadata = Object.entries(node.metadata || {}).filter(function filterMetadata(entry) {
    return !["updated", "status"].includes(entry[0]);
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

  let html = '<div class="type-badge"><span class="dot ' + escapeHtml(node.type) + '"></span>' + escapeHtml(node.type) + "</div>";
  html += '<h2 class="detail-title">' + escapeHtml(node.title) + "</h2>";
  html += '<p class="connection-summary">' + uniqueNeighbors + " connected nodes · " + relations.length + " typed relationships</p>";
  html += '<p class="detail-summary">' + escapeHtml(node.summary || "No summary has been written yet.") + "</p>";
  if (metadata.length) {
    html += '<dl class="meta-grid">' + metadata.map(function metadataItem(entry) {
      return '<div class="meta-item"><dt>' + escapeHtml(entry[0]) + "</dt><dd>" + escapeHtml(entry[1]) + "</dd></div>";
    }).join("") + "</dl>";
  }
  html += '<section class="detail-section"><h3>Typed relationships · ' + relations.length + "</h3>";
  html += '<ul class="relation-list">' + (relations.length ? relations.map(function relationButton(item) {
    const direction = item.edge.source === node.id ? "→" : "←";
    return '<li><button class="relation-button" data-node-id="' + escapeHtml(item.node.id) + '"><small>' +
      direction + " " + escapeHtml(item.edge.type) + "</small><br>" + escapeHtml(item.node.title) + "</button></li>";
  }).join("") : "<li>No typed relationships.</li>") + "</ul></section>";
  if (evidence.length) {
    html += '<section class="detail-section"><h3>Evidence · ' + evidence.length + '</h3><ul class="evidence-list">' +
      evidence.map(function evidenceLink(item) {
        return '<li><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(item.label) + "</a></li>";
      }).join("") + "</ul></section>";
  }
  html += '<div class="note-path">Obsidian note: ' + escapeHtml(node.path) + "</div>";
  detailContent.innerHTML = html;
  detailContent.querySelectorAll("[data-node-id]").forEach(function bindRelation(button) {
    button.addEventListener("click", function activateRelation() {
      activateNode(button.dataset.nodeId);
    });
  });
}

function clearDetails() {
  detailContent.hidden = true;
  detailContent.replaceChildren();
  detailEmpty.hidden = false;
}

function renderTimeline() {
  const events = state.graph.nodes
    .filter(function eventOnly(node) { return node.type === "event"; })
    .sort(function byDate(a, b) {
      return (a.metadata.date || "").localeCompare(b.metadata.date || "");
    });
  const container = document.querySelector("#timeline-items");
  container.innerHTML = events.map(function timelineItem(node) {
    return '<button class="timeline-item" type="button" data-id="' + escapeHtml(node.id) + '">' +
      '<time datetime="' + escapeHtml(node.metadata.date) + '">' + escapeHtml(formatDate(node.metadata.date)) + "</time>" +
      "<strong>" + escapeHtml(node.title) + "</strong>" +
      "<span>" + escapeHtml(node.metadata.stage || "unknown") + " · " + escapeHtml(node.metadata.industry || "general") + "</span>" +
      "</button>";
  }).join("");
  container.querySelectorAll(".timeline-item").forEach(function bindTimeline(item) {
    item.addEventListener("click", function selectTimelineNode() {
      activateNode(item.dataset.id);
    });
  });
  if (events.length) {
    document.querySelector("#timeline-range").textContent =
      formatDate(events[0].metadata.date) + " — " + formatDate(events.at(-1).metadata.date);
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
    state.graph.nodes.length + " nodes · " + state.graph.edges.length + " links";
  document.querySelector("#node-titles").innerHTML = state.graph.nodes
    .filter(function selectableTitle(node) {
      return !["system"].includes(node.type);
    })
    .map(function titleOption(node) {
      return '<option value="' + escapeHtml(node.title) + '"></option>';
    }).join("");
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
        escapeHtml(item.node.title) + "<small>" + escapeHtml(item.node.type) + " · " +
        typedRelationshipCount(item.node.id) + " relationships</small></button>";
    }).join("")
    : '<p class="status-text">No matching nodes.</p>';
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
    status.textContent = "Choose two exact node titles from the suggestions.";
    return;
  }
  const result = findPath(start.id, end.id);
  state.pathNodes.clear();
  state.pathEdges.clear();
  if (!result) {
    status.textContent = "No typed-relation path was found.";
  } else {
    if (state.viewMode === "focus" && result.nodes.some(function outsideFocus(id) {
      return !state.viewNodeIds.has(id);
    })) {
      setViewMode("overview");
      status.textContent = "Switched to Overview to show the complete path. ";
    } else {
      status.textContent = "";
    }
    result.nodes.forEach(function markPathNode(id) { state.pathNodes.add(id); });
    result.edges.forEach(function markPathEdge(edge) { state.pathEdges.add(edgeKey(edge)); });
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
  if (!nodes.length) {
    resetTransform();
    return;
  }
  const rect = svg.getBoundingClientRect();
  const horizontalLabelRoom = state.viewMode === "layers" ? 190 : 145;
  const minX = Math.min.apply(null, nodes.map(function x(node) { return node.x - nodeRadius(node) - horizontalLabelRoom; }));
  const maxX = Math.max.apply(null, nodes.map(function x(node) { return node.x + nodeRadius(node) + horizontalLabelRoom; }));
  const minY = Math.min.apply(null, nodes.map(function y(node) { return node.y - nodeRadius(node) - 24; }));
  const maxY = Math.max.apply(null, nodes.map(function y(node) { return node.y + nodeRadius(node) + 24; }));
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const padding = state.viewMode === "focus" ? 62 : 42;
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
  const group = VIEW_EXAMPLES[state.viewMode] || VIEW_EXAMPLES.overview;
  const container = document.querySelector("#view-examples");
  container.innerHTML = "<p>Examples to try · " + escapeHtml(group.label) + "</p>" + group.items.map(function exampleButton(item) {
    return '<button type="button" data-example-action="' + escapeHtml(item.action) + '"' +
      (item.node ? ' data-example-node="' + escapeHtml(item.node) + '"' : "") +
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
    if (event.target.closest?.(".node")) return;
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
      state.selectedId = null;
      updateVisibility();
      updateHighlights();
      clearDetails();
      if (state.viewMode === "layers") {
        graphKey.textContent = "Drag to rearrange · hover nodes for names · select a node to label its relations";
      }
      simulate(90);
    }
  });
}

function constrainedDropTarget(node) {
  const original = state.layoutTargets.get(node.id) || { x: node.x, y: node.y };
  if (state.viewMode === "layers") {
    return {
      x: original.x,
      y: Math.min(state.height - 34, Math.max(58, node.y)),
    };
  }
  if (state.viewMode === "clusters") {
    const community = state.communityByNode.get(node.id);
    const center = state.communityCenters.get(community);
    if (!center) return { x: node.x, y: node.y };
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const radius = Math.max(34, center.radius - nodeRadius(node) - 12);
    const scale = Math.min(1, radius / distance);
    return { x: center.x + dx * scale, y: center.y + dy * scale };
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
  if (mode === "layers") {
    node.x = Math.min(target.x + 22, Math.max(target.x - 22, node.x));
    return;
  }
  if (mode === "clusters") {
    const community = state.communityByNode.get(node.id);
    const center = state.communityCenters.get(community);
    if (!center) return;
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const radius = Math.max(30, center.radius - nodeRadius(node) - 4);
    if (distance > radius) {
      node.x = center.x + dx / distance * radius;
      node.y = center.y + dy / distance * radius;
      node.vx *= 0.35;
      node.vy *= 0.35;
    }
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

function installNodeDrag(element, node) {
  let drag = null;
  element.addEventListener("pointerdown", function startDrag(event) {
    event.stopPropagation();
    state.selectedId = node.id;
    state.keyboardNodeId = node.id;
    updateVisibility();
    updateHighlights();
    renderDetails(node);
    drag = { x: event.clientX, y: event.clientY, nx: node.x, ny: node.y, moved: false };
    state.draggingId = node.id;
    nodeLayer.append(element);
    element.setPointerCapture(event.pointerId);
    simulate(90);
  });
  window.addEventListener("pointermove", function moveDrag(event) {
    if (!drag) return;
    const dx = (event.clientX - drag.x) / state.transform.scale;
    const dy = (event.clientY - drag.y) / state.transform.scale;
    drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
    node.x = drag.nx + dx;
    node.y = drag.ny + dy;
    node.vx = 0;
    node.vy = 0;
    renderPositions();
  });
  window.addEventListener("pointerup", function endDrag(event) {
    if (!drag) return;
    const moved = drag.moved;
    if (moved) {
      event.stopPropagation();
      if (state.viewMode !== "overview") {
        state.layoutTargets.set(node.id, constrainedDropTarget(node));
      }
    }
    state.draggingId = null;
    drag = null;
    if (moved) simulate(100);
    else activateNode(node.id);
  });
  window.addEventListener("pointercancel", function cancelDrag() {
    if (!drag) return;
    state.draggingId = null;
    drag = null;
    simulate(70);
  });
  element.addEventListener("lostpointercapture", function releaseLostDrag() {
    if (!drag) return;
    state.draggingId = null;
    drag = null;
    simulate(70);
  });
}

function clearLayoutGuides() {
  guideLayer.replaceChildren();
  state.communityByNode.clear();
  state.communityCenters.clear();
  state.graph.nodes.forEach(function clearViewClasses(node) {
    node.element.classList.remove("focus-hub", "focus-level-2");
  });
}

function renderClusterGuides(result) {
  result.communities.forEach(function mapCommunity(community) {
    community.nodes.forEach(function mapMember(node) {
      state.communityByNode.set(node.id, community.id);
    });
  });
  result.groups.forEach(function clusterGuide(group) {
    state.communityCenters.set(group.id, { x: group.x, y: group.y, radius: group.radius });
    const guide = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const boundary = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    boundary.classList.add("cluster-boundary");
    boundary.setAttribute("cx", group.x);
    boundary.setAttribute("cy", group.y);
    boundary.setAttribute("r", group.radius);
    guide.append(boundary);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("cluster-label");
    label.setAttribute("x", group.x);
    const labelAbove = group.y <= state.height / 2;
    label.setAttribute("y", labelAbove ? group.y - group.radius - 18 : group.y + group.radius + 18);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    const clusterLead = group.label.length > 30 ? group.label.slice(0, 28) + "…" : group.label;
    title.textContent = clusterLead;
    title.setAttribute("x", group.x);
    label.append(title);
    const count = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    count.classList.add("cluster-label-count");
    count.setAttribute("x", group.x);
    count.setAttribute("dy", "12");
    count.textContent = group.count + " connected nodes";
    label.append(count);
    guide.append(label);
    guideLayer.append(guide);
  });
}

function renderLayerGuides(result) {
  result.layers.forEach(function layerGuide(layer) {
    const rule = document.createElementNS("http://www.w3.org/2000/svg", "line");
    rule.classList.add("layer-rule");
    rule.setAttribute("x1", layer.x);
    rule.setAttribute("x2", layer.x);
    rule.setAttribute("y1", 48);
    rule.setAttribute("y2", state.height - 20);
    guideLayer.append(rule);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("layer-label");
    label.setAttribute("x", layer.x);
    label.setAttribute("y", 29);
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

function updateFocusStatus() {
  if (state.viewMode !== "focus" || !state.focusId) return;
  const node = state.nodeById.get(state.focusId);
  const total = state.graph.nodes.filter(isTypeVisible).length;
  const shown = state.viewNodeIds ? state.viewNodeIds.size : total;
  const outside = Math.max(0, total - shown);
  const message = "Focus: " + node.title + " · " + state.focusHops + " hop" +
    (state.focusHops === 1 ? "" : "s") + " · " + shown + " of " + total +
    " nodes shown · " + outside + " outside this view";
  focusStatus.textContent = message;
  viewStatus.textContent = message;
  const back = document.querySelector("#focus-back");
  back.disabled = false;
  back.setAttribute(
    "aria-label",
    state.focusHistory.length
      ? "Back to " + state.nodeById.get(state.focusHistory.at(-1)).title
      : "Back to Overview"
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
  focusControls.hidden = !focusMode;
  viewStatus.hidden = focusMode;
  renderViewExamples();
}

function applyCurrentLayout(shouldFit) {
  state.layoutRun += 1;
  updateCanvasSize();
  clearLayoutGuides();

  if (state.viewMode === "overview") {
    state.viewNodeIds = null;
    state.labelNodeIds = null;
    state.layoutTargets.clear();
    state.focusLevels.clear();
    state.focusTreePairs.clear();
    initializePositions();
    updateVisibility();
    renderPositions();
    resetTransform();
    viewStatus.textContent = "Overview · " + state.graph.nodes.filter(isTypeVisible).length + " visible nodes";
    graphKey.textContent = "Drag nodes · scroll to zoom · select for evidence";
    simulate();
  } else if (state.viewMode === "focus") {
    if (!state.focusId || !isTypeVisible(state.nodeById.get(state.focusId))) {
      state.focusId = GraphLayouts.mostConnectedEntity(state.graph.nodes, state.graph.edges, state.visibleTypes);
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
    graphKey.textContent = "Drag to rearrange · select a neighbour to recenter · edge labels show each relation type once";
    if (shouldFit !== false) fitVisibleNodes();
    simulate(110, true);
  } else if (state.viewMode === "clusters") {
    state.focusTreePairs.clear();
    const result = GraphLayouts.clusterLayout(
      state.graph,
      Math.max(state.width, 900),
      Math.max(state.height, 560),
      state.visibleTypes
    );
    state.viewNodeIds = new Set(result.positions.keys());
    state.labelNodeIds = new Set();
    result.communities.forEach(function labelCommunityLeaders(community) {
      const labelCount = community.nodes.length <= 4 ? community.nodes.length : (community.nodes.length >= 12 ? 4 : 3);
      community.nodes.slice(1, labelCount + 1).forEach(function addLabel(node) {
        state.labelNodeIds.add(node.id);
      });
    });
    state.layoutTargets = new Map(result.positions);
    applyPositions(result.positions);
    renderClusterGuides(result);
    updateVisibility();
    updateHighlights();
    renderPositions();
    viewStatus.textContent = "Clusters · " + result.groups.length + " connectivity groups · " +
      state.viewNodeIds.size + " nodes";
    graphKey.textContent = "Drag to rearrange · hover any node for its label · groups reflect connectivity";
    if (shouldFit !== false) fitVisibleNodes();
    simulate(120, true);
  } else if (state.viewMode === "layers") {
    state.focusTreePairs.clear();
    const result = GraphLayouts.layerLayout(
      state.graph,
      Math.max(state.width, 1100),
      Math.max(state.height, 560),
      state.visibleTypes
    );
    state.viewNodeIds = new Set(result.positions.keys());
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
    viewStatus.textContent = "Layers · entities → events → concepts → theses and synthesis";
    graphKey.textContent = state.selectedId
      ? "Drag to rearrange · hover nodes for names · edge labels show each relation type once"
      : "Drag to rearrange · hover nodes for names · select a node to label its relations";
    if (shouldFit !== false) fitVisibleNodes();
    simulate(110, true);
  }
  updateViewControls();
}

function setViewMode(mode) {
  if (!VIEW_COPY[mode]) return;
  state.viewMode = mode;
  if (mode === "focus") {
    const selected = state.selectedId && state.nodeById.get(state.selectedId);
    if (selected && isTypeVisible(selected)) state.focusId = selected.id;
    if (!state.focusId) {
      state.focusId = GraphLayouts.mostConnectedEntity(state.graph.nodes, state.graph.edges, state.visibleTypes);
    }
    state.focusHistory = [];
    if (state.focusId) {
      state.selectedId = state.focusId;
      state.keyboardNodeId = state.focusId;
      renderDetails(state.nodeById.get(state.focusId));
    }
  }
  applyCurrentLayout(true);
}

function handleTypeFilterChange(input) {
  if (input.checked) state.visibleTypes.add(input.value);
  else state.visibleTypes.delete(input.value);
  if (state.viewMode === "focus" && state.focusId && !isTypeVisible(state.nodeById.get(state.focusId))) {
    state.focusId = GraphLayouts.mostConnectedEntity(state.graph.nodes, state.graph.edges, state.visibleTypes);
    state.focusHistory = [];
    if (state.focusId) {
      state.selectedId = state.focusId;
      renderDetails(state.nodeById.get(state.focusId));
    }
  }
  applyCurrentLayout(true);
}

function bindControls() {
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
      setViewMode(button.dataset.view);
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
      setViewMode("overview");
    }
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
  document.querySelector("#reset-view").addEventListener("click", function resetView() {
    state.pathNodes.clear();
    state.pathEdges.clear();
    state.selectedId = null;
    state.focusId = null;
    state.focusHistory = [];
    state.searchMatches = null;
    document.querySelector("#search").value = "";
    document.querySelector("#search-results").replaceChildren();
    document.querySelector("#path-from").value = "";
    document.querySelector("#path-to").value = "";
    document.querySelector("#path-status").textContent = "Uses typed relations, excluding generic references.";
    clearDetails();
    setViewMode("overview");
    updateHighlights();
  });
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

async function initialize() {
  try {
    const response = await fetch("graph.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    state.graph = await response.json();
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
    renderCounts();
    renderTimeline();
    installPanAndZoom();
    bindControls();
    installResizeHandling();
    setViewMode("overview");
  } catch (error) {
    document.querySelector("#graph-stats").textContent = "Graph unavailable";
    document.querySelector("#empty-state").hidden = false;
    document.querySelector("#empty-state").textContent = "Could not load graph.json: " + error.message;
  }
}

initialize();
