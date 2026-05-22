import { TYPE_STYLES } from './constants';

const CORE_FIELDS = new Set(['id', 'name', 'type', 'description', 'summary', 'degree']);

export function getNodeName(node) {
  return node?.name || node?.label || node?.id || 'Untitled entity';
}

export function getNodeType(node) {
  return node?.type || 'Unknown';
}

export function getNodeDescription(node) {
  return node?.description || node?.summary || node?.indication || node?.notes || 'No description available yet.';
}

export function getNodePropertyEntries(node) {
  if (!node || typeof node !== 'object') return [];

  return Object.entries(node)
    .filter(([key, value]) => !CORE_FIELDS.has(key) && value !== null && value !== undefined && value !== '')
    .slice(0, 4);
}

export function getNodePropertyCount(node) {
  return getNodePropertyEntries(node).length;
}

export function getTypeStyle(type) {
  return TYPE_STYLES[type] || TYPE_STYLES.default;
}

export function sortNodes(nodes, sortMode) {
  const items = [...nodes];

  items.sort((left, right) => {
    const leftName = getNodeName(left).toLowerCase();
    const rightName = getNodeName(right).toLowerCase();
    const leftType = getNodeType(left).toLowerCase();
    const rightType = getNodeType(right).toLowerCase();
    const leftDegree = Number(left?.degree || 0);
    const rightDegree = Number(right?.degree || 0);
    const leftProps = getNodePropertyCount(left);
    const rightProps = getNodePropertyCount(right);

    switch (sortMode) {
      case 'name-desc':
        return rightName.localeCompare(leftName);
      case 'type-asc':
        return leftType.localeCompare(rightType) || leftName.localeCompare(rightName);
      case 'degree-desc':
        return rightDegree - leftDegree || leftName.localeCompare(rightName);
      case 'properties-desc':
        return rightProps - leftProps || leftName.localeCompare(rightName);
      case 'name-asc':
      default:
        return leftName.localeCompare(rightName);
    }
  });

  return items;
}

export function groupNodesByType(nodes) {
  const groups = nodes.reduce((accumulator, node) => {
    const type = getNodeType(node);
    if (!accumulator[type]) accumulator[type] = [];
    accumulator[type].push(node);
    return accumulator;
  }, {});

  return Object.entries(groups)
    .sort((left, right) => right[1].length - left[1].length)
    .map(([type, items]) => ({ type, items }));
}
