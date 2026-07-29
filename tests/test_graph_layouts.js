const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const layouts = require("../docs/graph-layouts.js");

const graph = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "graph.json"), "utf8"));
const indexHtml = fs.readFileSync(path.join(__dirname, "..", "docs", "index.html"), "utf8");
const signalsHtml = fs.readFileSync(path.join(__dirname, "..", "docs", "signals", "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(__dirname, "..", "docs", "app.js"), "utf8");
const visibleTypes = new Set(["event", "entity", "concept", "thesis", "query", "index"]);

function assertFinitePositions(result, label) {
  result.positions.forEach((position, id) => {
    assert(Number.isFinite(position.x), label + " x position is invalid for " + id);
    assert(Number.isFinite(position.y), label + " y position is invalid for " + id);
  });
}

function assertCardsDoNotOverlap(result, label) {
  result.groups.forEach((left, leftIndex) => {
    result.groups.slice(leftIndex + 1).forEach(right => {
      const overlapX = Math.min(left.x + left.width / 2, right.x + right.width / 2) -
        Math.max(left.x - left.width / 2, right.x - right.width / 2);
      const overlapY = Math.min(left.y + left.height / 2, right.y + right.height / 2) -
        Math.max(left.y - left.height / 2, right.y - right.height / 2);
      assert(
        overlapX <= 0 || overlapY <= 0,
        label + " cards should not overlap: " + left.id + " and " + right.id
      );
    });
  });
}

function nodeByTitle(title) {
  const node = graph.nodes.find(item => item.title === title);
  assert(node, title + " should exist in the graph");
  return node;
}

const serviceNow = nodeByTitle("ServiceNow");
const oneHop = layouts.focusLayout(graph, serviceNow.id, 1, 1000, 700, visibleTypes);
const twoHop = layouts.focusLayout(graph, serviceNow.id, 2, 1000, 700, visibleTypes);
assert(oneHop.nodeIds.has(serviceNow.id), "Focus layout should retain its hub");
assert(twoHop.nodeIds.size > oneHop.nodeIds.size, "ServiceNow should expose a larger two-hop neighbourhood");
assertFinitePositions(oneHop, "One-hop focus");
assertFinitePositions(twoHop, "Two-hop focus");

const ideaMap = layouts.ideaMapLayout(graph, 1200, 720);
assertFinitePositions(ideaMap, "Idea Map");
assert.equal(ideaMap.groups.length, 7, "Idea Map should expose exactly seven theme cards");
assert.equal(ideaMap.nodeIds.size, 0, "Idea Map should expose no standalone graph nodes");
assert.equal(ideaMap.positions.size, 0, "Idea Map should not position graph nodes");
ideaMap.groups.forEach(group => {
  assert.equal(group.representativeRows.length, 3, group.id + " should expose three named roles");
  assert.deepEqual(
    group.representativeRows.map(row => row.role),
    ["concept", "evidence", "synthesis"],
    group.id + " should preserve representative role order"
  );
  assert.deepEqual(
    group.representativeRows.map(row => row.label),
    ["Core idea", "Best evidence", "Current thesis"],
    group.id + " should expose plain-language representative labels"
  );
  group.representativeRows.filter(row => row.interactive).forEach(row => {
    assert(graph.nodes.some(node => node.id === row.nodeId), row.nodeId + " should resolve to a graph node");
  });
});
const repeatIdeaMap = layouts.ideaMapLayout(graph, 1200, 720);
assert.deepEqual(
  repeatIdeaMap.groups.map(group => [group.id, group.x, group.y, group.width, group.height]),
  ideaMap.groups.map(group => [group.id, group.x, group.y, group.width, group.height]),
  "Idea Map placement should be stable"
);
assertCardsDoNotOverlap(ideaMap, "Desktop Idea Map");
assertCardsDoNotOverlap(layouts.ideaMapLayout(graph, 900, 680), "Narrow desktop Idea Map");
assertCardsDoNotOverlap(layouts.ideaMapLayout(graph, 540, 844), "Compact Idea Map");

const themeIndex = layouts.themeIndexLayout(graph, 1200, 720, visibleTypes);
assert.equal(themeIndex.groups.length, 7, "Themes directory should expose exactly seven cards");
assert.equal(themeIndex.nodeIds.size, 0, "Themes directory should not expose unexplained graph glyphs");
assert.equal(themeIndex.positions.size, 0, "Themes directory should not position representative graph nodes");
assertCardsDoNotOverlap(themeIndex, "Desktop Themes directory");
assertCardsDoNotOverlap(
  layouts.themeIndexLayout(graph, 390, 844, visibleTypes),
  "Compact Themes directory"
);
const productionTheme = ideaMap.groups.find(group => group.id === "agent-production-engineering");
assert(productionTheme, "Agent production and engineering should exist in Idea Map");
assert.equal(
  productionTheme.representativeRows.find(row => row.role === "evidence").interactive,
  false,
  "A missing accepted event should remain a noninteractive gap"
);
assert.equal(
  productionTheme.representativeRows.find(row => row.role === "synthesis").title,
  "No accepted thesis yet",
  "A missing synthesis should remain visible as a named gap"
);

for (const theme of graph.themes) {
  const detail = layouts.themeLayout(graph, theme.id, 1200, 720, visibleTypes);
  assertFinitePositions(detail, "Theme " + theme.id);
  const expectedPrimary = graph.nodes.filter(node =>
    visibleTypes.has(node.type) && node.theme.primary === theme.id
  );
  assert.equal(
    detail.primaryNodeIds.size,
    expectedPrimary.length,
    "Theme detail should include every primary member for " + theme.id
  );
}

const evidence = layouts.evidenceFlowLayout(
  graph,
  "transactions-commerce",
  1200,
  720,
  visibleTypes
);
assertFinitePositions(evidence, "Evidence Flow");
assert.deepEqual(
  evidence.layers.map(layer => layer.id),
  ["entity", "event", "concept", "thesis"],
  "Evidence Flow should preserve actor-to-synthesis lane order"
);
evidence.layers.forEach((layer, index) => {
  assert(
    layer.nodes.every(node => node.theme.primary === "transactions-commerce"),
    "Evidence Flow should remain scoped to the selected theme"
  );
  if (index > 0) assert(layer.x > evidence.layers[index - 1].x, "Evidence Flow lanes should progress left to right");
});

const expectedThemes = new Map([
  ["Visa", "transactions-commerce"],
  ["Cloudflare", "trust-identity-authorization"],
  ["ServiceNow", "platform-distribution-records"],
  ["FIS", "platform-distribution-records"],
  ["OpenAI", "cybersecurity-agent-safety"],
  ["Hugging Face", "cybersecurity-agent-safety"],
  ["Zscaler", "cybersecurity-agent-safety"],
  ["Fortinet", "cybersecurity-agent-safety"],
]);
expectedThemes.forEach((themeId, title) => {
  assert.equal(nodeByTitle(title).theme.primary, themeId, title + " should retain its agreed theme");
});

const publicNodes = graph.nodes.filter(node => node.type !== "system");
assert(
  publicNodes.every(node => typeof node.theme.primary === "string" && node.theme.primary.length > 0),
  "Every public node should have exactly one primary theme"
);

const shuffled = {
  ...graph,
  nodes: graph.nodes.slice().reverse(),
  edges: graph.edges.slice().reverse(),
};
const shuffledIdeaMap = layouts.ideaMapLayout(shuffled, 1200, 720);
assert.deepEqual(
  shuffledIdeaMap.groups.map(group => [
    group.id,
    group.x,
    group.y,
    group.representativeRows.map(row => row.nodeId),
  ]),
  ideaMap.groups.map(group => [
    group.id,
    group.x,
    group.y,
    group.representativeRows.map(row => row.nodeId),
  ]),
  "Graph input order should not change Idea Map roles or placement"
);

const defaultConcept = layouts.mostConnectedConcept(graph.nodes, graph.edges, visibleTypes);
assert.equal(graph.nodes.find(node => node.id === defaultConcept).type, "concept", "Focus should default to a concept");
assert.equal(layouts.normalizeViewName("clusters"), "themes", "Legacy cluster URLs should map to Themes");
assert.equal(layouts.normalizeViewName("layers"), "evidence", "Legacy layer URLs should map to Evidence Flow");
assert.equal(layouts.normalizeViewName("overview"), "map", "Legacy Overview URLs should map to Idea Map");
assert.equal(layouts.normalizeViewName("map"), "map", "Current Idea Map URLs should be preserved");
assert.equal(layouts.normalizeViewName("themes"), "themes", "Current theme URLs should be preserved");
assert.equal(layouts.normalizeViewName("unknown"), null, "Unknown view names should not be restored");

const viewOrder = Array.from(indexHtml.matchAll(/<button type="button" data-view="([^"]+)"/g), match => match[1]);
assert.deepEqual(
  viewOrder,
  ["map", "themes", "focus", "evidence"],
  "Toolbar order should follow Idea Map, Themes, Explore, Evidence Flow"
);
assert(indexHtml.includes(">3</span> Explore</button>"), "The user-facing Focus label should be Explore");
assert(indexHtml.includes('href="index.html?view=map"'), "The evidence-map link should work over HTTP and file URLs");
assert(indexHtml.includes('href="signals/index.html"'), "The Signals link should work over HTTP and file URLs");
assert(!indexHtml.includes("Evolution Navigator"), "Product naming should consistently use Agent Economy Navigator");
assert(
  signalsHtml.includes('href="../index.html?view=map"'),
  "Signals should link back to the canonical evidence-map route"
);
assert(
  signalsHtml.includes("../index.html?view=focus&amp;node=entity-cloudflare"),
  "Signals research links should enter Explore on the intended item"
);
assert(!signalsHtml.includes("Evolution Navigator"), "Signals should use the same product name");
assert(
  appSource.includes('const mode = ["map", "themes", "focus", "evidence"][Number(event.key) - 1];'),
  "Keyboard shortcuts should follow the toolbar order"
);
assert(
  appSource.includes('"economy-hub-logo"') &&
    appSource.includes('"idea-map-arrow"') &&
    appSource.includes("agentic-evolution-logo.png"),
  "Idea Map should render the existing logo as a directional hub"
);

console.log(
  "Idea-first graph layout tests passed:",
  ideaMap.groups.length + " map themes,",
  ideaMap.nodeIds.size + " map graph nodes,",
  twoHop.nodeIds.size + " two-hop Focus nodes"
);
