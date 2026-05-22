function resolveId(value) {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.entity_id ?? value._id ?? value.elementId ?? null;
  return value;
}

function getNodeId(node) {
  return node?.id ?? node?.entity_id ?? node?.elementId ?? null;
}

function normalizeNode(node) {
  return {
    ...node,
    id: getNodeId(node),
  };
}

export function buildRelationshipFocusGraph(baseGraphData, relationship) {
  const nodes = Array.isArray(baseGraphData?.nodes) ? baseGraphData.nodes : [];
  const links = Array.isArray(baseGraphData?.links) ? baseGraphData.links : [];
  const sourceId = resolveId(relationship?.source);
  const targetId = resolveId(relationship?.target);
  const sourceNode = nodes.find((node) => getNodeId(node) === sourceId);
  const targetNode = nodes.find((node) => getNodeId(node) === targetId);
  const selectedNodes = [];
  const nodeMap = new Map();

  [sourceNode, targetNode].forEach((node) => {
    if (!node) return;
    const normalized = normalizeNode(node);
    if (!nodeMap.has(normalized.id)) {
      nodeMap.set(normalized.id, true);
      selectedNodes.push(normalized);
    }
  });

  if (selectedNodes.length === 0) {
    if (sourceId) selectedNodes.push({ id: sourceId, name: sourceId, type: 'Unknown' });
    if (targetId && targetId !== sourceId) selectedNodes.push({ id: targetId, name: targetId, type: 'Unknown' });
  }

  const selectedLinks = links.filter((link) => {
    const linkSource = resolveId(link.source);
    const linkTarget = resolveId(link.target);
    const sameDirection = linkSource === sourceId && linkTarget === targetId;
    const reverseDirection = linkSource === targetId && linkTarget === sourceId;
    return sameDirection || reverseDirection;
  });

  if (selectedLinks.length === 0) {
    selectedLinks.push({
      ...relationship,
      source: sourceId,
      target: targetId,
      type: relationship?.type || 'Unknown',
    });
  }

  return { nodes: selectedNodes, links: selectedLinks };
}

export function buildNodeFocusGraph(baseGraphData, expandedGraphData, centerNode) {
  const nodes = Array.isArray(expandedGraphData?.nodes) ? expandedGraphData.nodes : [];
  const centerId = getNodeId(centerNode);
  const nodeMap = new Map();
  const mergedNodes = [];

  [centerNode, ...nodes].forEach((node) => {
    if (!node) return;
    const normalized = normalizeNode(node);
    if (!normalized.id || nodeMap.has(normalized.id)) return;
    nodeMap.set(normalized.id, true);
    mergedNodes.push(normalized);
  });

  const neighborIds = new Set(mergedNodes.map((node) => node.id));
  const mergedLinks = (Array.isArray(baseGraphData?.links) ? baseGraphData.links : [])
    .filter((link) => {
      const sourceId = resolveId(link.source);
      const targetId = resolveId(link.target);
      return neighborIds.has(sourceId) || neighborIds.has(targetId);
    })
    .map((link) => ({
      ...link,
      source: resolveId(link.source),
      target: resolveId(link.target),
    }));

  if (centerId && !nodeMap.has(centerId)) {
    const fallback = Array.isArray(baseGraphData?.nodes)
      ? baseGraphData.nodes.find((node) => getNodeId(node) === centerId)
      : null;
    if (fallback) {
      mergedNodes.unshift(normalizeNode(fallback));
    } else {
      mergedNodes.unshift({ id: centerId, name: centerId, type: 'Unknown' });
    }
  }

  return { nodes: mergedNodes, links: mergedLinks };
}
