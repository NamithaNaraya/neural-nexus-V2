import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  drag as d3Drag,
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  select as d3Select,
  zoom as d3Zoom,
  forceCollide,
  pointer as d3Pointer,
} from 'd3';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { graphService } from '../../services/graphService';
import { GraphNodeCrudModal } from '../../components/crud';
import { filterGraphData } from './filterGraphData';
import { GRAPH_FETCH_STEPS, GRAPH_RENDER_LIMITS, sanitizeGraphForRender } from './graphDisplayData';
import { getNodeTypeColor, getRelationshipTypeColor, withAlpha } from './colorSystem';
import { GraphFocusDrawer } from './GraphFocusDrawer';
import { buildNodeFocusGraph, buildRelationshipFocusGraph } from './graphFocusUtils';
import { getLinkLabelPlacement } from './rendering/linkLabelLayout';
import { GraphInlineInput } from './GraphInlineInput';

function getNodeRadius(node) {
  const base = Math.max(1, Number(node?.size || node?.degree || 1));
  return Math.max(10, Math.min(18, 10 + Math.log2(base + 1) * 2.8));
}

/**
 * GraphForcePage (Unified): High-performance D3-driven Canvas visualization.
 * Replaces legacy 2D view with robust dragging, lazy loading, and premium particles.
 */
