const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const layouts = require("../docs/graph-layouts.js");

const graph = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "graph.json"), "utf8"));
const visibleTypes = new Set(["event", "entity", "concept", "thesis", "query", "index"]);

function assertFinitePositions(result, label) {
  result.positions.forEach((position, id) => {
    assert(Number.isFinite(position.x), label + " x position is invalid for " + id);
    assert(Number.isFinite(position.y), label + " y position is invalid for " + id);
  });
}

const serviceNow = graph.nodes.find(node => node.title === "ServiceNow");
assert(serviceNow, "ServiceNow should exist in the graph");

const oneHop = layouts.focusLayout(graph, serviceNow.id, 1, 1000, 700, visibleTypes);
const twoHop = layouts.focusLayout(graph, serviceNow.id, 2, 1000, 700, visibleTypes);
assert(oneHop.nodeIds.has(serviceNow.id), "Focus layout should retain its hub");
assert(twoHop.nodeIds.size >= oneHop.nodeIds.size, "Two-hop focus should not contain fewer nodes");
assert(twoHop.nodeIds.size > oneHop.nodeIds.size, "ServiceNow should expose a larger two-hop neighbourhood");
assertFinitePositions(oneHop, "One-hop focus");
assertFinitePositions(twoHop, "Two-hop focus");

const communities = layouts.detectCommunities(graph, visibleTypes);
assert(communities.length >= 2, "Cluster view should produce multiple connectivity groups");
assert.equal(
  communities.reduce((count, community) => count + community.nodes.length, 0),
  graph.nodes.filter(node => visibleTypes.has(node.type) && node.type !== "system").length,
  "Each visible non-system node should belong to one cluster"
);

const clusters = layouts.clusterLayout(graph, 1200, 720, visibleTypes);
assertFinitePositions(clusters, "Cluster");
assert.equal(clusters.groups.length, communities.length, "Cluster backdrops should match detected communities");

const layers = layouts.layerLayout(graph, 1200, 720, visibleTypes);
assertFinitePositions(layers, "Layer");
assert(layers.layers.some(layer => layer.id === "entity"), "Layer view should include entities");
assert(layers.layers.some(layer => layer.id === "event"), "Layer view should include events");
assert(layers.layers.some(layer => layer.id === "concept"), "Layer view should include concepts");
assert(layers.layers.some(layer => layer.id === "thesis"), "Layer view should include theses and synthesis");

const expectedHub = graph.nodes
  .filter(node => node.type === "entity" && visibleTypes.has(node.type))
  .sort((a, b) => {
    const degrees = layouts.degreeMap(graph.nodes, graph.edges);
    return degrees.get(b.id) - degrees.get(a.id) || a.title.localeCompare(b.title);
  })[0];
assert.equal(
  layouts.mostConnectedEntity(graph.nodes, graph.edges, visibleTypes),
  expectedHub.id,
  "Default focus hub should be the most connected visible entity"
);

console.log(
  "Graph layout tests passed:",
  oneHop.nodeIds.size + " one-hop nodes,",
  twoHop.nodeIds.size + " two-hop nodes,",
  communities.length + " clusters"
);
