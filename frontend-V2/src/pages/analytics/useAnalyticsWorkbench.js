import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { graphService } from '../../services/graphService';
import { analyticsService } from '../../services/analyticsService';
import { weightsService } from '../../services/weightsService';
import { useGlobalFolder } from '../../contexts/GlobalFolderContext';
import { ALGORITHM_CATALOG, getAlgorithmById } from './algorithmCatalog';

function buildInitialParams(algorithm) {
  return (algorithm?.params || []).reduce((acc, param) => {
    acc[param.key] = param.defaultValue ?? '';
    return acc;
  }, {});
}

export function useAnalyticsWorkbench() {
  const { selectedFolderId: folderId, currentFolder } = useGlobalFolder();
  const queryClient = useQueryClient();
  
  // 1. Redux subscription to graph changes (such as node additions/deletions)
  const refreshToken = useSelector((state) => state.graph?.refreshToken || 0);

  // 2. Workbench state definitions
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState(ALGORITHM_CATALOG[0].id);
  const [algorithmParams, setAlgorithmParams] = useState(buildInitialParams(ALGORITHM_CATALOG[0]));
  const [error, setError] = useState('');
  const [weightingEnabled, setWeightingEnabled] = useState(false);
  const [weightFormulaType, setWeightFormulaType] = useState('property');
  const [weightProperty, setWeightProperty] = useState('');
  const [weightNumerator, setWeightNumerator] = useState('');
  const [weightDenominator, setWeightDenominator] = useState('');
  const [weightPrimaryProperty, setWeightPrimaryProperty] = useState('');
  const [weightSecondaryProperty, setWeightSecondaryProperty] = useState('');
  const [weightPrimaryCoefficient, setWeightPrimaryCoefficient] = useState(1);
  const [weightSecondaryCoefficient, setWeightSecondaryCoefficient] = useState(0.5);
  const [runFullFolder, setRunFullFolder] = useState(true);
  const [activeRunParams, setActiveRunParams] = useState(null);

  // Invalidate queries when graph changes (via Redux or custom CRUD event)
  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    };

    if (refreshToken > 0) {
      handleInvalidate();
    }

    window.addEventListener('nnv2:graph-crud', handleInvalidate);
    return () => {
      window.removeEventListener('nnv2:graph-crud', handleInvalidate);
    };
  }, [refreshToken, queryClient]);

  // Reset active run parameters when folder changes
  useEffect(() => {
    setActiveRunParams(null);
    setSelectedNodes([]);
    setError('');
  }, [folderId]);

  // 3. TanStack Query for folder graph data
  const { data: graphData, isFetching: loadingNodes } = useQuery({
    queryKey: ['graph', 'folder', folderId, 800],
    queryFn: () => graphService.getFolder(folderId, 800),
    enabled: !!folderId,
    staleTime: 5 * 60 * 1000,
    placeholderData: { nodes: [], links: [] },
  });

  const folderNodes = useMemo(() => graphData?.nodes || [], [graphData]);
  const folderLinks = useMemo(() => graphData?.links || [], [graphData]);
  const graphStats = useMemo(() => ({
    nodes: Number(graphData?.total_nodes || folderNodes.length || 0),
    links: Number(graphData?.total_links || folderLinks.length || 0),
  }), [graphData, folderNodes, folderLinks]);

  // 4. TanStack Query for weight properties
  const { data: discoveredProperties } = useQuery({
    queryKey: ['graph', 'discover-properties', folderId],
    queryFn: () => weightsService.discoverProperties(folderId),
    enabled: !!folderId,
    staleTime: 5 * 60 * 1000,
  });

  const relationshipProperties = useMemo(() => 
    Object.keys(discoveredProperties?.relationship_properties || {}), 
    [discoveredProperties]
  );

  // Set default weight property values once loaded
  useEffect(() => {
    if (relationshipProperties.length > 0) {
      setWeightProperty((curr) => curr || relationshipProperties[0]);
      setWeightNumerator((curr) => curr || relationshipProperties[0]);
      setWeightDenominator((curr) => curr || relationshipProperties[1] || relationshipProperties[0]);
      setWeightPrimaryProperty((curr) => curr || relationshipProperties[0]);
      setWeightSecondaryProperty((curr) => curr || relationshipProperties[1] || relationshipProperties[0]);
    }
  }, [relationshipProperties]);

  // Keep selectedNodes valid within the active folder's nodes
  useEffect(() => {
    if (folderNodes.length > 0) {
      setSelectedNodes((current) => current.filter((id) => folderNodes.some((node) => node.id === id)));
    }
  }, [folderNodes]);

  const selectedAlgorithm = useMemo(() => getAlgorithmById(selectedAlgorithmId), [selectedAlgorithmId]);

  useEffect(() => {
    setAlgorithmParams(buildInitialParams(selectedAlgorithm));
    setError('');
  }, [selectedAlgorithm]);

  useEffect(() => {
    if (!selectedAlgorithm?.usesWeights) {
      setWeightingEnabled(false);
    }
  }, [selectedAlgorithm]);

  const nodeTypes = useMemo(
    () => [...new Set(folderNodes.map((node) => node.type).filter(Boolean))].sort(),
    [folderNodes]
  );

  const relationshipTypes = useMemo(
    () => [...new Set(folderLinks.map((link) => link.type).filter(Boolean))].sort(),
    [folderLinks]
  );

  const weightFormula = useMemo(() => {
    if (!weightingEnabled || !selectedAlgorithm?.usesWeights) return null;

    if (weightFormulaType === 'property' && weightProperty) {
      return { type: 'property', property: weightProperty };
    }

    if (weightFormulaType === 'ratio' && weightNumerator && weightDenominator) {
      return {
        type: 'ratio',
        numerator: weightNumerator,
        denominator: weightDenominator,
        label: `${weightNumerator}/${weightDenominator}`,
      };
    }

    if (weightFormulaType === 'weighted_sum' && weightPrimaryProperty) {
      const terms = [
        { property: weightPrimaryProperty, coefficient: Number(weightPrimaryCoefficient) || 1 },
      ];

      if (weightSecondaryProperty) {
        terms.push({ property: weightSecondaryProperty, coefficient: Number(weightSecondaryCoefficient) || 0 });
      }

      return { type: 'weighted_sum', terms };
    }

    return null;
  }, [
    weightingEnabled,
    selectedAlgorithm,
    weightFormulaType,
    weightProperty,
    weightNumerator,
    weightDenominator,
    weightPrimaryProperty,
    weightSecondaryProperty,
    weightPrimaryCoefficient,
    weightSecondaryCoefficient,
  ]);

  // 5. TanStack Query for caching algorithm run results
  const { data: runData, error: runQueryError, isFetching: running } = useQuery({
    queryKey: ['analytics', 'run', folderId, activeRunParams],
    queryFn: async () => {
      if (!activeRunParams) return null;
      const { algorithmId, params, weightFormula, runFullFolder, nodeIds } = activeRunParams;
      const algo = getAlgorithmById(algorithmId);
      
      const queryParams = {
        folder_id: folderId,
        node_ids: nodeIds,
      };

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = value;
        }
      });

      if (weightFormula) {
        queryParams.weight_formula = JSON.stringify(weightFormula);
      }

      return await analyticsService.runAlgorithm(algo.endpoint, queryParams);
    },
    enabled: !!folderId && !!activeRunParams && activeRunParams.folderId === folderId,
    staleTime: Infinity, // Caches results until invalidated by graph updates
    retry: false,
  });

  function runAlgorithm() {
    if (!selectedAlgorithm || !folderId) return;

    const nodeIds = runFullFolder ? undefined : selectedNodes;
    if (!runFullFolder && (!nodeIds || nodeIds.length === 0)) {
      setError('Choose at least one node in the data popup before running a custom dataset.');
      return;
    }

    setError('');
    setActiveRunParams({
      algorithmId: selectedAlgorithmId,
      params: algorithmParams,
      weightFormula: weightFormula,
      runFullFolder: runFullFolder,
      nodeIds: nodeIds,
      folderId: folderId,
    });
  }

  function toggleNode(nodeId) {
    setSelectedNodes((current) => (
      current.includes(nodeId)
        ? current.filter((item) => item !== nodeId)
        : [...current, nodeId]
    ));
  }

  function setAlgorithmParam(key, value) {
    setAlgorithmParams((current) => ({ ...current, [key]: value }));
  }

  function clearSelection() {
    setSelectedNodes([]);
  }

  return {
    folderId,
    currentFolder,
    folderNodes,
    folderLinks,
    nodeTypes,
    relationshipTypes,
    graphStats,
    selectedNodes,
    toggleNode,
    clearSelection,
    selectedAlgorithm,
    selectedAlgorithmId,
    setSelectedAlgorithmId,
    algorithmParams,
    setAlgorithmParam,
    loadingNodes,
    running,
    result: runData || null,
    error: runQueryError ? (runQueryError.response?.data?.detail || runQueryError.message || 'Algorithm run failed.') : error,
    runAlgorithm,
    relationshipProperties,
    weightingEnabled,
    setWeightingEnabled,
    weightFormulaType,
    setWeightFormulaType,
    weightProperty,
    setWeightProperty,
    weightNumerator,
    setWeightNumerator,
    weightDenominator,
    setWeightDenominator,
    weightPrimaryProperty,
    setWeightPrimaryProperty,
    weightSecondaryProperty,
    setWeightSecondaryProperty,
    weightPrimaryCoefficient,
    setWeightPrimaryCoefficient,
    weightSecondaryCoefficient,
    setWeightSecondaryCoefficient,
    weightFormula,
    runFullFolder,
    setRunFullFolder,
  };
}
