import { createSlice } from '@reduxjs/toolkit';

/**
 * Graph Slice — Centralizes all graph visualization state previously
 * scattered across 30+ useState calls in GraphPage.jsx.
 *
 * Sections:
 *  1. Data & hydration
 *  2. Filters
 *  3. Colors
 *  4. UI toggles
 *  5. Traversal / Explorer modes
 *  6. Path highlighting
 *  7. Editing (CRUD inline)
 */
const initialState = {
  // 1. Data
  graphData: { nodes: [], links: [] },
  graphStats: { nodes: 0, links: 0 },
  hydrationStatus: { active: false, loadedSteps: 0, totalSteps: 0, complete: false },
  refreshToken: 0,

  // 2. Filters
  nodeSearch: '',
  minDegree: 0,
  showOrphans: true,
  nodeTypeFilters: [],   // Array of strings (serializable, converted to Set in selectors)
  relationshipTypeFilters: [],

  // 3. Colors
  nodeTypeColors: {},
  relationshipTypeColors: {},

  // 4. UI toggles
  sidebarOpen: false,
  toolsOpen: false,
  activePanel: 'filters',
  showNodeLabels: false,
  showRelationshipLabels: false,
  lockDraggedNodes: true,
  linkStyle: 'curved',

  // 5. Traversal / Explorer
  traversalModeActive: false,
  traversalPath: [],
  traversalVisibleNodeIds: [],
  traversalVisibleLinkIds: [],
  explorerModeActive: false,
  expandedNodeIds: [],

  // 6. Path highlighting
  highlightedNodeIds: [],
  highlightedLinkIds: [],
  pathLoading: false,
  pathError: '',
  pathSummary: null,

  // 7. Editing
  editMode: 'view',        // 'view', 'add-node', 'add-link'
  activeNode: null,
  activeRelationship: null,
  drawerOpen: false,

  // Signals (incrementing counters to trigger effects)
  addNodeSignal: 0,
  resetPinnedSignal: 0,
  resetViewSignal: 0,
  jumpRequest: null,
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    // --- Data ---
    setGraphData(state, action) {
      state.graphData = action.payload;
    },
    setGraphStats(state, action) {
      state.graphStats = action.payload;
    },
    setHydrationStatus(state, action) {
      state.hydrationStatus = { ...state.hydrationStatus, ...action.payload };
    },
    triggerRefresh(state) {
      state.refreshToken += 1;
    },

    // --- Filters ---
    setNodeSearch(state, action) {
      state.nodeSearch = action.payload;
    },
    setMinDegree(state, action) {
      state.minDegree = action.payload;
    },
    setShowOrphans(state, action) {
      state.showOrphans = action.payload;
    },
    toggleNodeTypeFilter(state, action) {
      const type = action.payload;
      const idx = state.nodeTypeFilters.indexOf(type);
      if (idx >= 0) {
        state.nodeTypeFilters.splice(idx, 1);
      } else {
        state.nodeTypeFilters.push(type);
      }
    },
    setNodeTypeFilters(state, action) {
      state.nodeTypeFilters = action.payload;
    },
    toggleRelationshipTypeFilter(state, action) {
      const type = action.payload;
      const idx = state.relationshipTypeFilters.indexOf(type);
      if (idx >= 0) {
        state.relationshipTypeFilters.splice(idx, 1);
      } else {
        state.relationshipTypeFilters.push(type);
      }
    },
    setRelationshipTypeFilters(state, action) {
      state.relationshipTypeFilters = action.payload;
    },
    clearAllFilters(state) {
      state.minDegree = 0;
      state.showOrphans = true;
      state.nodeTypeFilters = [];
      state.relationshipTypeFilters = [];
    },

    // --- Colors ---
    setNodeTypeColors(state, action) {
      state.nodeTypeColors = action.payload;
    },
    setRelationshipTypeColors(state, action) {
      state.relationshipTypeColors = action.payload;
    },

    // --- UI ---
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setToolsOpen(state, action) {
      state.toolsOpen = action.payload;
    },
    toggleToolsOpen(state) {
      state.toolsOpen = !state.toolsOpen;
    },
    setActivePanel(state, action) {
      state.activePanel = action.payload;
    },
    openToolPanel(state, action) {
      state.activePanel = action.payload;
      state.sidebarOpen = true;
    },
    toggleShowNodeLabels(state) {
      state.showNodeLabels = !state.showNodeLabels;
    },
    toggleShowRelationshipLabels(state) {
      state.showRelationshipLabels = !state.showRelationshipLabels;
    },
    setShowNodeLabels(state, action) {
      state.showNodeLabels = action.payload;
    },
    toggleLockDraggedNodes(state) {
      state.lockDraggedNodes = !state.lockDraggedNodes;
    },
    toggleLinkStyle(state) {
      state.linkStyle = state.linkStyle === 'curved' ? 'straight' : 'curved';
    },

    // --- Traversal ---
    setTraversalModeActive(state, action) {
      state.traversalModeActive = action.payload;
    },
    setTraversalPath(state, action) {
      state.traversalPath = action.payload;
    },
    setTraversalVisibleNodeIds(state, action) {
      state.traversalVisibleNodeIds = action.payload;
    },
    setTraversalVisibleLinkIds(state, action) {
      state.traversalVisibleLinkIds = action.payload;
    },
    setExplorerModeActive(state, action) {
      state.explorerModeActive = action.payload;
    },
    setExpandedNodeIds(state, action) {
      state.expandedNodeIds = action.payload;
    },
    toggleExpandedNode(state, action) {
      const id = String(action.payload);
      const idx = state.expandedNodeIds.indexOf(id);
      if (idx >= 0) {
        state.expandedNodeIds.splice(idx, 1);
      } else {
        state.expandedNodeIds.push(id);
      }
    },

    // --- Path highlighting ---
    setHighlightedNodeIds(state, action) {
      state.highlightedNodeIds = action.payload;
    },
    setHighlightedLinkIds(state, action) {
      state.highlightedLinkIds = action.payload;
    },
    setPathLoading(state, action) {
      state.pathLoading = action.payload;
    },
    setPathError(state, action) {
      state.pathError = action.payload;
    },
    setPathSummary(state, action) {
      state.pathSummary = action.payload;
    },
    clearPath(state) {
      state.pathSummary = null;
      state.pathError = '';
      state.highlightedNodeIds = [];
      state.highlightedLinkIds = [];
    },

    // --- Editing ---
    setEditMode(state, action) {
      state.editMode = action.payload;
    },
    setActiveNode(state, action) {
      state.activeNode = action.payload;
    },
    setActiveRelationship(state, action) {
      state.activeRelationship = action.payload;
    },
    setDrawerOpen(state, action) {
      state.drawerOpen = action.payload;
    },

    // --- Signals ---
    triggerAddNodeSignal(state) {
      state.addNodeSignal += 1;
    },
    triggerResetPinnedSignal(state) {
      state.resetPinnedSignal += 1;
    },
    triggerResetViewSignal(state) {
      state.resetViewSignal += 1;
    },
    setJumpRequest(state, action) {
      state.jumpRequest = action.payload;
    },

    // --- Bulk reset (folder change / view reset) ---
    resetGraphView(state) {
      state.nodeSearch = '';
      state.minDegree = 0;
      state.showOrphans = true;
      state.nodeTypeFilters = [];
      state.relationshipTypeFilters = [];
      state.traversalModeActive = false;
      state.explorerModeActive = false;
      state.expandedNodeIds = [];
      state.traversalPath = [];
      state.traversalVisibleNodeIds = [];
      state.traversalVisibleLinkIds = [];
      state.pathSummary = null;
      state.pathError = '';
      state.highlightedNodeIds = [];
      state.highlightedLinkIds = [];
      state.sidebarOpen = false;
      state.toolsOpen = false;
      state.resetViewSignal += 1;
    },

    // --- Hydrate UI state from localStorage ---
    hydrateUIState(state, action) {
      const parsed = action.payload;
      if (!parsed || typeof parsed !== 'object') return;
      if (typeof parsed.toolsOpen === 'boolean') state.toolsOpen = parsed.toolsOpen;
      if (typeof parsed.sidebarOpen === 'boolean') state.sidebarOpen = parsed.sidebarOpen;
      if (typeof parsed.activePanel === 'string') state.activePanel = parsed.activePanel;
      if (typeof parsed.showNodeLabels === 'boolean') state.showNodeLabels = parsed.showNodeLabels;
      if (typeof parsed.showRelationshipLabels === 'boolean') state.showRelationshipLabels = parsed.showRelationshipLabels;
      if (typeof parsed.lockDraggedNodes === 'boolean') state.lockDraggedNodes = parsed.lockDraggedNodes;
      if (typeof parsed.linkStyle === 'string') state.linkStyle = parsed.linkStyle;
      if (parsed.nodeTypeColors && typeof parsed.nodeTypeColors === 'object') state.nodeTypeColors = parsed.nodeTypeColors;
      if (parsed.relationshipTypeColors && typeof parsed.relationshipTypeColors === 'object') state.relationshipTypeColors = parsed.relationshipTypeColors;
    },
  },
});

