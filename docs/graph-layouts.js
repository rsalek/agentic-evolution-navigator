(function attachGraphLayouts(root) {
  "use strict";

  function typedEdges(edges) {
    return edges.filter(function keepTyped(edge) {
      return edge.type !== "references";
    });
  }

  function eligibleNodes(nodes, visibleTypes) {
    return nodes.filter(function keepVisible(node) {
      return visibleTypes.has(node.type);
    });
  }

  function buildAdjacency(nodes, edges) {
    var adjacency = new Map(nodes.map(function seed(node) {
      return [node.id, []];
    }));
    typedEdges(edges).forEach(function addEdge(edge) {
      if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) return;
      if (!adjacency.get(edge.source).some(function sameTarget(item) { return item.id === edge.target; })) {
        adjacency.get(edge.source).push({ id: edge.target, edge: edge });
      }
      if (!adjacency.get(edge.target).some(function sameSource(item) { return item.id === edge.source; })) {
        adjacency.get(edge.target).push({ id: edge.source, edge: edge });
      }
    });
    return adjacency;
  }

  function degreeMap(nodes, edges) {
    var degrees = new Map(nodes.map(function seed(node) {
      return [node.id, 0];
    }));
    typedEdges(edges).forEach(function count(edge) {
      if (degrees.has(edge.source)) degrees.set(edge.source, degrees.get(edge.source) + 1);
      if (degrees.has(edge.target)) degrees.set(edge.target, degrees.get(edge.target) + 1);
    });
    return degrees;
  }

  function compareNodes(a, b, degrees) {
    return (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0) ||
      a.type.localeCompare(b.type) ||
      a.title.localeCompare(b.title);
  }

  function mostConnectedEntity(nodes, edges, visibleTypes) {
    var degrees = degreeMap(nodes, edges);
    var entities = eligibleNodes(nodes, visibleTypes).filter(function entityOnly(node) {
      return node.type === "entity";
    });
    var candidates = entities.length ? entities : eligibleNodes(nodes, visibleTypes);
    candidates.sort(function sortCandidates(a, b) {
      return compareNodes(a, b, degrees);
    });
    return candidates.length ? candidates[0].id : null;
  }

  function focusLayout(graph, hubId, hops, width, height, visibleTypes) {
    var visible = eligibleNodes(graph.nodes, visibleTypes);
    var visibleById = new Map(visible.map(function index(node) {
      return [node.id, node];
    }));
    var hub = graph.nodes.find(function findHub(node) {
      return node.id === hubId;
    });
    if (!hub) return { nodeIds: new Set(), positions: new Map(), levels: new Map() };
    if (!visibleById.has(hub.id)) {
      visible.push(hub);
      visibleById.set(hub.id, hub);
    }

    var adjacency = buildAdjacency(visible, graph.edges);
    var degrees = degreeMap(visible, graph.edges);
    var first = (adjacency.get(hub.id) || []).map(function neighbor(item) {
      return visibleById.get(item.id);
    }).filter(Boolean);
    first.sort(function sortFirst(a, b) {
      return compareNodes(a, b, degrees);
    });

    var levels = new Map([[hub.id, 0]]);
    var treePairs = new Set();
    first.forEach(function markFirst(node) {
      levels.set(node.id, 1);
      treePairs.add([hub.id, node.id].sort().join("|"));
    });

    var branchBySecond = new Map();
    if (hops > 1) {
      first.forEach(function collectSecond(parent) {
        (adjacency.get(parent.id) || []).forEach(function consider(item) {
          if (item.id === hub.id || levels.get(item.id) === 1) return;
          var existing = branchBySecond.get(item.id);
          if (!existing || (degrees.get(parent.id) || 0) > (degrees.get(existing) || 0)) {
            branchBySecond.set(item.id, parent.id);
          }
          levels.set(item.id, 2);
        });
      });
    }

    var cx = width / 2;
    var cy = height / 2;
    var shortest = Math.min(width, height);
    var firstRadius = Math.max(112, Math.min(175, shortest * 0.25));
    var secondRadius = Math.max(220, Math.min(330, shortest * 0.46));
    var positions = new Map([[hub.id, { x: cx, y: cy }]]);
    var branchCount = Math.max(first.length, 1);
    var branchAngles = new Map();

    first.forEach(function placeFirst(node, index) {
      var angle = -Math.PI / 2 + index / branchCount * Math.PI * 2;
      branchAngles.set(node.id, angle);
      positions.set(node.id, {
        x: cx + Math.cos(angle) * firstRadius,
        y: cy + Math.sin(angle) * firstRadius,
      });
    });

    var childrenByBranch = new Map(first.map(function seedBranch(node) {
      return [node.id, []];
    }));
    branchBySecond.forEach(function addChild(parentId, childId) {
      if (childrenByBranch.has(parentId)) {
        childrenByBranch.get(parentId).push(visibleById.get(childId));
        treePairs.add([parentId, childId].sort().join("|"));
      }
    });
    childrenByBranch.forEach(function placeChildren(children, parentId) {
      children.filter(Boolean).sort(function sortChildren(a, b) {
        return compareNodes(a, b, degrees);
      });
      var centerAngle = branchAngles.get(parentId) || 0;
      var wedge = Math.min(Math.PI * 0.72, Math.PI * 2 / branchCount * 0.82);
      children.forEach(function placeChild(node, index) {
        var offset = children.length === 1 ? 0 : (index / (children.length - 1) - 0.5) * wedge;
        var ringOffset = (index % 2) * 24;
        var angle = centerAngle + offset;
        positions.set(node.id, {
          x: cx + Math.cos(angle) * (secondRadius + ringOffset),
          y: cy + Math.sin(angle) * (secondRadius + ringOffset),
        });
      });
    });

    return {
      nodeIds: new Set(levels.keys()),
      positions: positions,
      levels: levels,
      treePairs: treePairs,
    };
  }

  function edgeWeight(type) {
    if (type === "supports" || type === "challenges" || type === "demonstrates") return 2.2;
    if (type === "involves" || type === "announced-by" || type === "updates") return 1.8;
    return 1;
  }

  function detectCommunities(graph, visibleTypes) {
    var nodes = eligibleNodes(graph.nodes, visibleTypes).filter(function omitSystem(node) {
      return node.type !== "system";
    });
    var nodeIds = new Set(nodes.map(function toId(node) {
      return node.id;
    }));
    var adjacency = new Map(nodes.map(function seed(node) {
      return [node.id, []];
    }));
    typedEdges(graph.edges).forEach(function connect(edge) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
      var weight = edgeWeight(edge.type);
      adjacency.get(edge.source).push({ id: edge.target, weight: weight });
      adjacency.get(edge.target).push({ id: edge.source, weight: weight });
    });
    var labels = new Map(nodes.map(function selfLabel(node) {
      return [node.id, node.id];
    }));
    var maxCommunitySize = Math.max(7, Math.ceil(nodes.length / 3.4));

    for (var iteration = 0; iteration < 18; iteration += 1) {
      var sizes = new Map();
      labels.forEach(function count(label) {
        sizes.set(label, (sizes.get(label) || 0) + 1);
      });
      var changed = 0;
      var order = nodes.slice().sort(function byConnectivity(a, b) {
        return adjacency.get(b.id).length - adjacency.get(a.id).length || a.id.localeCompare(b.id);
      });
      order.forEach(function relabel(node) {
        var current = labels.get(node.id);
        var scores = new Map([[current, 0.25]]);
        adjacency.get(node.id).forEach(function scoreNeighbor(neighbor) {
          var label = labels.get(neighbor.id);
          if (label !== current && (sizes.get(label) || 0) >= maxCommunitySize) return;
          scores.set(label, (scores.get(label) || 0) + neighbor.weight);
        });
        var best = current;
        var bestScore = scores.get(current) || 0;
        scores.forEach(function choose(score, label) {
          if (score > bestScore + 0.0001 || (Math.abs(score - bestScore) < 0.0001 && label < best)) {
            best = label;
            bestScore = score;
          }
        });
        if (best !== current) {
          labels.set(node.id, best);
          changed += 1;
        }
      });
      if (!changed) break;
    }

    var groups = new Map();
    nodes.forEach(function groupNode(node) {
      var label = labels.get(node.id);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(node);
    });
    var degrees = degreeMap(nodes, graph.edges);
    var typePriority = { entity: 0, concept: 1, thesis: 2, event: 3, query: 4, index: 5, system: 6 };
    return Array.from(groups.values()).filter(function nonempty(group) {
      return group.length > 0;
    }).sort(function bySize(a, b) {
      return b.length - a.length;
    }).map(function describe(group, index) {
      group.sort(function rankMembers(a, b) {
        return (typePriority[a.type] ?? 9) - (typePriority[b.type] ?? 9) ||
          (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0) ||
          a.title.localeCompare(b.title);
      });
      return {
        id: "cluster-" + (index + 1),
        label: group[0].title,
        nodes: group,
      };
    });
  }

  function clusterLayout(graph, width, height, visibleTypes) {
    var communities = detectCommunities(graph, visibleTypes);
    var count = Math.max(communities.length, 1);
    var aspect = Math.max(width / Math.max(height, 1), 0.7);
    var columns = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
    var rows = Math.ceil(count / columns);
    var cellWidth = width / columns;
    var cellHeight = height / rows;
    var positions = new Map();
    var groups = [];
    var degrees = degreeMap(graph.nodes, graph.edges);

    communities.forEach(function placeCommunity(community, index) {
      var column = index % columns;
      var row = Math.floor(index / columns);
      var cx = cellWidth * (column + 0.5);
      var cy = cellHeight * (row + 0.5);
      var maxRadius = Math.max(58, Math.min(cellWidth, cellHeight) * 0.38);
      var members = community.nodes.slice().sort(function sortMembers(a, b) {
        return compareNodes(a, b, degrees);
      });
      if (members.length) positions.set(members[0].id, { x: cx, y: cy });
      members.slice(1).forEach(function placeMember(node, memberIndex) {
        var ring = 1 + Math.floor(Math.sqrt(memberIndex + 1) / 2);
        var ringMembers = Math.max(6, ring * 7);
        var angle = -Math.PI / 2 + (memberIndex % ringMembers) / ringMembers * Math.PI * 2;
        var radius = Math.min(maxRadius, 42 + ring * 34);
        positions.set(node.id, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      });
      groups.push({
        id: community.id,
        label: community.label,
        count: members.length,
        x: cx,
        y: cy,
        radius: maxRadius + 22,
      });
    });
    return { positions: positions, communities: communities, groups: groups };
  }

  function layerLayout(graph, width, height, visibleTypes) {
    var degrees = degreeMap(graph.nodes, graph.edges);
    var definitions = [
      { id: "entity", label: "Entities", types: ["entity"] },
      { id: "event", label: "Events", types: ["event"] },
      { id: "concept", label: "Concepts", types: ["concept"] },
      { id: "thesis", label: "Theses and synthesis", types: ["thesis", "query", "index"] },
      { id: "system", label: "System", types: ["system"] },
    ];
    var visible = eligibleNodes(graph.nodes, visibleTypes);
    var layers = definitions.map(function buildLayer(definition) {
      var members = visible.filter(function inLayer(node) {
        return definition.types.indexOf(node.type) >= 0;
      }).sort(function sortLayer(a, b) {
        return compareNodes(a, b, degrees);
      });
      return { id: definition.id, label: definition.label, nodes: members };
    }).filter(function nonempty(layer) {
      return layer.nodes.length > 0;
    });
    var positions = new Map();
    var left = 90;
    var right = Math.max(left + 1, width - 120);
    var availableHeight = Math.max(320, height - 108);
    var maxRows = Math.max(8, Math.floor(availableHeight / 34));

    layers.forEach(function placeLayer(layer, layerIndex) {
      var x = layers.length === 1 ? width / 2 : left + layerIndex / (layers.length - 1) * (right - left);
      var lanes = Math.max(1, Math.ceil(layer.nodes.length / maxRows));
      var rows = Math.min(maxRows, layer.nodes.length);
      var spacing = rows <= 1 ? 0 : Math.min(42, availableHeight / (rows - 1));
      layer.nodes.forEach(function placeNode(node, index) {
        var lane = Math.floor(index / maxRows);
        var row = index % maxRows;
        var laneOffset = (lane - (lanes - 1) / 2) * 42;
        positions.set(node.id, {
          x: x + laneOffset,
          y: 72 + row * spacing,
        });
      });
      layer.x = x;
    });
    return { positions: positions, layers: layers };
  }

  var api = {
    clusterLayout: clusterLayout,
    degreeMap: degreeMap,
    detectCommunities: detectCommunities,
    focusLayout: focusLayout,
    layerLayout: layerLayout,
    mostConnectedEntity: mostConnectedEntity,
    typedEdges: typedEdges,
  };

  root.GraphLayouts = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
