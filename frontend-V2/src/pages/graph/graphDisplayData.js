// ─── Adaptive Render Limits ─────────────────────────────────────────────────
// Detect device tier based on logical CPU count and available memory.
// Falls back to conservative limits on unknown/low-end hardware.
function detectDeviceTier() {
  const cores = navigator.hardwareConcurrency || 2;
  const memory = navigator.deviceMemory || 2; // GB, undefined on non-Chromium
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'mid';
  return 'low';
}

const _tier = detectDeviceTier();
const _tierMultiplier = _tier === 'high' ? 3.0 : _tier === 'mid' ? 1.8 : 1.0;

// Base limits scaled by device tier
const _BASE = {
  canvas2d: Math.round(2000 * _tierMultiplier),
  hybrid2d: Math.round(2500 * _tierMultiplier),
  force3d:  Math.round(1000 * _tierMultiplier),
  general:  Math.round(6000 * _tierMultiplier),
};

export const GRAPH_RENDER_LIMITS = Object.freeze({
  canvas2d: _BASE.canvas2d,
  hybrid2d: _BASE.hybrid2d,
  force3d:  _BASE.force3d,
  general:  _BASE.general,
  // Expose tier for debug panels
  _tier,
});

// Progressive fetch steps — load smallest batch immediately, render rest in background
export const GRAPH_FETCH_STEPS = Object.freeze({
  canvas2d: [60, 150, 350, 700, 1400, 2800, _BASE.canvas2d],
  hybrid2d: [60, 150, 350, 700, 1400, 2800, _BASE.hybrid2d],
  force3d:  [40, 100, 250, 500, 1000, _BASE.force3d],
});

/**
 * Cap graph data to maxNodes by degree (most-connected nodes kept).
 * Links with orphaned endpoints are removed.
 */
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

/**
 * Sanitize graph data for rendering: cap by limit, stringify IDs,
 * strip links with missing endpoints.
 */
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

/**
 * Returns the current device tier ('low' | 'mid' | 'high').
 * Useful for conditional rendering decisions in graph pages.
 */
export function getDeviceTier() {
  return _tier;
}
