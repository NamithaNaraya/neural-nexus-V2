import { useEffect, useMemo, useState } from 'react';
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
  const [folderNodes, setFolderNodes] = useState([]);
  const [folderLinks, setFolderLinks] = useState([]);
  const [graphStats, setGraphStats] = useState({ nodes: 0, links: 0 });
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState(ALGORITHM_CATALOG[0].id);
  const [algorithmParams, setAlgorithmParams] = useState(buildInitialParams(ALGORITHM_CATALOG[0]));
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [relationshipProperties, setRelationshipProperties] = useState([]);
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

  useEffect(() => {
    let ignore = false;

    async function loadNodes() {
      if (!folderId) {
        setFolderNodes([]);
        setFolderLinks([]);
        setGraphStats({ nodes: 0, links: 0 });
        setRelationshipProperties([]);
        setSelectedNodes([]);
        setLoadingNodes(false);
        return;
      }

      setLoadingNodes(true);
      try {
        const [data, discoveredProperties] = await Promise.all([
          graphService.getFolder(folderId, 800),
          weightsService.discoverProperties(folderId),
        ]);
        if (ignore) return;

        const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
        const links = Array.isArray(data?.links) ? data.links : [];
        const relProps = Object.keys(discoveredProperties?.relationship_properties || {});

        setFolderNodes(nodes);
        setFolderLinks(links);
        setGraphStats({
          nodes: Number(data?.total_nodes || nodes.length || 0),
          links: Number(data?.total_links || links.length || 0),
        });
        setRelationshipProperties(relProps);
        setWeightProperty(relProps[0] || '');
        setWeightNumerator(relProps[0] || '');
        setWeightDenominator(relProps[1] || relProps[0] || '');
        setWeightPrimaryProperty(relProps[0] || '');
        setWeightSecondaryProperty(relProps[1] || relProps[0] || '');
        setSelectedNodes((current) => current.filter((id) => nodes.some((node) => node.id === id)));
      } catch (err) {
        console.error('Failed to load folder nodes:', err);
        if (!ignore) {
          setFolderNodes([]);
          setFolderLinks([]);
          setGraphStats({ nodes: 0, links: 0 });
          setRelationshipProperties([]);
          setSelectedNodes([]);
        }
      } finally {
        if (!ignore) setLoadingNodes(false);
      }
    }

    loadNodes();
    return () => {
      ignore = true;
    };
  }, [folderId]);

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

  async function runAlgorithm() {
    if (!selectedAlgorithm || !folderId) return;

    const nodeIds = runFullFolder ? undefined : selectedNodes;
    if (!runFullFolder && (!nodeIds || nodeIds.length === 0)) {
      setError('Choose at least one node in the data popup before running a custom dataset.');
      setResult(null);
      return;
    }

    const params = {
      folder_id: folderId,
      node_ids: nodeIds,
    };

    Object.entries(algorithmParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });

    if (weightFormula) {
      params.weight_formula = JSON.stringify(weightFormula);
    }

    setRunning(true);
    setError('');

    try {
      const data = await analyticsService.runAlgorithm(selectedAlgorithm.endpoint, params);
      setResult(data);
    } catch (err) {
      console.error('Failed to run algorithm:', err);
      setResult(null);
      setError(err.response?.data?.detail || 'Algorithm run failed.');
    } finally {
      setRunning(false);
    }
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
    result,
    error,
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
