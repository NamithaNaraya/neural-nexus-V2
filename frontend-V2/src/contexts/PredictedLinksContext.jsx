import React, { createContext, useContext, useMemo, useState } from 'react';

const PredictedLinksContext = createContext(null);

function normalizePredictedLink(link, folderId) {
  const sourceId = String(link.source_id || link.source || '');
  const targetId = String(link.target_id || link.target || '');
  const probability = Number(link.probability || 0);

  return {
    id: link.id || `predicted:${folderId || 'global'}:${sourceId}:${targetId}`,
    source: sourceId,
    target: targetId,
    type: link.type || 'PREDICTED_LINK',
    color: link.color || '#ec4899',
    width: link.width || 2.2,
    description: link.description || `Predicted (${(probability * 100).toFixed(1)}%)`,
    folder_id: folderId || link.folder_id || null,
    properties: {
      ...(link.properties || {}),
      isPredicted: true,
      probability,
      modelName: link.modelName || link.model_name || null,
    },
  };
}

export function PredictedLinksProvider({ children }) {
  const [predictedLinksByFolder, setPredictedLinksByFolder] = useState({});

  const value = useMemo(() => ({
    setPredictedLinks(folderId, links) {
      const key = folderId || '__global__';
      setPredictedLinksByFolder((current) => ({
        ...current,
        [key]: (links || []).map((link) => normalizePredictedLink(link, folderId)),
      }));
    },
    clearPredictedLinks(folderId) {
      const key = folderId || '__global__';
      setPredictedLinksByFolder((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    getPredictedLinks(folderId) {
      const key = folderId || '__global__';
      return predictedLinksByFolder[key] || [];
    },
  }), [predictedLinksByFolder]);

  return <PredictedLinksContext.Provider value={value}>{children}</PredictedLinksContext.Provider>;
}

export function usePredictedLinks() {
  const context = useContext(PredictedLinksContext);
  if (!context) {
    throw new Error('usePredictedLinks must be used within PredictedLinksProvider');
  }
  return context;
}
