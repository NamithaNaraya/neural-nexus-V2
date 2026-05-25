import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';
import { graphService } from '../../services/graphService';
import { getNodeTypeColor, getRelationshipTypeColor, withAlpha } from './colorSystem';
import { GraphNodeCrudModal } from '../../components/crud';
import { GRAPH_FETCH_STEPS, GRAPH_RENDER_LIMITS, sanitizeGraphForRender } from './graphDisplayData';
import { GraphFocusDrawer } from './GraphFocusDrawer';
import { buildNodeFocusGraph, buildRelationshipFocusGraph } from './graphFocusUtils';

const spriteMaterialCache = new Map();

export default function GraphForceGraph3DPage({
  folderId,
  graphData = null,
  nodeTypeFilters,
  relationshipTypeFilters,
  nodeTypeColors,
  relationshipTypeColors,
  minDegree,
  showOrphans,
  nodeSearch,
  searchResultIds = null,
  jumpRequest = null,
  highlightedNodeIds = new Set(),
  highlightedLinkIds = new Set(),
  displayGraphData = null,
  traversalModeActive = false,
  onTraversalToggle = null,
  onTraversalNodeClick = null,
  onTraversalBack = null,
  onTraversalReset = null,
  traversalPath = [],
  explorerModeActive = false,
  onExplorerNodeClick = null,
  showNodeLabels = false,
  showRelationshipLabels = false,
  onToggleNodeLabels = null,
  onToggleRelationshipLabels = null,
  onJumpHandled = null,
  onStatsChange,
  addNodeSignal,
  resetPinnedSignal = 0,
  resetViewSignal = 0,
  lockDraggedNodes = true,
  graphDataOverride = null,
  disableRemoteLoad = false,
  _traversalMode = false,
  _onNodeClick = null,
}) {
  const [fullGraphData, setFullGraphData] = useState({ nodes: [], links: [] });
  const [focusedGraphData, setFocusedGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState('create');
  const [activeNode, setActiveNode] = useState(null);
  const [focusType, setFocusType] = useState('');
  const [focusLabel, setFocusLabel] = useState('');
  const [activeRelationship, setActiveRelationship] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [expandDepth, setExpandDepth] = useState(1);
  const [expandRelationshipTypes, setExpandRelationshipTypes] = useState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [hydrating, setHydrating] = useState(false);
  const forceRefreshRef = useRef(false);
  const graphRef = useRef(null);
  const didAutoFitRef = useRef(false);
  const mergeGraphData = (base, incoming) => {
    const baseNodes = Array.isArray(base?.nodes) ? base.nodes : [];
    const incomingNodes = Array.isArray(incoming?.nodes) ? incoming.nodes : [];
    const baseLinks = Array.isArray(base?.links) ? base.links : [];
    const incomingLinks = Array.isArray(incoming?.links) ? incoming.links : [];

    const nodeMap = new Map();
    for (const node of baseNodes) nodeMap.set(String(node.id), node);
    for (const node of incomingNodes) nodeMap.set(String(node.id), { ...(nodeMap.get(String(node.id)) || {}), ...node });

    const linkMap = new Map();
    const linkKey = (link) => {
      const src = String(typeof link.source === 'object' ? link.source?.id : link.source);
      const dst = String(typeof link.target === 'object' ? link.target?.id : link.target);
      return String(link.id || `${src}->${dst}:${link.type || 'RELATIONSHIP'}`);
    };
    for (const link of baseLinks) linkMap.set(linkKey(link), link);
    for (const link of incomingLinks) linkMap.set(linkKey(link), { ...(linkMap.get(linkKey(link)) || {}), ...link });

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values()),
    };
  };

  const filterLinksForKnownNodes = (links, knownNodeIds) =>
    (Array.isArray(links) ? links : []).filter((link) => {
      const sourceId = String(typeof link.source === 'object' ? link.source?.id : link.source);
      const targetId = String(typeof link.target === 'object' ? link.target?.id : link.target);
      return knownNodeIds.has(sourceId) && knownNodeIds.has(targetId);
    });

  useEffect(() => {
    setFocusedGraphData(null);
    setFocusType('');
    setFocusLabel('');
    setActiveNode(null);
    setActiveRelationship(null);
    setInspectorOpen(false);
    didAutoFitRef.current = false;
  }, [folderId]);

  useEffect(() => {
    const handleCrud = () => {
      forceRefreshRef.current = true;
      setRefreshToken((value) => value + 1);
    };

    window.addEventListener('nnv2:graph-crud', handleCrud);
    let cancelled = false;

    async function loadGraph() {
      if (graphData || disableRemoteLoad) {
        setLoading(false);
        setHydrating(false);
        setError(null);
        setFullGraphData(graphData || graphDataOverride || { nodes: [], links: [] });
        setFocusedGraphData(null);
        forceRefreshRef.current = false;
        return;
      }

      if (!folderId) {
        setLoading(false);
        setHydrating(false);
        setFullGraphData({ nodes: [], links: [] });
        setFocusedGraphData(null);
        return;
      }

      setLoading(true);
      setHydrating(false);
      setError(null);
      try {
        const [firstLimit, ...nextLimits] = GRAPH_FETCH_STEPS.force3d;
        const firstData = await graphService.getFolder(folderId, firstLimit, { force: forceRefreshRef.current, offset: 0 });
        if (cancelled) return;

        setFullGraphData(firstData || { nodes: [], links: [] });
        setFocusedGraphData(null);

        setLoading(false);

        if (nextLimits.length) {
          setHydrating(true);
        }

        let loadedCount = Array.isArray(firstData?.nodes) ? firstData.nodes.length : 0;
        let previousStep = firstLimit;
        for (const stepLimit of nextLimits) {
          if (cancelled) return;
          const pageSize = Math.max(0, stepLimit - previousStep);
          previousStep = stepLimit;
          if (pageSize <= 0) continue;
          const pageData = await graphService.getFolder(folderId, pageSize, {
            force: forceRefreshRef.current,
            offset: loadedCount,
          });
          if (cancelled) return;

          const pageNodes = Array.isArray(pageData?.nodes) ? pageData.nodes : [];
          const pageLinks = Array.isArray(pageData?.links) ? pageData.links : [];
          if (!pageNodes.length) break;

          setFullGraphData((prev) => {
            const merged = mergeGraphData(prev, { nodes: pageNodes, links: [] });
            const knownNodeIds = new Set((merged.nodes || []).map((n) => String(n.id)));
            return mergeGraphData(merged, { nodes: [], links: filterLinksForKnownNodes(pageLinks, knownNodeIds) });
          });

          loadedCount += pageNodes.length;
        }

        setTimeout(() => {
          graphRef.current?.zoomToFit(460, 220);
        }, 220);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load graph data.');
      } finally {
        forceRefreshRef.current = false;
        if (!cancelled) {
          setLoading(false);
          setHydrating(false);
        }
      }
    }

    loadGraph();
    return () => {
      cancelled = true;
      window.removeEventListener('nnv2:graph-crud', handleCrud);
    };
  }, [folderId, refreshToken, graphData, graphDataOverride, disableRemoteLoad]);

  useEffect(() => {
    if (!addNodeSignal) return;
    setCrudMode('create');
    setActiveNode(null);
    setCrudOpen(true);
    setInspectorOpen(false);
  }, [addNodeSignal]);

  const activeGraphData = (traversalModeActive || explorerModeActive)
    ? displayGraphData || graphData || graphDataOverride || fullGraphData
    : fullGraphData;

  const nodeTypes = useMemo(
    () => [...new Set(activeGraphData.nodes.map((node) => node.type || 'Unknown'))].sort(),
    [activeGraphData.nodes]
  );

  const relationshipTypes = useMemo(
    () => [...new Set(activeGraphData.links.map((link) => link.type || 'Unknown'))].sort(),
    [activeGraphData.links]
  );

  const filteredGraph = useMemo(() => {
    const selectedNodeTypes = nodeTypeFilters.size ? nodeTypeFilters : new Set(nodeTypes);

    const nodes = activeGraphData.nodes.filter((node) => {
      const type = node.type || 'Unknown';
      if (!selectedNodeTypes.has(type)) return false;
      if (!showOrphans && (node.degree ?? 0) === 0) return false;
      if ((node.degree ?? 0) < minDegree) return false;
      if (nodeSearch.trim()) {
        const query = nodeSearch.trim().toLowerCase();
        const inServerResults = searchResultIds instanceof Set && searchResultIds.size > 0
          ? searchResultIds.has(String(node.id))
          : null;
        if (inServerResults !== null) return inServerResults;
        if (!(node.name || '').toLowerCase().includes(query)) return false;
      }
      return true;
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const selectedRelTypes = relationshipTypeFilters.size ? relationshipTypeFilters : new Set(relationshipTypes);

    const links = activeGraphData.links
      .filter((link) => {
        const type = link.type || 'Unknown';
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        if (!selectedRelTypes.has(type)) return false;
        if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
        return true;
      })
      .map((link) => ({
        ...link,
        color: getRelationshipTypeColor(link.type || 'Unknown', relationshipTypeColors),
      }));

    const enrichedNodes = nodes.map((node) => ({
      ...node,
      color: getNodeTypeColor(node.type || 'Unknown', nodeTypeColors),
    }));

    return { nodes: enrichedNodes, links };
  }, [
    activeGraphData,
    nodeTypes,
    relationshipTypes,
    nodeTypeFilters,
    relationshipTypeFilters,
    nodeTypeColors,
    relationshipTypeColors,
    minDegree,
    showOrphans,
    nodeSearch,
    searchResultIds,
  ]);

  const renderedGraph = useMemo(
    () => sanitizeGraphForRender(filteredGraph, GRAPH_RENDER_LIMITS.force3d),
    [filteredGraph]
  );
  useEffect(() => {
    onStatsChange?.({
      nodes: filteredGraph.nodes.length,
      links: filteredGraph.links.length,
    });
  }, [filteredGraph.nodes.length, filteredGraph.links.length, onStatsChange]);

  const openNodeEditor = () => {
    if (!activeNode) return;
    setCrudMode('edit');
    setCrudOpen(true);
  };

  const refreshNodeFocus = async (node) => {
    if (!node?.id) return;
    setFocusLoading(true);
    try {
      const expanded = await graphService.expandNode(node.id, {
        depth: expandDepth,
        relationshipTypes: expandRelationshipTypes,
        force: true,
      });
      setFocusedGraphData(buildNodeFocusGraph(fullGraphData, expanded, node));
    } catch (err) {
      console.error('Failed to refresh focused node:', err);
      setFocusedGraphData(buildNodeFocusGraph(fullGraphData, { nodes: [node], links: [] }, node));
    } finally {
      setFocusLoading(false);
    }
  };

  const handleNodeClick = async (node) => {
    if (explorerModeActive && onExplorerNodeClick) {
      onExplorerNodeClick(node);
      return;
    }
    if (traversalModeActive && onTraversalNodeClick) {
      onTraversalNodeClick(node);
      setActiveNode(node);
      setActiveRelationship(null);
      setFocusType('node');
      setFocusLabel(node.name || node.id);
      setInspectorOpen(true);
      setCrudOpen(false);
      return;
    }

    setActiveNode(node);
    setActiveRelationship(null);
    setFocusType('node');
    setFocusLabel(node.name || node.id);
    setInspectorOpen(true);
    setCrudOpen(false);
    await refreshNodeFocus(node);
  };

  const handleNodeSelectFromDrawer = async (node) => {
    if (!node?.id) return;
    const nextNode = fullGraphData.nodes.find((item) => String(item.id) === String(node.id)) || node;
    await handleNodeClick(nextNode);
  };

  const handleRelationshipClick = (link) => {
    setActiveRelationship(link);
    setActiveNode(null);
    setFocusType('relationship');
    setFocusLabel(`${link.type || 'Relationship'} ${link.source?.name || link.source || ''} -> ${link.target?.name || link.target || ''}`);
    setInspectorOpen(true);
    setCrudOpen(false);
    setFocusedGraphData(buildRelationshipFocusGraph(fullGraphData, link));
  };

  const clearFocus = () => {
    setFocusedGraphData(null);
    setFocusType('');
    setFocusLabel('');
    setActiveNode(null);
    setActiveRelationship(null);
    setInspectorOpen(false);
  };

  const handleNodeDragEnd = (node) => {
    if (!node) return;
    setDraggingNodeId(null);
    if (lockDraggedNodes) {
      node.fx = node.x;
      node.fy = node.y;
      node.fz = node.z;
      return;
    }
    node.fx = undefined;
    node.fy = undefined;
    node.fz = undefined;
  };

  useEffect(() => {
    const current = graphRef.current?.graphData?.();
    current?.nodes?.forEach((node) => {
      node.fx = undefined;
      node.fy = undefined;
      node.fz = undefined;
    });
    setTimeout(() => {
      graphRef.current?.zoomToFit?.(460, 220);
    }, 80);
  }, [resetPinnedSignal, resetViewSignal]);

  useEffect(() => {
    if (!jumpRequest?.nodeId) return;
    const nextNode = fullGraphData.nodes.find((node) => String(node.id) === String(jumpRequest.nodeId));
    if (!nextNode) {
      onJumpHandled?.();
      return;
    }

    if (jumpRequest.depth || (jumpRequest.relationshipTypes && jumpRequest.relationshipTypes.length)) {
      setExpandDepth(jumpRequest.depth || 1);
      setExpandRelationshipTypes(jumpRequest.relationshipTypes || []);
    }

    handleNodeClick(nextNode).finally(() => {
      onJumpHandled?.();
    });
  }, [jumpRequest, fullGraphData, onJumpHandled]);

  const hasPathHighlights = highlightedNodeIds.size > 0 || highlightedLinkIds.size > 0;

  useEffect(() => {
    if (!hasPathHighlights) return;
    setTimeout(() => {
      graphRef.current?.zoomToFit(560, 140);
    }, 140);
  }, [hasPathHighlights, highlightedNodeIds, highlightedLinkIds]);

  useEffect(() => {
    const graphInstance = graphRef.current;
    if (!graphInstance) return;

    const controls = graphInstance.controls?.();
    if (controls) {
      controls.minDistance = 18;
      controls.maxDistance = 6000;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.9;
    }

    if (!renderedGraph.nodes.length) return;
    graphInstance.d3ReheatSimulation?.();
    if (didAutoFitRef.current) return;
    didAutoFitRef.current = true;
    const timeout = setTimeout(() => {
      graphInstance.zoomToFit?.(520, 110);
    }, 120);

    return () => clearTimeout(timeout);
  }, [renderedGraph.nodes.length, renderedGraph.links.length]);

  useEffect(() => {
    const domElement = graphRef.current?.renderer?.()?.domElement;
    if (!domElement) return;
    domElement.style.cursor = 'pointer';
  }, [draggingNodeId, renderedGraph.nodes.length]);

  const createTextSprite = (text, color = '#1e293b', bgColor = 'rgba(255, 255, 255, 0.9)') => {
    if (!text) return null;
    const cacheKey = `${text}_${color}_${bgColor}`;

    if (!spriteMaterialCache.has(cacheKey)) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      const fontSize = 40;
      context.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      const paddingX = 20;
      const paddingY = 12;
      const metrics = context.measureText(text);
      canvas.width = Math.ceil(metrics.width + paddingX * 2);
      canvas.height = Math.ceil(fontSize + paddingY * 2);

      // Draw background pill
      context.fillStyle = bgColor;
      context.beginPath();
      context.roundRect(0, 0, canvas.width, canvas.height, 20);
      context.fill();

      context.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true, 
        depthWrite: true,
        depthTest: true 
      });
      
      spriteMaterialCache.set(cacheKey, { material, aspectRatio: canvas.width / canvas.height });
    }

    const { material, aspectRatio } = spriteMaterialCache.get(cacheKey);
    const sprite = new THREE.Sprite(material);
    // Base scale for better visibility at a distance
    sprite.scale.set(aspectRatio * 14, 14, 1); 
    sprite.center.set(0.5, 0.5);
    return sprite;
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[26px] border border-border/60 bg-background">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          {loading || focusLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">{focusLoading ? 'Loading neighborhood...' : 'Loading 3D graph...'}</span>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-red-500">{error}</div>
          ) : (
            <div className="absolute inset-0">
              <ForceGraph3D
                ref={graphRef}
                graphData={renderedGraph}
                backgroundColor="rgba(0,0,0,0)"
                enableNodeDrag
                enableNavigationControls={!hoveredNodeId && !draggingNodeId}
                nodeColor={(node) => {
                  const isHighlighted = highlightedNodeIds.has(String(node.id));
                  if (!hasPathHighlights) return node.color;
                  return isHighlighted ? node.color : '#475569';
                }}
                nodeOpacity={0.95}
                nodeVal={(node) => {
                  const base = Math.max(2, Number(node.size || node.degree || 1) * 1.6);
                  const normalized = 2 + Math.log2(base + 1) * 0.9;
                  return highlightedNodeIds.has(String(node.id)) ? normalized * 1.12 : normalized;
                }}
                nodeResolution={10}
                nodeLabel={() => ''}
                nodeThreeObject={(node) => {
                  if (!showNodeLabels) return undefined;
                  const sprite = createTextSprite(node.name || node.id, '#334155');
                  if (sprite) {
                    // Constant scale + small degree boost for better visibility
                    const scaleFactor = 1.0 + Math.log2(Number(node.size || node.degree || 1) + 1) * 0.15;
                    sprite.scale.multiplyScalar(scaleFactor);
                    // Position label slightly above the node
                    const radius = Math.max(2, Number(node.size || node.degree || 1) * 1.6);
                    sprite.position.set(0, radius + 14, 0);
                  }
                  return sprite || undefined;
                }}
                nodeThreeObjectExtend={showNodeLabels}
                linkColor={(link) => {
                  const isPredicted = Boolean(link.properties?.isPredicted);
                  const isHighlighted = highlightedLinkIds.has(String(link.id));
                  if (isPredicted) return link.color || '#ec4899';
                  if (!hasPathHighlights) return withAlpha(link.color || '#94A3B8', '72');
                  return isHighlighted ? (link.color || '#94A3B8') : '#475569';
                }}
                linkOpacity={0.28}
                linkWidth={(link) => {
                  if (link.properties?.isPredicted) return 2.4;
                  return highlightedLinkIds.has(String(link.id)) ? 2.1 : (link.type ? 0.9 : 0.65);
                }}
                linkDirectionalParticles={(link) => {
                  if (link.properties?.isPredicted) return 8;
                  return highlightedLinkIds.has(String(link.id)) ? 3 : 1;
                }}
                linkDirectionalParticleColor={(link) => link.properties?.isPredicted ? '#ec4899' : link.color}
                linkDirectionalParticleWidth={(link) => (link.properties?.isPredicted ? 3 : 2)}
                linkDirectionalParticleSpeed={(link) => (link.properties?.isPredicted ? 0.0065 : 0.0045)}
                linkDirectionalArrowLength={5}
                linkDirectionalArrowRelPos={1}
                linkDirectionalArrowColor={(link) => link.properties?.isPredicted ? '#ec4899' : (link.color || '#64748B')}
                linkThreeObject={(link) => {
                  if (!showRelationshipLabels) return undefined;
                  const sprite = createTextSprite(link.type || '', '#475569', 'rgba(255, 255, 255, 0.82)');
                  if (sprite) {
                    sprite.scale.multiplyScalar(0.7); // Relationship labels slightly smaller than node labels
                  }
                  return sprite || undefined;
                }}
                linkThreeObjectExtend={showRelationshipLabels}
                linkPositionUpdate={(sprite, { start, end }) => {
                  if (!sprite || !start || !end) return;
                  sprite.position.set(
                    start.x + (end.x - start.x) * 0.5,
                    start.y + (end.y - start.y) * 0.5,
                    start.z + (end.z - start.z) * 0.5
                  );
                }}
                onNodeClick={handleNodeClick}
                onNodeHover={(node) => {
                  setHoveredNodeId(node?.id ?? null);
                  const domElement = graphRef.current?.renderer?.()?.domElement;
                  if (!domElement) return;
                  domElement.style.cursor = 'pointer';
                }}
                onNodeDrag={(node) => {
                  if (!node) return;
                  setDraggingNodeId(node.id);
                  const domElement = graphRef.current?.renderer?.()?.domElement;
                  if (domElement) domElement.style.cursor = 'pointer';
                }}
                onNodeDragEnd={handleNodeDragEnd}
                onLinkClick={handleRelationshipClick}
                width={undefined}
                height={undefined}
              />
            </div>
          )}

          {!loading && hydrating ? (
            <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
              Loading more nodes in background...
            </div>
          ) : null}
        </div>

        {!_traversalMode && (
          <GraphFocusDrawer
            open={inspectorOpen && Boolean(focusLabel || activeNode || activeRelationship)}
            folderId={folderId}
            focusLabel={focusLabel}
            focusType={focusType}
            focusLoading={focusLoading}
            activeNode={activeNode}
            activeRelationship={activeRelationship}
            links={focusType === 'node' ? (focusedGraphData?.links || renderedGraph.links) : []}
            onClose={() => setInspectorOpen(false)}
            onClear={clearFocus}
            onEdit={activeNode ? openNodeEditor : null}
            onSelectNode={handleNodeSelectFromDrawer}
            relationshipTypeOptions={relationshipTypes}
            expandDepth={expandDepth}
            setExpandDepth={setExpandDepth}
            expandRelationshipTypes={expandRelationshipTypes}
            setExpandRelationshipTypes={setExpandRelationshipTypes}
            onExpandNode={activeNode ? () => refreshNodeFocus(activeNode) : null}
            expandLoading={focusLoading}
            onSelectLink={(link) => {
              setActiveRelationship(link);
              setActiveNode(null);
              setFocusType('relationship');
              setFocusLabel(`${link.type || 'Relationship'} ${link.source?.name || link.source || ''} -> ${link.target?.name || link.target || ''}`);
              setFocusedGraphData(buildRelationshipFocusGraph(fullGraphData, link));
              setInspectorOpen(true);
            }}
          />
        )}
      </div>

      {!_traversalMode && (
        <GraphNodeCrudModal
          open={crudOpen}
          mode={crudMode}
          folderId={folderId}
          initialNode={activeNode}
          onClose={() => setCrudOpen(false)}
          onSuccess={() => setRefreshToken((value) => value + 1)}
        />
      )}
    </div>
  );
}
