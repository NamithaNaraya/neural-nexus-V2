/**
 * Path Traversal Mode Utilities
 * 
 * Implements layer-by-layer node expansion:
 * - Click a node → start path
 * - Click neighbor of tip → extend path
 * - Click node on path → truncate back to that point
 * - Only show: path nodes + immediate neighbors of the current tip
 * - No duplicates, fully dynamic, no hardcoding
 */

/**
 * Build next traversal state after clicking a node
 * @param {Object} state - Current state { path, graph }
 * @param {string} nodeId - Clicked node ID
 * @returns {Object} New state { path, visibleNodeIds, visibleLinkIds }
 */
export function traverseToNode(currentPath, nodeId, fullGraph) {
  let newPath = [...currentPath];
  const pathIndex = newPath.indexOf(nodeId);

  if (pathIndex !== -1) {
    // REVERSE: clicked a node already in path → truncate back to it
    newPath = newPath.slice(0, pathIndex + 1);
  } else {
    // FORWARD: add node as a new layer connection
    newPath.push(nodeId);
  }

  // Build visible nodes: all path nodes + all their immediate neighbors
  const visibleNodeIds = buildVisibleNodes(newPath, fullGraph);
  const visibleLinkIds = buildVisibleLinks(visibleNodeIds, fullGraph, newPath);

  return {
    path: newPath,
    visibleNodeIds,
    visibleLinkIds,
  };
}

/**
 * Check if two nodes are directly connected
 */
function isDirectNeighbor(nodeId1, nodeId2, links) {
  return links.some((link) => {
    const s = typeof link.source === 'object' ? link.source.id : link.source;
    const t = typeof link.target === 'object' ? link.target.id : link.target;
    return (s === nodeId1 && t === nodeId2) || (t === nodeId1 && s === nodeId2);
  });
}

/**
 * Build set of visible node IDs for display
 * Rule: path nodes + immediate neighbors of the current tip
 */
function buildVisibleNodes(path, fullGraph) {
  const visible = new Set();
  
  if (path.length === 0) {
    return new Set(fullGraph.nodes.map(n => String(n.id)));
  }

  path.forEach(id => visible.add(String(id)));
  
  // Add all neighbors of ALL nodes in the path (Layer Dive)
  fullGraph.links.forEach((link) => {
    const s = String(typeof link.source === 'object' ? link.source.id : link.source);
    const t = String(typeof link.target === 'object' ? link.target.id : link.target);
    
    if (path.includes(s) || path.includes(t)) {
      visible.add(s);
      visible.add(t);
    }
  });

  return visible;
}

/**
 * Build set of visible link IDs (edges between visible nodes)
 */
function buildVisibleLinks(visibleNodeIds, fullGraph, path = []) {
  if (path.length === 0) {
    return new Set(fullGraph.links.map((_, idx) => idx));
  }

  const visible = new Set();

  fullGraph.links.forEach((link, idx) => {
    const s = String(typeof link.source === 'object' ? link.source.id : link.source);
    const t = String(typeof link.target === 'object' ? link.target.id : link.target);

    // Only show links where both endpoints are visible
    if (visibleNodeIds.has(s) && visibleNodeIds.has(t)) {
      visible.add(idx);
    }
  });

  return visible;
}

/**
 * Go back one step in traversal path
 */
export function traverseBack(currentPath, fullGraph) {
  if (currentPath.length <= 1) {
    // At root or empty → reset fully
    return {
      path: [],
      visibleNodeIds: new Set(),
      visibleLinkIds: new Set(),
    };
  }

  const newPath = currentPath.slice(0, -1);
  const visibleNodeIds = buildVisibleNodes(newPath, fullGraph);
  const visibleLinkIds = buildVisibleLinks(visibleNodeIds, fullGraph, newPath);

  return {
    path: newPath,
    visibleNodeIds,
    visibleLinkIds,
  };
}

/**
 * Reset traversal (clear path, stay in mode)
 */
export function resetTraversal() {
  return {
    path: [],
    visibleNodeIds: new Set(),
    visibleLinkIds: new Set(),
  };
}

/**
 * Filter graph data for traversal display
 * @param {Object} fullGraph - { nodes, links }
 * @param {Set} visibleNodeIds - Node IDs to show
 * @param {Set} visibleLinkIds - Link indices to show
 * @returns {Object} Filtered graph { nodes, links }
 */
export function filterGraphForTraversal(fullGraph, visibleNodeIds, visibleLinkIds, isPathEmpty = false) {
  if (isPathEmpty) {
    return {
      nodes: fullGraph.nodes || [],
      links: fullGraph.links || [],
    };
  }

  const filteredNodes = fullGraph.nodes.filter((node) =>
    visibleNodeIds.has(String(node.id))
  );

  const filteredLinks = fullGraph.links.filter((link, idx) =>
    visibleLinkIds.has(idx)
  );

  return {
    nodes: filteredNodes,
    links: filteredLinks,
  };
}

/**
 * Get the current tip node (last in path) for UI display
 */
export function getCurrentTip(path, fullGraph) {
  if (!path || path.length === 0) return null;
  const tipId = path[path.length - 1];
  return fullGraph.nodes.find((node) => node.id === tipId) || null;
}

/**
 * Get immediate neighbors of a node
 */
export function getNodeNeighbors(nodeId, fullGraph) {
  const neighbors = [];
  const seenIds = new Set();

  fullGraph.links.forEach((link) => {
    const s = typeof link.source === 'object' ? link.source.id : link.source;
    const t = typeof link.target === 'object' ? link.target.id : link.target;

    if (s === nodeId) {
      if (!seenIds.has(t)) {
        seenIds.add(t);
        neighbors.push(fullGraph.nodes.find((n) => n.id === t));
      }
    } else if (t === nodeId) {
      if (!seenIds.has(s)) {
        seenIds.add(s);
        neighbors.push(fullGraph.nodes.find((n) => n.id === s));
      }
    }
  });

  return neighbors.filter(Boolean);
}
