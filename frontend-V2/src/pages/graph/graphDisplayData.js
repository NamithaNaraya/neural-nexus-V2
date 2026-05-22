export const GRAPH_RENDER_LIMITS = Object.freeze({
  canvas2d: 1800,
  hybrid2d: 2200,
  force3d: 900,
  general: 5000,
});

export const GRAPH_FETCH_STEPS = Object.freeze({
  // Progressive staged loading keeps UI responsive and avoids big render jumps.
  canvas2d: [60, 140, 280, 560, 1100, 2200, 3200],
  hybrid2d: [60, 140, 280, 560, 1100, 2200, 3200],
  force3d: [40, 100, 220, 460, 900, 1500],
});

export function capGraphData(graphData, maxNodes = 5000) {
  const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
  const links = Array.isArray(graphData?.links) ? graphData.links : [];

  const rankedNodes = [...nodes].sort((a, b) => (Number(b.degree || 0) - Number(a.degree || 0)));
  const keptNodes = rankedNodes.slice(0, maxNodes);
  const nodeIds = new Set(keptNodes.map((node) => node.id));

  const keptLinks = links.filter((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return nodeIds.has(sourceId) && nodeIds.has(targetId);
  });

  return { nodes: keptNodes, links: keptLinks };
}

export function sanitizeGraphForRender(graphData, maxNodes = GRAPH_RENDER_LIMITS.general) {
  const capped = capGraphData(graphData, maxNodes);
  const nodes = (capped.nodes || []).map((node) => ({
    ...node,
    id: String(node.id),
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));

  const links = (capped.links || [])
    .map((link) => {
      const sourceId = String(typeof link.source === 'object' ? link.source.id : link.source);
      const targetId = String(typeof link.target === 'object' ? link.target.id : link.target);
      return {
        ...link,
        id: String(link.id),
        source: sourceId,
        target: targetId,
      };
    })
    .filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));

  return { nodes, links };
}