export const {
  setGraphData, setGraphStats, setHydrationStatus, triggerRefresh,
  setNodeSearch, setMinDegree, setShowOrphans,
  toggleNodeTypeFilter, setNodeTypeFilters,
  toggleRelationshipTypeFilter, setRelationshipTypeFilters,
  clearAllFilters,
  setNodeTypeColors, setRelationshipTypeColors,
  setSidebarOpen, setToolsOpen, toggleToolsOpen,
  setActivePanel, openToolPanel,
  toggleShowNodeLabels, toggleShowRelationshipLabels, setShowNodeLabels,
  toggleLockDraggedNodes, toggleLinkStyle,
  setTraversalModeActive, setTraversalPath,
  setTraversalVisibleNodeIds, setTraversalVisibleLinkIds,
  setExplorerModeActive, setExpandedNodeIds, toggleExpandedNode,
  setHighlightedNodeIds, setHighlightedLinkIds,
  setPathLoading, setPathError, setPathSummary, clearPath,
  setEditMode, setActiveNode, setActiveRelationship, setDrawerOpen,
  triggerAddNodeSignal, triggerResetPinnedSignal, triggerResetViewSignal,
  setJumpRequest,
  resetGraphView, hydrateUIState,
} = graphSlice.actions;

export default graphSlice.reducer;
