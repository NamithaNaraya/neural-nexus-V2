const NODE_COLOR_PALETTE = [
  'hsl(96 25% 33%)', // Moss
  'hsl(76 18% 50%)', // Sage
  'hsl(140 15% 40%)', // Pine
  'hsl(28 45% 45%)', // Clay
  'hsl(45 25% 40%)', // Sand
  'hsl(96 15% 55%)', // Mist Moss
  'hsl(168 18% 45%)', // Seaweed
  'hsl(35 30% 35%)', // Bark
  'hsl(96 35% 25%)', // Deep Forest
  'hsl(76 25% 65%)', // Lichen
  'hsl(140 10% 60%)', // Ash Green
  'hsl(28 35% 60%)', // Terracotta
  'hsl(0 30% 40%)', // Berry
  'hsl(190 20% 50%)', // Lake
  'hsl(96 20% 45%)', // Olive
];

const RELATIONSHIP_COLOR_PALETTE = [
  'hsl(96 10% 25%)',
  'hsl(28 15% 30%)',
  'hsl(76 10% 35%)',
  'hsl(140 8% 30%)',
  'hsl(45 10% 35%)',
];

const assignedNodeTypeColors = new Map();
const usedNodeColorIndices = new Set();
const assignedRelationshipColors = new Map();
const usedRelationshipColorIndices = new Set();

function hashString(value = '') {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value.charCodeAt(index);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function assignUniqueColor(type, palette, assignedMap, usedIndices, fallback) {
  if (!type) return fallback;
  if (assignedMap.has(type)) return assignedMap.get(type);

  const hash = hashString(type);
  const startIndex = hash % palette.length;

  for (let attempt = 0; attempt < palette.length; attempt += 1) {
    const paletteIndex = (startIndex + attempt) % palette.length;
    if (!usedIndices.has(paletteIndex)) {
      usedIndices.add(paletteIndex);
      const color = palette[paletteIndex];
      assignedMap.set(type, color);
      return color;
    }
  }

  const hue = (assignedMap.size * 137.508) % 360;
  const generated = `hsl(${Math.round(hue)}, 70%, 75%)`;
  assignedMap.set(type, generated);
  return generated;
}

export function getNodeTypeColor(type, overrides = {}) {
  return overrides[type] || assignUniqueColor(type, NODE_COLOR_PALETTE, assignedNodeTypeColors, usedNodeColorIndices, '#6B7280');
}

export function getRelationshipTypeColor(type, overrides = {}) {
  if (type === 'PREDICTED_LINK') {
    return overrides[type] || '#ec4899';
  }
  return overrides[type] || assignUniqueColor(type, RELATIONSHIP_COLOR_PALETTE, assignedRelationshipColors, usedRelationshipColorIndices, '#64748B');
}

export function withAlpha(hexColor, alphaHex = '18') {
  if (!hexColor || typeof hexColor !== 'string') return hexColor;
  if (hexColor.startsWith('#') && hexColor.length === 7) {
    return `${hexColor}${alphaHex}`;
  }
  return hexColor;
}
