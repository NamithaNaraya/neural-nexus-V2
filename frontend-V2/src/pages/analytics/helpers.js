export function getDisplayName(item) {
  if (!item || typeof item !== 'object') return 'Unnamed';

  const candidates = [
    item.name,
    item.source_name,
    item.target_name,
    item.title,
    item.label,
    item.text,
    item.content,
    item.value,
    item.id,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim()) || 'Unnamed';
}

export function getDisplayType(item) {
  return item?.type || item?.source_type || 'Entity';
}

export function getCompactTypeLabel(item) {
  const rawType = getDisplayType(item);
  if (typeof rawType !== 'string') return 'Entity';

  const compact = rawType
    .replace(/_f_[a-z0-9_-]+$/i, '')
    .replace(/_[a-f0-9-]{8,}$/i, '')
    .trim();

  return compact || rawType;
}

export function getTypeToneClasses(item) {
  const label = getCompactTypeLabel(item).toLowerCase();

  if (label.includes('therapeutic')) {
    return 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700';
  }
  if (label.includes('biomarker')) {
    return 'border-amber-300/60 bg-amber-500/10 text-amber-700';
  }
  if (label.includes('phyto')) {
    return 'border-cyan-300/60 bg-cyan-500/10 text-cyan-700';
  }
  if (label.includes('plant')) {
    return 'border-emerald-300/60 bg-emerald-500/10 text-emerald-800';
  }
  if (label.includes('herb')) {
    return 'border-teal-300/60 bg-teal-500/10 text-teal-700';
  }

  return 'border-slate-300/60 bg-slate-500/10 text-slate-700';
}

export function getScoreLabel(item) {
  if (typeof item?.score === 'number') return item.score.toFixed(4);
  if (typeof item?.similarity === 'number') return item.similarity.toFixed(4);
  if (typeof item?.auth_score === 'number' || typeof item?.hub_score === 'number') {
    return `A ${Number(item.auth_score || 0).toFixed(3)} / H ${Number(item.hub_score || 0).toFixed(3)}`;
  }
  if (item?.community !== undefined || item?.community_id !== undefined) {
    return `Group ${item.community ?? item.community_id}`;
  }
  return '-';
}

export function formatAlgorithmSummary(result, selectedAlgorithm, selectedNodesCount, folderName) {
  if (!result) return '';

  const scope = selectedNodesCount > 0
    ? `${selectedNodesCount} selected node${selectedNodesCount === 1 ? '' : 's'}`
    : folderName || 'the current graph scope';

  const insight = result.insight || `Algorithm completed for ${scope}.`;
  return `${selectedAlgorithm?.name || 'Algorithm'} ran on ${scope}. ${insight}`;
}

export function describeWeightFormula(formula) {
  if (!formula) return 'No quantitative weighting applied.';

  if (formula.type === 'property') {
    return `Weighted by relationship property "${formula.property}".`;
  }

  if (formula.type === 'ratio') {
    return `Weighted by ratio "${formula.numerator} / ${formula.denominator}".`;
  }

  if (formula.type === 'weighted_sum') {
    return `Weighted by ${formula.terms.map((term) => `${term.coefficient}x ${term.property}`).join(' + ')}.`;
  }

  return 'Custom quantitative weighting applied.';
}