export default function GraphForcePage({
  folderId,
  graphData: graphDataProp = null,
  nodeTypeFilters,
  relationshipTypeFilters,
  nodeTypeColors = {},
  relationshipTypeColors = {},
  minDegree = 0,
  showOrphans = true,
  nodeSearch = '',
  searchResultIds = null,
  highlightedNodeIds = new Set(),
  highlightedLinkIds = new Set(),
  displayGraphData = null,
  traversalModeActive = false,
  traversalPath = [],
  explorerModeActive = false,
  onExplorerNodeClick = null,
  showNodeLabels = false,
  showRelationshipLabels = false,
  jumpRequest = null,
  onTraversalNodeClick = null,
  onJumpHandled = null,
  onStatsChange,
  addNodeSignal,
  resetPinnedSignal = 0,
  resetViewSignal = 0,
  lockDraggedNodes = true,
  editMode = 'view',
  setEditMode,
  phantomNode,
  setPhantomNode,
  phantomLink,
  setPhantomLink,
  activeNode: activeNodeProp,
  setActiveNode: setActiveNodeProp,
  activeRelationship: activeRelationshipProp,
  setActiveRelationship: setActiveRelationshipProp,
  drawerOpen,
  setDrawerOpen,
  linkStyle = 'curved',
  _traversalMode = false, // Compatibility for legacy usage
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomTransformRef = useRef({ x: 0, y: 0, k: 1 });
  const masterNodesRef = useRef(new Map()); // Stores persistent node objects with x,y,vx,vy
  const lastMousePos = useRef([0, 0]);
  const requestRenderRef = useRef(() => {}); // Persistent ref to the drawing function
  
  // Refs for visual toggles to avoid stale closures in d3 render loop
  const showNodeLabelsRef = useRef(showNodeLabels);
  const showRelationshipLabelsRef = useRef(showRelationshipLabels);
  const lockDraggedNodesRef = useRef(lockDraggedNodes);
  const explorerModeActiveRef = useRef(explorerModeActive);
  const traversalModeActiveRef = useRef(traversalModeActive);
  const onExplorerNodeClickRef = useRef(onExplorerNodeClick);
  const onTraversalNodeClickRef = useRef(onTraversalNodeClick);
  
  useEffect(() => {
    showNodeLabelsRef.current = showNodeLabels;
    showRelationshipLabelsRef.current = showRelationshipLabels;
    lockDraggedNodesRef.current = lockDraggedNodes;
    explorerModeActiveRef.current = explorerModeActive;
    traversalModeActiveRef.current = traversalModeActive;
    onExplorerNodeClickRef.current = onExplorerNodeClick;
    onTraversalNodeClickRef.current = onTraversalNodeClick;
    requestRenderRef.current();
  }, [showNodeLabels, showRelationshipLabels, lockDraggedNodes, explorerModeActive, traversalModeActive, onExplorerNodeClick, onTraversalNodeClick]);

  // Sync cursor position for rubber-band link
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const track = (e) => {
      lastMousePos.current = [e.offsetX, e.offsetY];
    };
    canvas.addEventListener('mousemove', track);
    return () => canvas.removeEventListener('mousemove', track);
  }, []);
  
  // State for Inspector & Data
  const [fullGraphData, setFullGraphData] = useState({ nodes: [], links: [] });
  const [focusedGraphData, setFocusedGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudMode, setCrudMode] = useState('create');
  const [activeNode, setActiveNode] = useState(null);
  const [focusType, setFocusType] = useState('');
  const [focusLabel, setFocusLabel] = useState('');
  const [activeRelationship, setActiveRelationship] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [expandDepth, setExpandDepth] = useState(1);
  const [expandRelationshipTypes, setExpandRelationshipTypes] = useState([]);
  const [draggingNode, setDraggingNode] = useState(null);
  const [hydrating, setHydrating] = useState(false);

  // Quick CRUD State
  const [inlineCreate, setInlineCreate] = useState(null); // { sourceNode, name, relType }
  const [linkDraft, setLinkDraft] = useState(null); // { sourceNode }
  const [savingInline, setSavingInline] = useState(false);
  const [transformState, setTransformState] = useState({ x: 0, y: 0, k: 1 });
  const phantomNodeRef = useRef(null);
  const phantomLinkRef = useRef(null);
  useEffect(() => {
    phantomNodeRef.current = phantomNode;
    phantomLinkRef.current = phantomLink;
  }, [phantomNode, phantomLink]);

  // Sync with folderId
  useEffect(() => {
    setFocusedGraphData(null);
    setFocusType('');
    setFocusLabel('');
    setActiveNode(null);
    setActiveRelationship(null);
    setInspectorOpen(false);
  }, [folderId]);

  // Loading Logic (Lazy/Initial)
  useEffect(() => {
    let cancelled = false;

    async function initGraph() {
      if (graphDataProp) {
        setFullGraphData(graphDataProp);
        setLoading(false);
        setHydrating(false);
        return;
      }

      if (!folderId) {
        setLoading(false);
        setHydrating(false);
        return;
      }

      setLoading(true);
      setHydrating(false);
      try {
        const [firstLimit, ...nextLimits] = GRAPH_FETCH_STEPS.canvas2d;
        const firstData = await graphService.getFolder(folderId, firstLimit);
        if (cancelled) return;

        setFullGraphData(firstData);
        setLoading(false);

        if (nextLimits.length) {
          setHydrating(true);
        }

        for (const limit of nextLimits) {
          const nextData = await graphService.getFolder(folderId, limit);
          if (cancelled) return;
          setFullGraphData(nextData);
        }
      } catch (err) {
        console.error('Failed to load unified graph data:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHydrating(false);
        }
      }
    }

    initGraph();
    return () => {
      cancelled = true;
    };
  }, [folderId, graphDataProp]);

  // Filtering & Capping
  const processedGraph = useMemo(() => {
    const rawData = (traversalModeActive || explorerModeActive) 
      ? (displayGraphData || { nodes: [], links: [] }) 
      : fullGraphData;
    const filtered = filterGraphData(rawData, {
      nodeTypeFilters,
      relationshipTypeFilters,
      minDegree,
      showOrphans,
      nodeSearch,
      searchResultIds,
    });
    return sanitizeGraphForRender(filtered, GRAPH_RENDER_LIMITS.canvas2d);
  }, [traversalModeActive, explorerModeActive, displayGraphData, graphDataProp, fullGraphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch, searchResultIds]);

  const allSimulationNodes = useMemo(() => {
    const nextNodeIds = new Set(processedGraph.nodes.map((node) => String(node.id)));
    masterNodesRef.current.forEach((_, id) => {
      if (!nextNodeIds.has(id)) {
        masterNodesRef.current.delete(id);
      }
    });

    return processedGraph.nodes.map((n) => {
      const id = String(n.id);
      if (masterNodesRef.current.has(id)) {
        const existing = masterNodesRef.current.get(id);
        Object.assign(existing, n);
        return existing;
      }
      const newNode = { ...n, id };
      masterNodesRef.current.set(id, newNode);
      return newNode;
    });
  }, [processedGraph.nodes]);

  const visibleNodeIds = useMemo(() => new Set(processedGraph.nodes.map(n => String(n.id))), [processedGraph.nodes]);
  const visibleLinkIds = useMemo(() => new Set(processedGraph.links.map(l => String(l.id))), [processedGraph.links]);

  const allSimulationLinks = useMemo(() => {
    const rawLinks = processedGraph.links.map(l => ({
      ...l,
      id: String(l.id),
      source: String(typeof l.source === 'object' ? l.source.id : l.source),
      target: String(typeof l.target === 'object' ? l.target.id : l.target),
    }));

    // BIDI DETECTION: Set opposing curvatures for bidirectional pairs
    const pairMap = new Map();
    rawLinks.forEach(link => {
        const id1 = String(link.source);
        const id2 = String(link.target);
        const pairId = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
        if (!pairMap.has(pairId)) pairMap.set(pairId, []);
        pairMap.get(pairId).push(link);
    });

    const isCurvedMode = linkStyle === 'curved';

    pairMap.forEach((links) => {
        if (links.length === 2 && links[0].source === links[1].target && links[0].target === links[1].source) {
            // BIDIRECTIONAL PAIR
            if (isCurvedMode) {
                // Organic curves bowing apart
                links[0].curvature = 0.18;
                links[1].curvature = -0.18;
                links[0].labelOffset = 0;
                links[1].labelOffset = 0;
            } else {
                // Single straight line with flanking labels (the custom bidi look)
                links[0].curvature = 0;
                links[1].curvature = 0;
                links[0].labelOffset = 9;
                links[1].labelOffset = -9;
            }
        } else if (links.length > 1) {
            // MULTIPLE LINKS: curved to separate
            links.forEach((link, i) => {
                const dir = i % 2 === 0 ? 1 : -1;
                const magnitude = isCurvedMode ? (0.15 + (Math.floor(i / 2) * 0.12)) : (0.2 + (Math.floor(i / 2) * 0.15));
                link.curvature = dir * magnitude;
                link.labelOffset = 0;
            });
        } else {
            // SOLITARY: 'Neat small curve' as requested
            links[0].curvature = isCurvedMode ? 0.12 : 0;
            links[0].labelOffset = 0;
        }
    });

    return rawLinks;
  }, [processedGraph.links, linkStyle]);

  const nodeLookup = useMemo(() => new Map(allSimulationNodes.map(n => [n.id, n])), [allSimulationNodes]);

  useEffect(() => {
    onStatsChange?.({ nodes: visibleNodeIds.size, links: visibleLinkIds.size });
  }, [visibleNodeIds.size, visibleLinkIds.size, onStatsChange]);

  // Neighborhood Expansion (Lazy Loading)
  const refreshNodeFocus = async (node) => {
    if (!node?.id) return;
    setFocusLoading(true);
    try {
      const expanded = await graphService.expandNode(node.id, {
        depth: expandDepth,
        relationshipTypes: expandRelationshipTypes,
      });
      setFocusedGraphData(buildNodeFocusGraph(fullGraphData, expanded, node));
    } catch (err) {
      console.error('Unified Graph: Failed to expand node:', err);
    } finally {
      setFocusLoading(false);
    }
  };

  const handleNodeClick = async (node) => {
    if (editMode === 'add-link') {
      // Two-click relationship creation: pick source, then pick target.
      if (!linkDraft?.sourceNode) {
        setLinkDraft({ sourceNode: node });
        const newLink = { source: node.id, target: '__cursor__', isPhantom: true };
        phantomLinkRef.current = newLink;
        setPhantomLink(newLink);
        setInlineCreate(null);
        setInspectorOpen(false);
        return;
      }

      const sourceNode = linkDraft.sourceNode;
      const targetNode = node;
      if (!sourceNode?.id || !targetNode?.id || String(sourceNode.id) === String(targetNode.id)) {
        return;
      }

      // Stop preview and open relationship editor.
      setLinkDraft(null);
      phantomLinkRef.current = null;
      setPhantomLink(null);
      setEditMode?.('view');

      const phantomRelationship = {
        id: null,
        isPhantom: true,
        source: sourceNode.id,
        target: targetNode.id,
        type: 'RELATIONSHIP',
        strength: '',
        properties: {},
      };
      setActiveRelationship(phantomRelationship);
      setActiveNode(null);
      setFocusType('relationship');
      setFocusLabel(`Create link: ${sourceNode.name || sourceNode.id} → ${targetNode.name || targetNode.id}`);
      setInspectorOpen(true);
      return;
    }

    if (explorerModeActiveRef.current && onExplorerNodeClickRef.current) {
      onExplorerNodeClickRef.current(node);
    }
    if (traversalModeActiveRef.current && onTraversalNodeClickRef.current) {
      onTraversalNodeClickRef.current(node);
    }

    setActiveNode(node);
    setActiveRelationship(null);
    setFocusType('node');
    setFocusLabel(node.name || node.id);
    
    // Only open inspector if not already in a special mode
    if (!inlineCreate) {
       setInspectorOpen(true);
       await refreshNodeFocus(node);
    }
  };

  const handleAddRelated = () => {
    // Use activeNode as the source if available
    const sourceNode = activeNode || quickMenuNode; // fallback
    if (!sourceNode) return;
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 120; // Slightly more distance for clarity
    
    // Batch updates to ensure simultaneous appearance
    const newPhantom = {
      id: 'phantom-new',
      x: sourceNode.x + Math.cos(angle) * dist,
      y: sourceNode.y + Math.sin(angle) * dist,
      isPhantom: true
    };
    const newLink = { source: sourceNode.id, target: 'phantom-new', isPhantom: true };
    
    // Set Refs instantly for the render loop
    phantomNodeRef.current = newPhantom;
    phantomLinkRef.current = newLink;
    
    setPhantomNode(newPhantom);
    setPhantomLink(newLink);
    setInlineCreate({
      sourceNode: sourceNode,
      name: '',
      relType: 'RELATIONSHIP'
    });
    
    const t = zoomTransformRef.current;
    setTransformState({ x: t.x, y: t.y, k: t.k });
    
    setInspectorOpen(false);
  };

  const handleGlobalAddNode = () => {
    const transform = zoomTransformRef.current;
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Center of screen in simulation coordinates
    const nx = (width / 2 - transform.x) / transform.k;
    const ny = (height / 2 - transform.y) / transform.k;
    
    const newPhantom = {
      id: 'phantom-new',
      x: nx,
      y: ny,
      isPhantom: true
    };
    
    // Instant sync for render loop
    phantomNodeRef.current = newPhantom;
    phantomLinkRef.current = null;
    
    setInlineCreate({ sourceNode: null, name: '', relType: '' });
    setPhantomNode(newPhantom);
    setPhantomLink(null);
    
    // Tell parent we've handled the signal
    if (editMode === 'add-node') setEditMode?.('view'); 
  };

  // Listen for global Add Node signal from parent components
  useEffect(() => {
    if (editMode === 'add-node' && !inlineCreate) {
      handleGlobalAddNode();
    }
  }, [editMode, inlineCreate]);

  // Cancel link draft if mode changes away from add-link
  useEffect(() => {
    if (editMode !== 'add-link' && linkDraft) {
      setLinkDraft(null);
      phantomLinkRef.current = null;
      setPhantomLink(null);
    }
  }, [editMode, linkDraft]);

  // ESC cancels inline create and link creation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;

      if (inlineCreate) {
        handleCancelInlineCreate();
      }

      if (editMode === 'add-link' || linkDraft) {
        setLinkDraft(null);
        phantomLinkRef.current = null;
        setPhantomLink(null);
        setEditMode?.('view');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editMode, inlineCreate, linkDraft]);

  const handleConfirmInlineCreate = async () => {
    if (!inlineCreate || !inlineCreate.name.trim()) return;
    setSavingInline(true);
    try {
      // 1. Create the node
      const nodeResult = await graphService.createNode({
        name: inlineCreate.name.trim(),
        type: 'Entity', // Default type
        folder_id: folderId,
        properties: { 
          is_manual: true,
          x: phantomNode.x,
          y: phantomNode.y
        }
      });

      if (nodeResult?.node?.id && inlineCreate.sourceNode) {
        // 2. Create the relationship
        await graphService.createRelationship({
          source_id: inlineCreate.sourceNode.id,
          target_id: nodeResult.node.id,
          type: inlineCreate.relType || 'RELATIONSHIP',
          folder_id: folderId
        });
      }

      // Success: Clear phantom and refresh
      setInlineCreate(null);
      setPhantomNode(null);
      setPhantomLink(null);
      // Graph will refresh via the CustomEvent emitted by graphService
    } catch (err) {
      console.error('Failed to create related node inline:', err);
    } finally {
      setSavingInline(false);
    }
  };

  const handleCancelInlineCreate = () => {
    setInlineCreate(null);
    setPhantomNode(null);
    setPhantomLink(null);
  };

  const handleRelationshipClick = (link) => {
    setActiveRelationship(link);
    setActiveNode(null);
    setFocusType('relationship');
    setFocusLabel(`${link.type || 'Relationship'} ${link.source?.name || link.source || ''} -> ${link.target?.name || link.target || ''}`);
    setInspectorOpen(true);
    setFocusedGraphData(buildRelationshipFocusGraph(fullGraphData, link));
  };

  const findLinkAt = (mouseX, mouseY) => {
    const transform = zoomTransformRef.current;
    const x = (mouseX - transform.x) / transform.k;
    const y = (mouseY - transform.y) / transform.k;

    const pointToSegDist = (px, py, ax, ay, bx, by) => {
      const abx = bx - ax;
      const aby = by - ay;
      const apx = px - ax;
      const apy = py - ay;
      const denom = abx * abx + aby * aby;
      if (denom === 0) return Math.hypot(px - ax, py - ay);
      let t = (apx * abx + apy * aby) / denom;
      t = Math.max(0, Math.min(1, t));
      const cx = ax + t * abx;
      const cy = ay + t * aby;
      return Math.hypot(px - cx, py - cy);
    };

    let best = null;
    let bestDist = Infinity;
    const threshold = 10 / Math.max(0.4, transform.k);

    for (const link of allSimulationLinks) {
      if (!visibleLinkIds.has(link.id)) continue;
      const s = link.source;
      const tNode = link.target;
      if (!s || !tNode) continue;

      const curvature = Number(link.curvature || 0);
      if (!curvature) {
        const d = pointToSegDist(x, y, s.x, s.y, tNode.x, tNode.y);
        if (d < bestDist) {
          bestDist = d;
          best = link;
        }
      } else {
        const dx = tNode.x - s.x;
        const dy = tNode.y - s.y;
        const length = Math.hypot(dx, dy) || 1;
        const normalX = -dy / length;
        const normalY = dx / length;
        const cp = {
          x: s.x + dx / 2 + normalX * (curvature * length),
          y: s.y + dy / 2 + normalY * (curvature * length),
        };

        let prev = { x: s.x, y: s.y };
        for (let i = 1; i <= 10; i++) {
          const tt = i / 10;
          const inv = 1 - tt;
          const qx = inv * inv * s.x + 2 * inv * tt * cp.x + tt * tt * tNode.x;
          const qy = inv * inv * s.y + 2 * inv * tt * cp.y + tt * tt * tNode.y;
          const d = pointToSegDist(x, y, prev.x, prev.y, qx, qy);
          if (d < bestDist) {
            bestDist = d;
            best = link;
          }
          prev = { x: qx, y: qy };
        }
      }
    }

    if (best && bestDist <= threshold) return best;
    return null;
  };

  // ─── D3 Physics & Canvas Rendering ─────────────────────────────
  
  const findNodeAt = (mouseX, mouseY) => {
    const transform = zoomTransformRef.current;
    const x = (mouseX - transform.x) / transform.k;
    const y = (mouseY - transform.y) / transform.k;
    
    // Check phantom node first (highest priority)
    if (phantomNode) {
      const dx = phantomNode.x - x;
      const dy = phantomNode.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) return phantomNode;
    }

    let closest = null;
    let minDistance = 22; 
    for (const node of allSimulationNodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        closest = node;
        minDistance = dist;
      }
    }
    return closest;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !allSimulationNodes.length) return;

    const ctx = canvas.getContext('2d');
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Auto-scale canvas for DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    if (!simulationRef.current) {
      simulationRef.current = forceSimulation()
        .force('link', forceLink().id(d => d.id).distance(110).strength(1.0))
        .force('charge', forceManyBody().strength(-200))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide((node) => getNodeRadius(node) + 16).iterations(2))
        .velocityDecay(0.24) // Slightly more friction to stabilize 3x speed
        .alphaDecay(0.022);
    }

    const simulation = simulationRef.current;
    
    // Only update data, don't restart simulation with high alpha if just filtering
    const isNewData = simulation.nodes().length === 0;
    simulation.nodes(allSimulationNodes);
    simulation.force('link').links(allSimulationLinks);
    
    if (isNewData) {
      simulation.alpha(0.6).restart();
    } else {
      // Very tiny nudge just to settle new connections if any, but NO jumping
      simulation.alpha(0.01).restart();
    }

    // Zoom
    const zoomBehavior = d3Zoom()
      .scaleExtent([0.1, 8])
      .filter((event) => {
        if (event.type === 'mousedown') {
           // If we're on a node, ignore the zoom/pan behavior start
           return !findNodeAt(event.offsetX, event.offsetY);
        }
        return !event.ctrlKey && !event.button; // Standard D3 zoom filter
      })
      .on('zoom', (event) => {
        zoomTransformRef.current = event.transform;
        setTransformState({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
        requestRender();
      });

    d3Select(canvas).call(zoomBehavior);

    const dragBehavior = d3Drag()
      .container(canvas)
      .subject((event) => {
        const [px, py] = d3Pointer(event.sourceEvent, canvas);
        return findNodeAt(px, py);
      })
      .on('start', (event) => {
        if (!event.subject) {
          // Clicked background - clear quick menu
          setQuickMenuNode(null);
          setQuickMenuPos(null);
          return;
        }
        if (!event.active) simulation.alphaTarget(0.7).restart();
        
        // Use initial pointer to set fx/fy to ensure no jump
        const [px, py] = d3Pointer(event.sourceEvent, canvas);
        const transform = zoomTransformRef.current;
        
        if (event.subject.isPhantom) {
          event.subject.x = (px - transform.x) / transform.k;
          event.subject.y = (py - transform.y) / transform.k;
        } else {
          event.subject.fx = (px - transform.x) / transform.k;
          event.subject.fy = (py - transform.y) / transform.k;
        }
        
        event.subject.__startDragX = px;
        event.subject.__startDragY = py;
        
        setDraggingNode(event.subject);
        canvas.style.cursor = 'grabbing';
      })
      .on('drag', (event) => {
        if (!event.subject) return;
        const transform = zoomTransformRef.current;
        const [px, py] = d3Pointer(event.sourceEvent, canvas);
        
        if (event.subject.isPhantom) {
          // Manual position update for phantom
          const nx = (px - transform.x) / transform.k;
          const ny = (py - transform.y) / transform.k;
          
          phantomNodeRef.current = { ...phantomNodeRef.current, x: nx, y: ny };
          setPhantomNode(prev => prev ? ({ ...prev, x: nx, y: ny }) : null);
        } else {
          event.subject.fx = (px - transform.x) / transform.k;
          event.subject.fy = (py - transform.y) / transform.k;
        }
        
        canvas.style.cursor = 'grabbing';
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        if (!event.subject) {
          setDraggingNode(null);
          canvas.style.cursor = 'default';
          return;
        }
        
        if (!lockDraggedNodes) {
          event.subject.fx = null;
          event.subject.fy = null;
          // Full power restart for instant snap-back
          simulation.alpha(1.0).restart();
        } else {
           // Ensure it stays fixed at exactly where it was dropped
           const transform = zoomTransformRef.current;
           const [px, py] = d3Pointer(event.sourceEvent, canvas);
           event.subject.fx = (px - transform.x) / transform.k;
           event.subject.fy = (py - transform.y) / transform.k;
        }
        
        setDraggingNode(null);
        canvas.style.cursor = 'default';
        
        // Click detection
        const [px, py] = d3Pointer(event.sourceEvent, canvas);
        const dx = px - (event.subject.__startDragX ?? px);
        const dy = py - (event.subject.__startDragY ?? py);
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          handleNodeClick(event.subject);
        }
      });

    d3Select(canvas).call(dragBehavior);

    // Hover Events
    const handleMouseOver = (event) => {
       if (draggingNode) return;
       const overNode = findNodeAt(event.offsetX, event.offsetY);
       canvas.style.cursor = overNode ? 'pointer' : 'default';
    };
    canvas.addEventListener('mousemove', handleMouseOver);
    
    const handleClick = (event) => {
      if (draggingNode) return;
      const overNode = findNodeAt(event.offsetX, event.offsetY);
      if (overNode) return;
      if (editMode === 'add-link') {
        if (linkDraft?.sourceNode) {
          // Background click cancels the draft if user changes mind.
          setLinkDraft(null);
          phantomLinkRef.current = null;
          setPhantomLink(null);
          setEditMode?.('view');
        }
        return;
      }
      const overLink = findLinkAt(event.offsetX, event.offsetY);
      if (overLink) {
        handleRelationshipClick(overLink);
      }
    };
    canvas.addEventListener('click', handleClick);

    // Drawing
    const requestRender = () => {
      window.requestAnimationFrame(() => {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        const t = zoomTransformRef.current;
        ctx.translate(t.x, t.y);
        ctx.scale(t.k, t.k);

        // 0. Draw Phantom Items (Preview)
        const pNode = phantomNodeRef.current;
        if (pNode) {
          ctx.save();
          ctx.globalAlpha = 0.95; // Higher visibility
          ctx.beginPath();
          const pRadius = getNodeRadius({ size: 3.5 }); 
          ctx.arc(pNode.x, pNode.y, pRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#334155'; // Dark Slate/Grey
          ctx.fill();
          ctx.strokeStyle = '#64748b'; // Slate border
          ctx.lineWidth = 2;
          ctx.setLineDash([]); 
          ctx.stroke();
          ctx.restore();
        }

        // Draw Phantom Link Label is now handled by HTML overlay to allow typing
        const pLink = phantomLinkRef.current;

        if (pLink && pLink.source && pLink.target) {
          const s = allSimulationNodes.find(n => n.id === pLink.source) || (pNode && pNode.id === pLink.source ? pNode : null);
          if (s) {
            let targetPos = null;
            if (pLink.target === '__cursor__') {
              const [mx, my] = lastMousePos.current;
              targetPos = {
                x: (mx - t.x) / t.k,
                y: (my - t.y) / t.k,
              };
            } else {
              const tNode = allSimulationNodes.find(n => n.id === pLink.target) || (pNode && pNode.id === pLink.target ? pNode : null);
              if (tNode) {
                targetPos = { x: tNode.x, y: tNode.y };
              }
            }

            if (targetPos) {
              ctx.save();
              ctx.globalAlpha = 0.6;
              ctx.beginPath();
              ctx.strokeStyle = '#475569'; // Dark Slate
              ctx.lineWidth = 1.5;
              ctx.setLineDash([2, 3]); // DOTTED look
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(targetPos.x, targetPos.y);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        const showDetails = t.k > 0.15 || explorerModeActiveRef.current;
        const showLabels = showDetails && showRelationshipLabelsRef.current;

        // 1. Draw Links
        allSimulationLinks.forEach(link => {
          if (!visibleLinkIds.has(link.id)) return;
          const isHighlighted = highlightedLinkIds.has(String(link.id));
          const isPredicted = Boolean(link.properties?.isPredicted);
          const baseColor = isPredicted ? '#ec4899' : getRelationshipTypeColor(link.type, relationshipTypeColors);
          
          const sx = link.source.x;
          const sy = link.source.y;
          const tx = link.target.x;
          const ty = link.target.y;
          const targetRadius = getNodeRadius(link.target);

          // Quadratic Curve Math
          const curvature = link.curvature || 0;
          const isCurved = curvature !== 0;
          const dx = tx - sx;
          const dy = ty - sy;
          const length = Math.hypot(dx, dy);
          const normalX = -dy / length;
          const normalY = dx / length;
          
          let cp = null;
          if (isCurved) {
            cp = {
              x: sx + dx / 2 + normalX * (curvature * length),
              y: sy + dy / 2 + normalY * (curvature * length)
            };
          }

          // Calculate arrow position (at node edge)
          // For curved lines, the angle is from the control point (or source) to the target center
          const angleAtTarget = isCurved 
            ? Math.atan2(ty - cp.y, tx - cp.x)
            : Math.atan2(dy, dx);
            
          const arrowX = tx - targetRadius * Math.cos(angleAtTarget);
          const arrowY = ty - targetRadius * Math.sin(angleAtTarget);

          ctx.beginPath();
          ctx.strokeStyle = withAlpha(baseColor, isHighlighted ? 'CC' : '44');
          ctx.lineWidth = isHighlighted ? 2.8 : 1.25;
          if (isPredicted) ctx.setLineDash([8, 4]);
          
          ctx.moveTo(sx, sy);
          if (isCurved) {
            ctx.quadraticCurveTo(cp.x, cp.y, arrowX, arrowY);
          } else {
            ctx.lineTo(arrowX, arrowY);
          }
          ctx.stroke();
          ctx.setLineDash([]);

    if (t.k > 1.3 || isHighlighted) {
      ctx.fillStyle = withAlpha(baseColor, isHighlighted ? 'CC' : '33');
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - 6.5 * Math.cos(angleAtTarget - Math.PI / 10),
        arrowY - 6.5 * Math.sin(angleAtTarget - Math.PI / 10)
      );
      ctx.lineTo(
        arrowX - 6.5 * Math.cos(angleAtTarget + Math.PI / 10),
        arrowY - 6.5 * Math.sin(angleAtTarget + Math.PI / 10)
      );
      ctx.closePath();
      ctx.fill();
    }
          
          // Label Placement (Corrected for parallel links)
          if (showLabels) {
            const placement = getLinkLabelPlacement(link, { x: sx, y: sy }, { x: tx, y: ty }, t.k);
            if (placement && (link.type || '').length > 0) {
              ctx.save();
              ctx.translate(placement.x, placement.y);
              ctx.rotate(placement.angle);
              const fontSize = Math.max(6.5, 7.5/t.k);
              ctx.font = `600 ${fontSize}px Inter, sans-serif`;
              ctx.fillStyle = '#475569';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Draw background pill
              const label = link.type || '';
              const tw = ctx.measureText(label).width;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
              ctx.beginPath();
              const padX = fontSize * 0.4;
              const padY = fontSize * 0.3;
              ctx.roundRect(-tw/2 - padX, -fontSize/2 - padY, tw + padX * 2, fontSize + padY * 2, fontSize * 0.4);
              ctx.fill();
              
              ctx.fillStyle = '#1e293b';
              ctx.fillText(label, 0, 0);
              ctx.restore();
            }
          }
        });

        // 2. Draw Particles ("Moving Balls")
        const time = Date.now() * 0.001;
        allSimulationLinks.forEach((link, idx) => {
          if (!visibleLinkIds.has(link.id)) return;
          
          const isPredicted = Boolean(link.properties?.isPredicted);
          const isHighlighted = highlightedLinkIds.has(String(link.id));
          if (isPredicted || isHighlighted) {
            const count = isPredicted ? 5 : 2;
            const speed = isPredicted ? 0.35 : 0.2;
            ctx.fillStyle = isPredicted ? '#ec4899' : '#64748b';
            
            const curvature = link.curvature || 0;
            const sx = link.source.x;
            const sy = link.source.y;
            const tx = link.target.x;
            const ty = link.target.y;
            
            for (let i = 0; i < count; i++) {
              const progress = (time * speed + (idx * 0.15) + (i / count)) % 1;
              
              let px, py;
              if (curvature !== 0) {
                 const dx = tx - sx;
                 const dy = ty - sy;
                 const length = Math.hypot(dx, dy);
                 const normalX = -dy / length;
                 const normalY = dx / length;
                 const cp = {
                   x: sx + dx / 2 + normalX * (curvature * length),
                   y: sy + dy / 2 + normalY * (curvature * length)
                 };
                 // Quadratic Bezier Formula
                 px = (1 - progress) * (1 - progress) * sx + 2 * (1 - progress) * progress * cp.x + progress * progress * tx;
                 py = (1 - progress) * (1 - progress) * sy + 2 * (1 - progress) * progress * cp.y + progress * progress * ty;
              } else {
                 px = sx + (tx - sx) * progress;
                 py = sy + (ty - sy) * progress;
              }
              
              ctx.beginPath();
              ctx.arc(px, py, isPredicted ? 2.4 : 1.8, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });

        // 3. Draw Nodes
        allSimulationNodes.forEach(node => {
          if (!visibleNodeIds.has(node.id)) return;
          
          const radius = getNodeRadius(node);
          const baseColor = getNodeTypeColor(node.type, nodeTypeColors);
          const isSelected = activeNode?.id === node.id;
          const isHighlighted = highlightedNodeIds.has(String(node.id));
          
          // Halo (Style parity with 2D)
          ctx.beginPath();
          ctx.fillStyle = withAlpha(baseColor, isHighlighted || isSelected ? '3D' : '15');
          ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
          ctx.fill();

          ctx.beginPath();
          ctx.fillStyle = baseColor;
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.beginPath();
          ctx.strokeStyle = withAlpha(baseColor, isHighlighted || isSelected ? 'FF' : 'AA');
          ctx.lineWidth = isHighlighted || isSelected ? 3 : 1.5;
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.stroke();

          // Labels
          if (showNodeLabelsRef.current || isSelected || isHighlighted) {
            const fontSize = Math.max(10, 11/t.k);
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            const text = node.name || node.id;
            const tw = ctx.measureText(text).width;
            
            // Draw background pill
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            const padX = fontSize * 0.4;
            const padY = fontSize * 0.2;
            const textY = node.y + radius + 6;
            ctx.roundRect(node.x - tw/2 - padX, textY - padY, tw + padX * 2, fontSize + padY * 2, fontSize * 0.3);
            ctx.fill();

            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(text, node.x, textY);
          }
        });

        ctx.restore();
      });
    };

    requestRenderRef.current = requestRender;
    
    simulation.on('tick', requestRender);

    // Initial render and recurring loop for particles
    let animationId;
    const loop = () => {
      // Overdrive: Advance the simulation multiple steps per visual frame
      if (simulation.alpha() > 0) {
        simulation.tick(3); // 3x speed-up
        requestRender();
      } else {
        requestRender(); // Static render for particles
      }
      animationId = window.requestAnimationFrame(loop);
    };
    animationId = window.requestAnimationFrame(loop);

    return () => {
      simulation.stop();
      window.cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseOver);
      canvas.removeEventListener('click', handleClick);
    };
  }, [allSimulationNodes, allSimulationLinks, visibleNodeIds, visibleLinkIds, highlightedNodeIds, highlightedLinkIds, showNodeLabels, showRelationshipLabels, activeNode, traversalModeActive, explorerModeActive, draggingNode, lockDraggedNodes, editMode, linkDraft]);

  // Handle Signal/Reset logic
  useEffect(() => {
    if (!resetPinnedSignal && !resetViewSignal) return;
    const simulation = simulationRef.current;
    if (simulation) {
      simulation.nodes().forEach(n => {
        n.fx = null;
        n.fy = null;
      });
      simulation.alpha(0.3).restart();
    }
  }, [resetPinnedSignal, resetViewSignal]);

  // Handle jump requests
  useEffect(() => {
    if (!jumpRequest?.nodeId || !nodeLookup.has(String(jumpRequest.nodeId))) return;
    const node = nodeLookup.get(String(jumpRequest.nodeId));
    handleNodeClick(node).then(() => {
      onJumpHandled?.();
    });
  }, [jumpRequest, nodeLookup, onJumpHandled]);

  // Compatibility useEffect for addNodeSignal
  useEffect(() => {
    if (!addNodeSignal) return;
    setCrudMode('create');
    setActiveNode(null);
    setCrudOpen(true);
    setInspectorOpen(false);
  }, [addNodeSignal]);

  // Handle graph responsiveness (window resizing)
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const simulation = simulationRef.current;
      if (simulation) {
        simulation.force('center', forceCenter(width / 2, height / 2));
        simulation.alpha(0.05).restart();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative h-full w-full flex-col overflow-hidden bg-background" ref={containerRef}>
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 font-medium text-muted-foreground">Synchronizing graph...</span>
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="h-full w-full"
          style={{ touchAction: 'none' }}
        />
      )}

      {!loading && hydrating ? (
        <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
          Loading more nodes in background...
        </div>
      ) : null}

      {editMode === 'add-link' ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
          <div className="pointer-events-none rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur-xl">
            {linkDraft?.sourceNode
              ? `Select target node • ESC to cancel`
              : `Select source node • ESC to cancel`}
          </div>
        </div>
      ) : null}

      {!loading && visibleNodeIds.size === 0 && (
         <div className="flex h-full items-center justify-center px-6">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/90 px-4 py-3 text-sm text-muted-foreground shadow-sm">
               <AlertCircle className="h-4 w-4 text-emerald-600" />
               <span>No nodes match the current filters.</span>
            </div>
         </div>
      )}

      {/* Unified Sidebar Tools */}
      {!_traversalMode && (
        <GraphFocusDrawer
          open={inspectorOpen}
          folderId={folderId}
          focusLabel={focusLabel}
          focusType={focusType}
          focusLoading={focusLoading}
          activeNode={activeNode}
          activeRelationship={activeRelationship}
          links={focusType === 'node' ? (focusedGraphData?.links || allSimulationLinks) : []}
          onClose={() => setInspectorOpen(false)}
          onClear={() => {
            setInspectorOpen(false);
            setActiveNode(null);
            setActiveRelationship(null);
          }}
          onEdit={() => {
            setCrudMode('edit');
            setCrudOpen(true);
          }}
          onSelectNode={(node) => {
            const fullNode = nodeLookup.get(String(node.id)) || node;
            handleNodeClick(fullNode);
          }}
          expandDepth={expandDepth}
          setExpandDepth={setExpandDepth}
          expandRelationshipTypes={expandRelationshipTypes}
          setExpandRelationshipTypes={setExpandRelationshipTypes}
          onExpandNode={() => refreshNodeFocus(activeNode)}
          expandLoading={focusLoading}
          onSelectLink={handleRelationshipClick}
          onAddRelated={handleAddRelated}
          onSuccess={() => {
            // Keep inspector open but force refresh of local focused graph where possible.
            if (focusType === 'node' && activeNode) {
              void refreshNodeFocus(activeNode);
            }
          }}
        />
      )}

      {!_traversalMode && (
        <GraphNodeCrudModal
          open={crudOpen}
          mode={crudMode}
          folderId={folderId}
          initialNode={activeNode}
          onClose={() => setCrudOpen(false)}
          onSuccess={() => {
            setCrudOpen(false);
            setLoading(true);
            graphService.getFolder(folderId, GRAPH_FETCH_STEPS.canvas2d.at(-1), { force: true }).then(data => {
              setFullGraphData(data);
              setLoading(false);
            });
          }}
        />
      )}

      {/* Quick CRUD UI */}
      <AnimatePresence>
        {inlineCreate && phantomNode && (
          <GraphInlineInput
            value={inlineCreate.name}
            onChange={(val) => setInlineCreate(prev => ({ ...prev, name: val }))}
            subValue={inlineCreate.relType}
            onSubChange={(val) => setInlineCreate(prev => ({ ...prev, relType: val }))}
            onConfirm={handleConfirmInlineCreate}
            onCancel={handleCancelInlineCreate}
            nodeAnchorPos={{
                x: phantomNode.x * transformState.k + transformState.x,
                y: phantomNode.y * transformState.k + transformState.y
            }}
            linkAnchorPos={(function() {
              const s = inlineCreate.sourceNode;
              if (!s) return null;
              const midX = (s.x + phantomNode.x) / 2;
              const midY = (s.y + phantomNode.y) / 2;
              return {
                x: midX * transformState.k + transformState.x,
                y: midY * transformState.k + transformState.y
              };
            })()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
