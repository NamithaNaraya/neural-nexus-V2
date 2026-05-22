export function filterGraphData(graphData, options = {}) {
  const {
    nodeTypeFilters = new Set(),
    relationshipTypeFilters = new Set(),
    minDegree = 0,
    showOrphans = true,
    nodeSearch = '',
    searchResultIds = null,
  } = options;

  const allNodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
  const allLinks = Array.isArray(graphData?.links) ? graphData.links : [];
  const normalizedSearch = nodeSearch.trim().toLowerCase();

  const availableNodeTypes = [...new Set(allNodes.map((node) => node.type || 'Unknown'))];
  const availableRelationshipTypes = [...new Set(allLinks.map((link) => link.type || 'Unknown'))];
  const nodeHasNone = nodeTypeFilters.has('__none__');
  const relationshipHasNone = relationshipTypeFilters.has('__none__');

  const activeNodeTypes = nodeHasNone
    ? new Set()
    : (nodeTypeFilters.size ? nodeTypeFilters : new Set(availableNodeTypes));
  const activeRelationshipTypes = relationshipHasNone
    ? new Set()
    : (relationshipTypeFilters.size ? relationshipTypeFilters : new Set(availableRelationshipTypes));

  const nodes = allNodes.filter((node) => {
    const type = node.type || 'Unknown';
    if (!activeNodeTypes.has(type)) return false;
    if (!showOrphans && (node.degree ?? 0) === 0) return false;
    if ((node.degree ?? 0) < minDegree) return false;
    if (normalizedSearch) {
      if (searchResultIds instanceof Set && searchResultIds.size > 0) {
        if (!searchResultIds.has(String(node.id))) return false;
      } else if (!(node.name || '').toLowerCase().includes(normalizedSearch)) {
        return false;
      }
    }
    return true;
  });

  const nodeIds = new Set(nodes.map((node) => node.id));

  const links = allLinks.filter((link) => {
    const type = link.type || 'Unknown';
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    if (!activeRelationshipTypes.has(type)) return false;
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
    return true;
  });

  return { nodes, links };
}
