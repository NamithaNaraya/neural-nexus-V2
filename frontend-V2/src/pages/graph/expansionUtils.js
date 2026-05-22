/**
 * Knowledge Explorer Mode Utilities
 * 
 * Implements organic, multi-level expansion:
 * - Click a node to "expand" it (show its neighbors)
 * - Click it again to "collapse" it
 * - A node is visible if it is expanded OR if it is a neighbor of ANY expanded node
 * - No duplicates, no hardcoding.
 */

/**
 * Toggle the expansion state of a node
 * @param {Set} expandedIds - Set of currently expanded node IDs
 * @param {string} nodeId - ID of the node to toggle
 * @returns {Set} New set of expanded node IDs
 */
export function toggleNodeExpansion(expandedIds, nodeId) {
  const next = new Set(expandedIds);
  if (next.has(nodeId)) {
    next.delete(nodeId);
  } else {
    next.add(nodeId);
  }
  return next;
}

/**
 * Filter the graph based on the set of expanded nodes
 * @param {Object} fullGraph - { nodes, links }
 * @param {Set} expandedIds - Set of expanded node IDs
 * @returns {Object} { nodes, links, visibleNodeIds, visibleLinkIds }
 */
export function filterGraphForExpansion(fullGraph, expandedIds) {
  const visibleNodeIds = new Set();
  const visibleLinkIds = new Set();

  if (expandedIds.size === 0) {
    return {
      nodes: fullGraph.nodes || [],
      links: fullGraph.links || [],
      visibleNodeIds: new Set(),
      visibleLinkIds: new Set()
    };
  }

  // 1. All expanded nodes are visible
  expandedIds.forEach(id => visibleNodeIds.add(String(id)));

  // 2. All immediate neighbors of expanded nodes are visible
  fullGraph.links.forEach((link, idx) => {
    const s = String(typeof link.source === 'object' ? link.source.id : link.source);
    const t = String(typeof link.target === 'object' ? link.target.id : link.target);

    if (expandedIds.has(s) || expandedIds.has(t)) {
      visibleNodeIds.add(s);
      visibleNodeIds.add(t);
      visibleLinkIds.add(idx);
    }
  });

  // 3. Filter the full graph
  const nodes = fullGraph.nodes.filter(n => visibleNodeIds.has(String(n.id)));
  const links = fullGraph.links.filter((l, idx) => visibleLinkIds.has(idx));

  return {
    nodes,
    links,
    visibleNodeIds,
    visibleLinkIds
  };
}
