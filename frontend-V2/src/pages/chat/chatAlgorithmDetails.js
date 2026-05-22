const ALGORITHM_DETAILS = {
  pagerank: {
    label: 'PageRank',
    category: 'Centrality',
    summary: 'Finds the most influential nodes based on how many important nodes connect to them.',
    description: 'This is like a popularity contest where a vote from someone important counts more than a vote from someone unknown. It helps us find the "superstars" in your data.',
    scoreLabel: 'Influence score',
    scoreMeaning: 'Higher values usually mean the item is more important or authoritative in the graph.',
  },
  articlerank: {
    label: 'ArticleRank',
    category: 'Centrality',
    summary: 'Ranks important nodes in graphs with uneven or diverse connection patterns.',
    description: 'A smarter way to find important items in complex data. It makes sure we don\'t miss influential items just because they are in a smaller group.',
    scoreLabel: 'Authority score',
    scoreMeaning: 'Higher values usually indicate stronger authority across a broader graph structure.',
  },
  betweenness: {
    label: 'Betweenness',
    category: 'Bridging',
    summary: 'Highlights nodes that sit on many important paths and connect different groups.',
    description: 'Finds the "bridges" or "gatekeepers" in your data. These are the items that connect different groups together—if they were removed, the data would fall apart into isolated pieces.',
    scoreLabel: 'Bridge score',
    scoreMeaning: 'Higher values mean the item acts more like a connector or bottleneck between clusters.',
  },
  closeness: {
    label: 'Closeness',
    category: 'Reachability',
    summary: 'Finds nodes that can reach the rest of the graph quickly.',
    description: 'Finds the "central" items that can reach everyone else the fastest. These items are at the heart of the network.',
    scoreLabel: 'Reach score',
    scoreMeaning: 'Higher values mean the item is closer, on average, to the rest of the network.',
  },
  degree: {
    label: 'Degree',
    category: 'Connectivity',
    summary: 'Counts how many direct connections each node has.',
    description: 'A simple count of how many direct links an item has. It shows who has the most immediate connections.',
    scoreLabel: 'Connection count',
    scoreMeaning: 'Higher values mean the item is directly linked to more entities.',
  },
  hits: {
    label: 'HITS',
    category: 'Hubs and Authorities',
    summary: 'Separates strong hubs from strong authorities in the graph.',
    description: 'Finds "Authorities" (experts everyone points to) and "Hubs" (guides that point to all the experts). It helps distinguish between primary sources and useful directories.',
    scoreLabel: 'Combined HITS score',
    scoreMeaning: 'Higher hub values mean strong linking behavior, while higher authority values mean strong endorsement by others.',
  },
  louvain: {
    label: 'Louvain',
    category: 'Communities',
    summary: 'Groups nodes into communities based on dense internal connections.',
    description: 'Automatically sorts your data into "neighborhoods" or "clubs" based on who talks to who. It helps find hidden groups.',
    scoreLabel: 'Community size',
    scoreMeaning: 'Larger communities contain more related nodes.',
  },
  leiden: {
    label: 'Leiden',
    category: 'Communities',
    summary: 'Builds high-quality communities with stronger internal consistency than standard clustering.',
    scoreLabel: 'Community size',
    scoreMeaning: 'Larger communities contain more related nodes.',
  },
  wcc: {
    label: 'Weakly Connected Components',
    category: 'Communities',
    summary: 'Finds disconnected islands or separate groups in the graph.',
    description: 'Finds "Islands" in your data—groups that are connected to each other but completely cut off from everyone else. It helps identify isolated clusters.',
    scoreLabel: 'Component size',
    scoreMeaning: 'Larger components contain more connected nodes.',
  },
  kcore: {
    label: 'K-Core',
    category: 'Core Structure',
    summary: 'Finds the dense inner core of the graph.',
    scoreLabel: 'Core value',
    scoreMeaning: 'Higher values mean the item belongs to a denser, more interconnected core.',
  },
  triangle_count: {
    label: 'Triangle Count',
    category: 'Local Density',
    summary: 'Measures how often a node participates in tightly connected triplets.',
    scoreLabel: 'Triangle count',
    scoreMeaning: 'Higher values mean the item belongs to more tightly knit local clusters.',
  },
  node_similarity: {
    label: 'Node Similarity',
    category: 'Similarity',
    summary: 'Finds entities that share similar neighborhoods or relationship patterns.',
    description: 'Finds "Twins" or "Lookalikes" in your data by looking at who they hang out with. If two items share almost all the same neighbors, they are considered highly similar.',
    scoreLabel: 'Similarity score',
    scoreMeaning: 'Higher values mean the pair behaves more similarly inside the graph.',
  },
  link_prediction_common: {
    label: 'Link Prediction (Common Neighbors)',
    category: 'Predicted Links',
    summary: 'Suggests missing links based on how many neighbors two nodes already share.',
    scoreLabel: 'Prediction score',
    scoreMeaning: 'Higher values mean the graph structure suggests a stronger missing-link possibility.',
  },
  link_prediction_adamic: {
    label: 'Link Prediction (Adamic-Adar)',
    category: 'Predicted Links',
    summary: 'Suggests missing links with extra weight for rare shared connections.',
    scoreLabel: 'Prediction score',
    scoreMeaning: 'Higher values mean the pair shares more informative rare neighbors.',
  },
  link_prediction_resource: {
    label: 'Link Prediction (Resource Allocation)',
    category: 'Predicted Links',
    summary: 'Suggests missing links based on how strongly connection potential can flow through common neighbors.',
    scoreLabel: 'Prediction score',
    scoreMeaning: 'Higher values mean stronger structural evidence for a missing connection.',
  },
  path: {
    label: 'Shortest Path',
    category: 'Traversal',
    summary: 'Shows how entities are connected through the graph.',
    scoreLabel: 'Path detail',
    scoreMeaning: 'This method is usually interpreted through the path itself rather than a ranking score.',
  },
  bfs: {
    label: 'Breadth-First Search',
    category: 'Traversal',
    summary: 'Explores nearby graph layers outward from a starting entity.',
    scoreLabel: 'Traversal depth',
    scoreMeaning: 'This method is usually interpreted by distance and discovered neighbors rather than a ranking score.',
  },
  dfs: {
    label: 'Depth-First Search',
    category: 'Traversal',
    summary: 'Explores deeper chains from a starting entity before backtracking.',
    scoreLabel: 'Traversal depth',
    scoreMeaning: 'This method is usually interpreted by the discovered path order rather than a ranking score.',
  },
  random_walk: {
    label: 'Random Walk',
    category: 'Traversal',
    summary: 'Samples possible graph paths by walking through connected nodes.',
    scoreLabel: 'Walk result',
    scoreMeaning: 'This method is exploratory, so the path itself matters more than a single numeric score.',
  },
  topological_sort: {
    label: 'Topological Sort',
    category: 'Ordering',
    summary: 'Produces an order that respects directional dependencies in a DAG-like graph.',
    scoreLabel: 'Order position',
    scoreMeaning: 'This method is interpreted by order, not by a numeric score.',
  },
  analytics: {
    label: 'Graph Analytics',
    category: 'Analysis',
    summary: 'Uses a graph algorithm to rank, group, or traverse entities in the knowledge graph.',
    scoreLabel: 'Analysis score',
    scoreMeaning: 'Higher values usually indicate stronger relevance under the selected graph method.',
  },
};

