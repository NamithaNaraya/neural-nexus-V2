function flattenValues(value, acc = []) {
  if (value === null || value === undefined) return acc;

  if (Array.isArray(value)) {
    value.forEach((item) => flattenValues(item, acc));
    return acc;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => flattenValues(item, acc));
    return acc;
  }

  acc.push(String(value));
  return acc;
}

function buildSearchText(node) {
  const properties = node?.properties || {};
  return [
    node?.name,
    node?.type,
    node?.description,
    ...flattenValues(properties),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreNode(node, query) {
  const text = buildSearchText(node);
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;

  let score = 0;
  const name = String(node?.name || '').toLowerCase();
  const type = String(node?.type || '').toLowerCase();
  const description = String(node?.description || '').toLowerCase();

  if (text.includes(query.toLowerCase())) score += 40;
  if (name === query.toLowerCase()) score += 120;
  if (name.startsWith(query.toLowerCase())) score += 70;
  if (type.includes(query.toLowerCase())) score += 35;
  if (description.includes(query.toLowerCase())) score += 20;

  let matchedTokens = 0;
  tokens.forEach((token) => {
    if (text.includes(token)) {
      matchedTokens += 1;
      score += 8;
    }
  });

  if (matchedTokens === tokens.length && tokens.length > 1) {
    score += 25;
  }

  return score;
}

export function semanticSearchNodeIds(nodes = [], query = '', limit = 100) {
  const normalized = query.trim().toLowerCase();
  if (!normalized || normalized.length < 2) return null;

  const ranked = nodes
    .map((node) => ({ node, score: scoreNode(node, normalized) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!ranked.length) return null;
  return new Set(ranked.map((item) => String(item.node.id)));
}
