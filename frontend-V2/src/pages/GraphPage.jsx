import React, { Suspense, lazy, useEffect, useMemo, useState, useRef } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { ChevronRight, Compass, MoveRight, Radar, RotateCcw, SlidersHorizontal, Sparkles, Spline, Waypoints, Layout, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import GraphPropertyTablePage from './graph/GraphPropertyTablePage';
import { GraphViewsNavigation } from './graph/GraphViewsNavigation';
import { GraphWorkspaceSidebar } from './graph/GraphWorkspaceSidebar';
import { knowledgeGraphSections } from './graph/graphViewSections';
import { filterGraphForExpansion, toggleNodeExpansion } from './graph/expansionUtils';
import { filterGraphForTraversal, resetTraversal, traverseBack, traverseToNode } from './graph/graphTraversalUtils';
import { semanticSearchNodeIds } from './graph/semanticSearch';
import { graphService } from '../services/graphService';
import { useGlobalFolder } from '../contexts/GlobalFolderContext';
import { usePredictedLinks } from '../contexts/PredictedLinksContext';
import { GlobalGraphSearch } from './graph/tools/GlobalGraphSearch';
import { GraphToolbarControls } from './graph/tools/GraphToolbarControls';
import { mergePredictedLinks } from './graph/mergePredictedLinks';
import { GraphHeaderSkeleton } from './graph/components/GraphHeaderSkeleton';
import { GRAPH_FETCH_STEPS } from './graph/graphDisplayData';

const GraphForceGraph3DPage = lazy(() => import('./graph/GraphForceGraph3DPage'));
const GraphForcePage = lazy(() => import('./graph/GraphForcePage'));

function GraphViewLoader() {
  return <GraphHeaderSkeleton />;
}

export default function GraphPage() {
  const { selectedFolderId: folderId } = useGlobalFolder();
  const { getPredictedLinks, clearPredictedLinks } = usePredictedLinks();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('filters');
  const [nodeSearch, setNodeSearch] = useState('');
  const [minDegree, setMinDegree] = useState(0);
  const [showOrphans, setShowOrphans] = useState(true);
  const [nodeTypeFilters, setNodeTypeFilters] = useState(new Set());
  const [relationshipTypeFilters, setRelationshipTypeFilters] = useState(new Set());
  const [nodeTypeColors, setNodeTypeColors] = useState({});
  const [relationshipTypeColors, setRelationshipTypeColors] = useState({});
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [refreshToken, setRefreshToken] = useState(0);
  const [graphStats, setGraphStats] = useState({ nodes: 0, links: 0 });
  const [hydrationStatus, setHydrationStatus] = useState({
    active: false,
    loadedSteps: 0,
    totalSteps: 0,
    complete: false,
  });
  const [addNodeSignal, setAddNodeSignal] = useState(0);
  const [traversalModeActive, setTraversalModeActive] = useState(false);
  const [traversalPath, setTraversalPath] = useState([]);
  const [traversalVisibleNodeIds, setTraversalVisibleNodeIds] = useState(new Set());
  const [traversalVisibleLinkIds, setTraversalVisibleLinkIds] = useState(new Set());
  
  // Knowledge Explorer Mode State
  const [explorerModeActive, setExplorerModeActive] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());

  const [showNodeLabels, setShowNodeLabels] = useState(false);
  const [showRelationshipLabels, setShowRelationshipLabels] = useState(false);
  const [jumpRequest, setJumpRequest] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState('');
  const [pathSummary, setPathSummary] = useState(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState(new Set());
  const [highlightedLinkIds, setHighlightedLinkIds] = useState(new Set());
  const [resetPinnedSignal, setResetPinnedSignal] = useState(0);
  const [resetViewSignal, setResetViewSignal] = useState(0);
  const [lockDraggedNodes, setLockDraggedNodes] = useState(true);
  const [linkStyle, setLinkStyle] = useState('curved'); // 'straight' or 'curved'
  
  // Integrated Editing State
  const [editMode, setEditMode] = useState('view'); // 'view', 'add-node', 'add-link'
  const [phantomNode, setPhantomNode] = useState(null);
  const [phantomLink, setPhantomLink] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [activeRelationship, setActiveRelationship] = useState(null);
  const uiStateLoadedRef = useRef(false);
  const GRAPH_UI_STATE_KEY = `nnv2:graph:ui:${folderId || 'global'}`;
  const hydrateJobRef = useRef({ cancelled: false });

  const predictedLinks = useMemo(() => getPredictedLinks(folderId), [folderId, getPredictedLinks]);

  const toolOptions = useMemo(
    () => [
      { id: 'filters', label: 'Node Filter', icon: SlidersHorizontal },
      { id: 'explorer', label: 'Cluster Expand', icon: Sparkles },
      { id: 'traversal', label: 'Path Discovery', icon: Waypoints },
      { id: 'hop', label: 'Hop Finder', icon: Radar },
      { id: 'distance', label: 'Distance Finder', icon: MoveRight },
      { id: 'quality', label: 'Quality', icon: Sparkles },
    ],
    []
  );

  useEffect(() => {
    let ignore = false;
    hydrateJobRef.current.cancelled = false;

    async function loadGraphContext() {
      if (!folderId) {
        setGraphData({ nodes: [], links: [] });
        setHydrationStatus({ active: false, loadedSteps: 0, totalSteps: 0, complete: false });
        return;
      }

      try {
        const [firstLimit, ...restLimits] = GRAPH_FETCH_STEPS.hybrid2d;
        const totalSteps = GRAPH_FETCH_STEPS.hybrid2d.length;
        setHydrationStatus({
          active: true,
          loadedSteps: 0,
          totalSteps,
          complete: false,
        });
        const firstData = await graphService.getFolder(folderId, firstLimit);
        if (ignore) return;
        setGraphData(firstData || { nodes: [], links: [] });
        setHydrationStatus({
          active: totalSteps > 1,
          loadedSteps: 1,
          totalSteps,
          complete: totalSteps <= 1,
        });

        let latestSnapshot = firstData || { nodes: [], links: [] };

        for (const [index, stepLimit] of restLimits.entries()) {
          if (ignore || hydrateJobRef.current.cancelled) return;
          const pageData = await graphService.getFolder(folderId, stepLimit);
          if (ignore || hydrateJobRef.current.cancelled) return;
          const pageNodes = Array.isArray(pageData?.nodes) ? pageData.nodes : [];
          if (!pageNodes.length) {
            setHydrationStatus({
              active: false,
              loadedSteps: index + 1,
              totalSteps,
              complete: true,
            });
            break;
          }

          // Keep the first graph visible and update quietly in the status pill.
          // We only swap to the final cumulative snapshot once loading completes,
          // which avoids the "blinking" feeling on every batch.
          latestSnapshot = pageData || latestSnapshot;
          const loadedSteps = index + 2;
          setHydrationStatus({
            active: loadedSteps < totalSteps,
            loadedSteps,
            totalSteps,
            complete: loadedSteps >= totalSteps,
          });
          await new Promise((resolve) => window.setTimeout(resolve, 90));
        }

        if (!ignore && !hydrateJobRef.current.cancelled) {
          setGraphData(latestSnapshot || { nodes: [], links: [] });
          setHydrationStatus((prev) => ({
            ...prev,
            active: false,
            complete: true,
            loadedSteps: prev.totalSteps || prev.loadedSteps,
          }));
        }
      } catch (error) {
        console.error('Failed to load graph context:', error);
        if (!ignore) {
          setGraphData({ nodes: [], links: [] });
          setHydrationStatus({ active: false, loadedSteps: 0, totalSteps: 0, complete: false });
        }
      }
    }

    const handleCrud = () => setRefreshToken((value) => value + 1);
    window.addEventListener('nnv2:graph-crud', handleCrud);
    loadGraphContext();

    return () => {
      ignore = true;
      hydrateJobRef.current.cancelled = true;
      window.removeEventListener('nnv2:graph-crud', handleCrud);
    };
  }, [folderId, refreshToken]);

  useEffect(() => {
    if (!folderId) return;
    try {
      const raw = localStorage.getItem(GRAPH_UI_STATE_KEY);
      if (!raw) {
        uiStateLoadedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.toolsOpen === 'boolean') setToolsOpen(parsed.toolsOpen);
        if (typeof parsed.sidebarOpen === 'boolean') setSidebarOpen(parsed.sidebarOpen);
        if (typeof parsed.activePanel === 'string') setActivePanel(parsed.activePanel);
        if (typeof parsed.showNodeLabels === 'boolean') setShowNodeLabels(parsed.showNodeLabels);
        if (typeof parsed.showRelationshipLabels === 'boolean') setShowRelationshipLabels(parsed.showRelationshipLabels);
        if (typeof parsed.lockDraggedNodes === 'boolean') setLockDraggedNodes(parsed.lockDraggedNodes);
        if (typeof parsed.linkStyle === 'string') setLinkStyle(parsed.linkStyle);
        if (parsed.nodeTypeColors && typeof parsed.nodeTypeColors === 'object') setNodeTypeColors(parsed.nodeTypeColors);
        if (parsed.relationshipTypeColors && typeof parsed.relationshipTypeColors === 'object') setRelationshipTypeColors(parsed.relationshipTypeColors);
      }
    } catch {
      // ignore malformed cached state
    } finally {
      uiStateLoadedRef.current = true;
    }
  }, [GRAPH_UI_STATE_KEY, folderId]);

  useEffect(() => {
    if (!folderId || !uiStateLoadedRef.current) return;
    const payload = {
      toolsOpen,
      sidebarOpen,
      activePanel,
      showNodeLabels,
      showRelationshipLabels,
      lockDraggedNodes,
      linkStyle,
      nodeTypeColors,
      relationshipTypeColors,
    };
    try {
      localStorage.setItem(GRAPH_UI_STATE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
  }, [
    GRAPH_UI_STATE_KEY,
    folderId,
    toolsOpen,
    sidebarOpen,
    activePanel,
    showNodeLabels,
    showRelationshipLabels,
    lockDraggedNodes,
    linkStyle,
    nodeTypeColors,
    relationshipTypeColors,
  ]);

  useEffect(() => {
    const result = resetTraversal();
    setTraversalModeActive(false);
    setTraversalPath(result.path);
    setTraversalVisibleNodeIds(result.visibleNodeIds);
    setTraversalVisibleLinkIds(result.visibleLinkIds);
    setExplorerModeActive(false);
    setExpandedNodeIds(new Set());
    setPathSummary(null);
    setHighlightedNodeIds(new Set());
    setHighlightedLinkIds(new Set());
  }, [folderId]);
  
  // Handle Deep Link Exploration
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkProcessedRef = useRef(null);

  useEffect(() => {
    const exploreId = searchParams.get('exploreId');
    if (!exploreId || !folderId || deepLinkProcessedRef.current === exploreId) return;

    async function processDeepLink() {
      // 1. Check if node is already in graph data
      let targetNode = (graphData.nodes || []).find(n => String(n.id) === String(exploreId));
      
      // 2. If not, try to fetch its neighbors explicitly (this is the missing piece)
      if (!targetNode && graphData.nodes?.length > 0) {
        try {
          const neighbors = await graphService.getNodeNeighbors(exploreId);
          if (neighbors && neighbors.nodes?.length > 0) {
            // Merge into local graph data temporarily or just set as explorer seed
            targetNode = neighbors.nodes.find(n => String(n.id) === String(exploreId));
          }
        } catch (err) {
          console.error("Failed to fetch deep-linked node neighborhood:", err);
        }
      }

      if (targetNode) {
        deepLinkProcessedRef.current = exploreId;
        setExplorerModeActive(true);
        setExpandedNodeIds(new Set([String(exploreId)]));
        setToolsOpen(true);
        setShowNodeLabels(true);
        handleJumpToNode(targetNode);
        
        // Clear param so it doesn't re-trigger on refresh
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('exploreId');
        setSearchParams(nextParams, { replace: true });
      }
    }

    void processDeepLink();
  }, [searchParams, graphData.nodes, folderId, setSearchParams]);

  const graphDataWithPredictions = useMemo(
    () => mergePredictedLinks(graphData, predictedLinks),
    [graphData, predictedLinks]
  );

  const nodeTypes = useMemo(
    () => [...new Set((graphDataWithPredictions.nodes || []).map((node) => node.type || 'Unknown'))].sort(),
    [graphDataWithPredictions.nodes]
  );

  const relationshipTypes = useMemo(
    () => [...new Set((graphDataWithPredictions.links || []).map((link) => link.type || 'Unknown'))].sort(),
    [graphDataWithPredictions.links]
  );

  const searchResultIds = useMemo(
    () => semanticSearchNodeIds(graphData.nodes || [], nodeSearch),
    [graphData.nodes, nodeSearch]
  );

  const jumpResults = useMemo(() => {
    const normalized = nodeSearch.trim().toLowerCase();
    if (!normalized) return [];

    return (graphData.nodes || [])
      .filter((node) => {
        const haystack = `${node.name || ''} ${node.type || ''} ${node.description || ''}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [graphData.nodes, nodeSearch]);

  const activeFilterCount = nodeTypeFilters.size
    + relationshipTypeFilters.size
    + (minDegree > 0 ? 1 : 0)
    + (!showOrphans ? 1 : 0);

  const traversalGraphData = useMemo(
    () => filterGraphForTraversal(graphDataWithPredictions, traversalVisibleNodeIds, traversalVisibleLinkIds, traversalPath.length === 0),
    [graphDataWithPredictions, traversalVisibleNodeIds, traversalVisibleLinkIds, traversalPath.length]
  );

  const explorerGraphData = useMemo(
    () => filterGraphForExpansion(graphDataWithPredictions, expandedNodeIds),
    [graphDataWithPredictions, expandedNodeIds]
  );

  const traversalPathNodes = useMemo(
    () => traversalPath
      .map((nodeId) => (graphDataWithPredictions.nodes || []).find((node) => String(node.id) === String(nodeId)))
      .filter(Boolean),
    [traversalPath, graphDataWithPredictions.nodes]
  );

  const traversalPathNames = useMemo(
    () => traversalPathNodes.map((node) => node.name || node.id),
    [traversalPathNodes]
  );

  const handleClearAllFilters = () => {
    setMinDegree(0);
    setShowOrphans(true);
    setNodeTypeFilters(new Set());
    setRelationshipTypeFilters(new Set());
  };

  const handleJumpToNode = (node) => {
    if (!node?.id) return;
    setJumpRequest({ nodeId: node.id, nonce: Date.now() });
  };

  const handleOpenToolPanel = (panel) => {
    setActivePanel(panel);
    setSidebarOpen(true);
  };

  const handleResetView = () => {
    const result = resetTraversal();
    clearPredictedLinks(folderId);
    setNodeSearch('');
    setMinDegree(0);
    setShowOrphans(true);
    setNodeTypeFilters(new Set());
    setRelationshipTypeFilters(new Set());
    setTraversalModeActive(false);
    setExplorerModeActive(false);
    setExpandedNodeIds(new Set());
    setTraversalPath(result.path);
    setTraversalVisibleNodeIds(result.visibleNodeIds);
    setTraversalVisibleLinkIds(result.visibleLinkIds);
    setPathSummary(null);
    setPathError('');
    setHighlightedNodeIds(new Set());
    setHighlightedLinkIds(new Set());
    setSidebarOpen(false);
    setToolsOpen(false);
    setResetViewSignal((value) => value + 1);
  };

  const handleResetPins = () => {
    setResetPinnedSignal((value) => value + 1);
  };

  const handleFindPath = async (sourceNode, targetNode) => {
    if (!sourceNode?.id || !targetNode?.id) return;
    setPathLoading(true);
    setPathError('');
    try {
      const result = await graphService.findPath(sourceNode.id, targetNode.id);
      if (!result?.path_exists) {
        setPathSummary(null);
        setHighlightedNodeIds(new Set());
        setHighlightedLinkIds(new Set());
        setPathError('No path exists between those nodes in the current graph.');
        return;
      }

      setHighlightedNodeIds(new Set((result.node_ids || []).map(String)));
      setHighlightedLinkIds(new Set((result.link_ids || []).map(String)));
      setPathSummary({
        sourceId: sourceNode.id,
        sourceName: sourceNode.name || sourceNode.id,
        targetId: targetNode.id,
        targetName: targetNode.name || targetNode.id,
        length: Number(result.length || 0),
      });
      setJumpRequest({ nodeId: sourceNode.id, nonce: Date.now() });
    } catch (error) {
      console.error('Failed to find path:', error);
      setPathSummary(null);
      setHighlightedNodeIds(new Set());
      setHighlightedLinkIds(new Set());
      setPathError(error?.response?.data?.detail || error?.message || 'Path finding failed.');
    } finally {
      setPathLoading(false);
    }
  };

  const handleClearPath = () => {
    setPathSummary(null);
    setPathError('');
    setHighlightedNodeIds(new Set());
    setHighlightedLinkIds(new Set());
  };

  const handleOpenHopFinder = (node, depth, relationshipTypesForHop) => {
    if (!node?.id) return;
    setJumpRequest({
      nodeId: node.id,
      depth: depth || 1,
      relationshipTypes: relationshipTypesForHop || [],
      nonce: Date.now(),
    });
    setSidebarOpen(false);
  };

  const handleTraversalNodeClick = (node) => {
    const result = traverseToNode(traversalPath, node.id, graphDataWithPredictions);
    setTraversalPath(result.path);
    setTraversalVisibleNodeIds(result.visibleNodeIds);
    setTraversalVisibleLinkIds(result.visibleLinkIds);
  };

  const handleTraversalBack = () => {
    const result = traverseBack(traversalPath, graphDataWithPredictions);
    setTraversalPath(result.path);
    setTraversalVisibleNodeIds(result.visibleNodeIds);
    setTraversalVisibleLinkIds(result.visibleLinkIds);
  };

  const handleTraversalReset = () => {
    const result = resetTraversal();
    setTraversalPath(result.path);
    setTraversalVisibleNodeIds(result.visibleNodeIds);
    setTraversalVisibleLinkIds(result.visibleLinkIds);
  };

  const handleTraversalToggle = () => {
    setExplorerModeActive(false);
    setTraversalModeActive((value) => {
      const next = !value;
      const result = resetTraversal();
      setTraversalPath(result.path);
      setTraversalVisibleNodeIds(result.visibleNodeIds);
      setTraversalVisibleLinkIds(result.visibleLinkIds);
      return next;
    });
  };

  const handleExplorerToggle = () => {
    setTraversalModeActive(false);
    setExplorerModeActive(v => {
      const next = !v;
      if (!next) setExpandedNodeIds(new Set());
      return next;
    });
  };

  const handleExplorerNodeClick = (node) => {
    if (!node?.id) return;
    setExpandedNodeIds(prev => toggleNodeExpansion(prev, String(node.id)));
  };

  const sharedGraphProps = {
    folderId,
    graphData: graphDataWithPredictions,
    nodeTypeFilters,
    relationshipTypeFilters,
    nodeTypeColors,
    relationshipTypeColors,
    minDegree,
    showOrphans,
    nodeSearch,
    searchResultIds,
    traversalModeActive,
    traversalPath,
    traversalGraphData,
    explorerModeActive,
    expandedNodeIds,
    explorerGraphData,
    showNodeLabels,
    showRelationshipLabels,
    jumpRequest,
    highlightedNodeIds,
    highlightedLinkIds,
    onTraversalToggle: handleTraversalToggle,
    onExplorerToggle: handleExplorerToggle,
    onExplorerNodeClick: handleExplorerNodeClick,
    onTraversalNodeClick: handleTraversalNodeClick,
    onTraversalBack: handleTraversalBack,
    onTraversalReset: handleTraversalReset,
    onToggleNodeLabels: () => setShowNodeLabels((value) => !value),
    onToggleRelationshipLabels: () => setShowRelationshipLabels((value) => !value),
    onJumpHandled: () => setJumpRequest(null),
    onStatsChange: setGraphStats,
    addNodeSignal,
    resetPinnedSignal,
    resetViewSignal,
    lockDraggedNodes,
    linkStyle,
    onToggleLinkStyle: () => setLinkStyle((v) => (v === 'curved' ? 'straight' : 'curved')),
    editMode,
    setEditMode,
    phantomNode,
    setPhantomNode,
    phantomLink,
    setPhantomLink,
    activeNode,
    setActiveNode,
    activeRelationship,
    setActiveRelationship,
    drawerOpen,
    setDrawerOpen,
  };

  const hydrationLabel = useMemo(() => {
    if (!folderId || hydrationStatus.totalSteps === 0) return '';
    if (hydrationStatus.active) {
      return `Loading graph ${Math.min(hydrationStatus.loadedSteps, hydrationStatus.totalSteps)}/${hydrationStatus.totalSteps}`;
    }
    if (hydrationStatus.complete) {
      return 'Graph loaded';
    }
    return '';
  }, [folderId, hydrationStatus]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative z-20 mx-4 mt-1 flex-shrink-0 overflow-visible">
        <Card variant="branded" className="app-surface overflow-visible border-border/60">
        <CardContent className="overflow-visible space-y-3 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 flex-1 xl:max-w-[58%]">
              <div className="min-w-0">
                <GraphViewsNavigation
                  sections={knowledgeGraphSections}
                  basePath="/graph"
                  toolsButton={(
                    <Button
                      variant="ghost"
                      size="sm"
                      className={[
                        'h-10 gap-2 rounded-full border px-4 text-xs font-bold uppercase tracking-[0.18em] transition',
                        toolsOpen
                          ? 'border-primary/30 bg-primary/12 text-primary shadow-sm'
                          : 'border-primary/18 bg-primary/4 text-primary/80 hover:bg-primary/8 hover:text-primary',
                      ].join(' ')}
                      type="button"
                      onClick={() => setToolsOpen((value) => !value)}
                      aria-label={toolsOpen ? 'Close tools' : 'Open tools'}
                      title={toolsOpen ? 'Close tools' : 'Open tools'}
                    >
                      <Compass className="h-4 w-4" />
                      Tools
                    </Button>
                  )}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 overflow-visible xl:self-end">
              <GlobalGraphSearch
                value={nodeSearch}
                onChange={setNodeSearch}
                results={jumpResults}
                onClear={() => setNodeSearch('')}
                onJumpToNode={(node) => {
                  handleJumpToNode(node);
                  setNodeSearch('');
                }}
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditMode(editMode === 'add-node' ? 'view' : 'add-node')}
                  className={[
                    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold tracking-tight transition-all duration-300",
                    editMode === 'add-node' 
                      ? "border-2 border-primary/40 bg-primary/12 text-primary ring-2 ring-primary/15 shadow-lg shadow-primary/10" 
                      : "bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:bg-primary/90 active:scale-95"
                  ].join(' ')}
                >
                  {editMode === 'add-node' ? '● Placing Node...' : '+ Add Node'}
                </button>
                {editMode === 'add-node' && (
                  <button
                    type="button"
                    onClick={() => setEditMode('view')}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 shadow-md active:scale-95"
                    title="Cancel placing node"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditMode(editMode === 'add-link' ? 'view' : 'add-link')}
                  className={[
                    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold tracking-tight transition-all duration-300",
                    editMode === 'add-link' 
                      ? "border-2 border-accent/40 bg-accent/12 text-accent ring-2 ring-accent/15 shadow-lg shadow-accent/10" 
                      : "bg-accent/90 text-white shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:bg-accent active:scale-95"
                  ].join(' ')}
                >
                  {editMode === 'add-link' ? '◌ Select Nodes...' : '⟷ Build Relationship'}
                </button>
                {editMode === 'add-link' && (
                  <button
                    type="button"
                    onClick={() => setEditMode('view')}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 shadow-md active:scale-95"
                    title="Cancel building relationship"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="hidden h-10 items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 text-xs text-muted-foreground md:flex">
                <span>{Number(graphStats.nodes || 0).toLocaleString()} nodes</span>
                <span className="text-border">•</span>
                <span>{Number(graphStats.links || 0).toLocaleString()} relationships</span>
                {hydrationLabel ? (
                  <>
                    <span className="text-border">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full',
                          hydrationStatus.active ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500',
                        ].join(' ')}
                      />
                      <span>{hydrationLabel}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          {nodeTypes.length ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {nodeTypes.slice(0, 8).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setNodeTypeFilters((prev) => {
                      const next = new Set(prev);
                      if (next.has(type)) {
                        next.delete(type);
                      } else {
                        next.add(type);
                      }
                      return next;
                    })
                  }
                  className={[
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                    nodeTypeFilters.has(type)
                      ? 'border-primary/35 bg-primary/16 text-primary'
                      : 'border-primary/20 bg-primary/8 text-primary/90 hover:bg-primary/12',
                  ].join(' ')}
                  title={nodeTypeFilters.has(type) ? `Remove ${type} filter` : `Filter by ${type}`}
                >
                  {type}
                </button>
              ))}
              {nodeTypes.length > 8 ? (
                <span className="text-[11px] font-medium text-muted-foreground">+{nodeTypes.length - 8} more</span>
              ) : null}
            </div>
          ) : null}

          {toolsOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[22px] border border-border/60 bg-card/95 px-3 py-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="flex flex-wrap items-center gap-2">
                {toolOptions.map((tool) => {
                  const Icon = tool.icon;
                  const isExplorer = tool.id === 'explorer';
                  const isTraversal = tool.id === 'traversal';
                  const active = isExplorer ? explorerModeActive : isTraversal ? traversalModeActive : (activePanel === tool.id && sidebarOpen);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      title={isExplorer ? "Progressive Cluster Expansion (Additive)" : isTraversal ? "Sequential Path Discovery" : undefined}
                      onClick={() => {
                        if (isExplorer) {
                          handleExplorerToggle();
                          setSidebarOpen(false);
                        } else if (isTraversal) {
                          handleTraversalToggle();
                          setSidebarOpen(false);
                        } else {
                          handleOpenToolPanel(tool.id);
                        }
                      }}
                    className={[
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition',
                        active
                          ? 'border-primary/35 bg-primary/10 text-primary shadow-sm'
                          : 'border-border/60 bg-card text-muted-foreground hover:bg-primary/5 hover:text-foreground',
                      ].join(' ')}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tool.label}
                      {tool.id === 'filters' && activeFilterCount > 0 ? (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <GraphToolbarControls
                showNodeLabels={showNodeLabels}
                onToggleNodeLabels={() => setShowNodeLabels((value) => !value)}
                showRelationshipLabels={showRelationshipLabels}
                onToggleRelationshipLabels={() => setShowRelationshipLabels((value) => !value)}
                lockDraggedNodes={lockDraggedNodes}
                onToggleLockDraggedNodes={() => setLockDraggedNodes((value) => !value)}
                linkStyle={linkStyle}
                onToggleLinkStyle={() => setLinkStyle((v) => (v === 'curved' ? 'straight' : 'curved'))}
                onResetPins={handleResetPins}
                onResetView={handleResetView}
              />
            </div>
          ) : null}
        </CardContent>
        </Card>

        <GraphWorkspaceSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          folderId={folderId}
          minDegree={minDegree}
          setMinDegree={setMinDegree}
          showOrphans={showOrphans}
          setShowOrphans={setShowOrphans}
          nodeTypes={nodeTypes}
          nodeTypeFilters={nodeTypeFilters}
          setNodeTypeFilters={setNodeTypeFilters}
          relationshipTypes={relationshipTypes}
          relationshipTypeFilters={relationshipTypeFilters}
          setRelationshipTypeFilters={setRelationshipTypeFilters}
          nodeTypeColors={nodeTypeColors}
          setNodeTypeColors={setNodeTypeColors}
          relationshipTypeColors={relationshipTypeColors}
          setRelationshipTypeColors={setRelationshipTypeColors}
          allNodes={graphDataWithPredictions.nodes || []}
          onClearAllFilters={handleClearAllFilters}
          onFindPath={handleFindPath}
          onOpenHopFinder={handleOpenHopFinder}
          pathLoading={pathLoading}
          pathError={pathError}
          pathSummary={pathSummary}
          onClearPath={handleClearPath}
          traversalModeActive={traversalModeActive}
          traversalPathNodes={traversalPathNodes}
          onTraversalToggle={handleTraversalToggle}
          onTraversalBack={handleTraversalBack}
          onTraversalReset={handleTraversalReset}
          activePanel={activePanel}
        />
      </div>

      {traversalModeActive ? (
        <div className="pointer-events-none absolute left-1/2 bottom-10 z-20 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card/92 px-3 py-2 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500">
            <button
              type="button"
              onClick={handleTraversalBack}
              disabled={traversalPathNodes.length === 0}
              className="rounded-xl px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-30"
            >
              Back
            </button>

            {traversalPathNames.length ? (
              <div className="flex max-w-[340px] items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-background/80 px-2 py-1 no-scrollbar">
                {traversalPathNames.map((name, index) => (
                  <React.Fragment key={`${traversalPath[index]}-${name}`}>
                    <span className={index === traversalPathNames.length - 1 ? 'whitespace-nowrap text-[11px] font-semibold text-primary' : 'whitespace-nowrap text-[11px] text-muted-foreground'}>
                      {name}
                    </span>
                    {index < traversalPathNames.length - 1 ? <ChevronRight className="h-3 w-3 flex-shrink-0 text-border" /> : null}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                Click a node to start traversal
              </div>
            )}

            <button
              type="button"
              onClick={handleTraversalReset}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      ) : null}



      <div className="relative mx-4 mb-3 mt-2 min-h-0 flex-1 overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
        <Routes>
          <Route index element={<Navigate to="2d" replace />} />
          <Route
            path="2d"
            element={
                          <Suspense fallback={<GraphViewLoader />}>
                            <GraphForcePage
                              {...sharedGraphProps}
                              displayGraphData={
                                traversalModeActive && traversalPath.length > 0 ? traversalGraphData :
                                explorerModeActive ? explorerGraphData : null
                              }
                            />
                          </Suspense>
            }
          />

          <Route
            path="3d"
            element={
              <Suspense fallback={<GraphViewLoader />}>
                <GraphForceGraph3DPage
                  {...sharedGraphProps}
                  displayGraphData={
                    traversalModeActive && traversalPath.length > 0 ? traversalGraphData : 
                    explorerModeActive ? explorerGraphData : null
                  }
                />
              </Suspense>
            }
          />
          <Route path="table" element={<GraphPropertyTablePage {...sharedGraphProps} />} />
          <Route path="*" element={<Navigate to="/graph/2d" replace />} />
        </Routes>
      </div>
    </div>
  );
}