const titleCase = (value) =>
  String(value || '')
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function getAlgorithmDetails(algorithmKey) {
  const key = String(algorithmKey || '').trim().toLowerCase();
  if (!key) return ALGORITHM_DETAILS.analytics;
  return ALGORITHM_DETAILS[key] || {
    ...ALGORITHM_DETAILS.analytics,
    label: titleCase(key),
  };
}

export function formatNumericValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  if (Math.abs(number) >= 1000) return number.toLocaleString();
  if (Math.abs(number) >= 10) return number.toFixed(2);
  if (Math.abs(number) >= 1) return number.toFixed(3);
  return number.toFixed(4);
}

export function getResultTitle(result, index) {
  if (!result || typeof result !== 'object') {
    return `Result ${index + 1}`;
  }

  if (result.name) return result.name;
  if (result.node_name) return result.node_name;
  if (result.source_name && result.target_name) return `${result.source_name} <-> ${result.target_name}`;
  if (result.community_id !== undefined) return `Community ${result.community_id}`;
  if (result.id) return `Item ${result.id}`;
  return `Result ${index + 1}`;
}

export function getResultSubtitle(result) {
  if (!result || typeof result !== 'object') return '';
  if (result.type) return result.type;
  if (result.node_type) return result.node_type;
  if (result.size !== undefined) return `${result.size} members`;
  if (result.id && result.name) return `ID ${result.id}`;
  return '';
}

export function getResultMetrics(result, algorithmKey) {
  const details = getAlgorithmDetails(algorithmKey);
  if (!result || typeof result !== 'object') return [];

  const metrics = [];
  if (result.score !== undefined && result.score !== null) {
    metrics.push({ label: details.scoreLabel || 'Score', value: formatNumericValue(result.score) });
  }
  if (result.hub_score !== undefined && result.hub_score !== null) {
    metrics.push({ label: 'Hub score', value: formatNumericValue(result.hub_score) });
  }
  if (result.auth_score !== undefined && result.auth_score !== null) {
    metrics.push({ label: 'Authority score', value: formatNumericValue(result.auth_score) });
  }
  if (result.size !== undefined && result.size !== null && !metrics.some((metric) => metric.label === 'Size')) {
    metrics.push({ label: 'Size', value: formatNumericValue(result.size) });
  }
  if (result.community_id !== undefined && result.community_id !== null) {
    metrics.push({ label: 'Community', value: String(result.community_id) });
  }
  if (result.id !== undefined && result.id !== null) {
    metrics.push({ label: 'ID', value: String(result.id) });
  }

  return metrics.slice(0, 4);
}
