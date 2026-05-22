function normalizeEndpointId(endpoint) {
  if (endpoint && typeof endpoint === 'object') {
    return String(endpoint.id ?? '');
  }
  return String(endpoint ?? '');
}

function makeUnorderedPairKey(sourceId, targetId) {
  return [sourceId, targetId].sort().join('::');
}

function makeDirectedPairKey(sourceId, targetId) {
  return `${sourceId}=>${targetId}`;
}

function computeSpreadOffset(index, count, baseOffset = 18, step = 15) {
  const centered = index - (count - 1) / 2;
  return centered * step;
}

export function annotateParallelLinks(links = []) {
  const groups = new Map();

  links.forEach((link) => {
    const sourceId = normalizeEndpointId(link.source);
    const targetId = normalizeEndpointId(link.target);
    const pairKey = makeUnorderedPairKey(sourceId, targetId);

    if (!groups.has(pairKey)) {
      groups.set(pairKey, []);
    }

    groups.get(pairKey).push({ link, sourceId, targetId });
  });

  const annotatedLinks = [];

  groups.forEach((groupEntries) => {
    const orderedEntries = [...groupEntries].sort((left, right) => {
      const leftKey = `${left.link.type || ''}:${left.link.id || ''}`;
      const rightKey = `${right.link.type || ''}:${right.link.id || ''}`;
      return leftKey.localeCompare(rightKey);
    });

    const directionBuckets = new Map();
    orderedEntries.forEach((entry) => {
      const directionKey = makeDirectedPairKey(entry.sourceId, entry.targetId);
      if (!directionBuckets.has(directionKey)) {
        directionBuckets.set(directionKey, []);
      }
      directionBuckets.get(directionKey).push(entry);
    });

    const canonicalSourceId = [...orderedEntries]
      .map((entry) => entry.sourceId)
      .sort()[0];

    // Alternating side logic for the WHOLE group (unordered pair)
    orderedEntries.forEach((entry, groupIndex) => {
      // Curvature: 0, 0.15, -0.15, 0.3, -0.3... based on group position
      const centered = groupIndex - (orderedEntries.length - 1) / 2;
      const curvature = centered * 0.25;
      
      // Side: Alternate +1 and -1 for every link in the entire group
      // This ensures A->B and B->A sit on opposite sides if they are the only two
      const sideSign = (groupIndex % 2 === 0) ? 1 : -1;

      annotatedLinks.push({
        ...entry.link,
        labelSide: sideSign,
        labelOffset: 15 * sideSign, 
        curvature: curvature,
        parallelIndex: groupIndex,
        parallelCount: orderedEntries.length,
      });
    });
  });

  return annotatedLinks;
}

export function getLinkLabelPlacement(link, sourcePoint, targetPoint, offsetScale = 1) {
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const length = Math.hypot(dx, dy);
  if (!length) return null;

  // 1. Stagger the label position along the line (30% to 70%) based on link ID
  // This prevents labels of crossing lines from overlapping at the exact midpoint
  const idHash = [...String(link.id)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const stagger = 0.35 + ((idHash % 31) / 100); 

  // 2. Handle Curvature (for parallel links)
  const curvature = link.curvature || 0;
  
  // Midpoint for straight, or vertex for curve
  const px = sourcePoint.x + dx * stagger;
  const py = sourcePoint.y + dy * stagger;
  
  const normalX = -dy / length;
  const normalY = dx / length;

  // Offset label based on curvature
  // For quadratic curves, the peak is at 0.5 with height = curvature * length / 2
  // We approximate the height at our stagger point
  const peakHeight = curvature * length * 0.5;
  const curveOffsetAtT = peakHeight * (1 - Math.pow(Math.abs(stagger - 0.5) * 2, 2));

  // 3. Final Placement
  // Use a canonical normal so that reciprocal links don't flip the offset incorrectly
  const isReverse = link.source.id > link.target.id;
  const canonicalNormalX = isReverse ? -normalX : normalX;
  const canonicalNormalY = isReverse ? -normalY : normalY;

  const labelDist = (link.labelOffset || 0) * offsetScale;
  const totalNormalOffset = curveOffsetAtT + labelDist;

  let angle = Math.atan2(dy, dx);
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

  // Control point for quadratic curve (if needed for rendering)
  // We MUST use the link's own normal for the curve path itself
  const cp = curvature !== 0 ? {
    x: sourcePoint.x + dx / 2 + normalX * (curvature * length),
    y: sourcePoint.y + dy / 2 + normalY * (curvature * length)
  } : null;

  return {
    x: px + canonicalNormalX * totalNormalOffset,
    y: py + canonicalNormalY * totalNormalOffset,
    angle,
    length,
    isCurved: curvature !== 0,
    cp
  };
}

