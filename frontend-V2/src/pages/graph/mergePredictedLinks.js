export function mergePredictedLinks(graphData, predictedLinks) {
  const baseGraph = graphData || { nodes: [], links: [] };
  const baseLinks = Array.isArray(baseGraph.links) ? baseGraph.links : [];
  const nodes = Array.isArray(baseGraph.nodes) ? baseGraph.nodes : [];
  const nodeIds = new Set(nodes.map((node) => String(node.id)));

  if (!predictedLinks?.length) {
    return {
      nodes,
      links: baseLinks,
    };
  }

  const existingKeys = new Set(
    baseLinks.map((link) => {
      const sourceId = typeof link.source === 'object' ? String(link.source?.id) : String(link.source);
      const targetId = typeof link.target === 'object' ? String(link.target?.id) : String(link.target);
      const type = String(link.type || 'Unknown');
      return `${sourceId}|${targetId}|${type}`;
    })
  );

  const injectedLinks = predictedLinks.filter((link) => {
    const sourceId = String(link.source);
    const targetId = String(link.target);
    const type = String(link.type || 'PREDICTED_LINK');
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
    if (existingKeys.has(`${sourceId}|${targetId}|${type}`)) return false;
    return true;
  });

  return {
    nodes,
    links: [...baseLinks, ...injectedLinks],
  };
}
