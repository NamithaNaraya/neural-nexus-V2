import { useQuery } from '@tanstack/react-query';
import { graphService } from '../../services/graphService';

const GRAPH_STALE_TIME = 2 * 60 * 1000; // 2 minutes

/**
 * Fetches graph data for a folder with automatic caching & deduplication.
 * Replaces the manual loadGraphContext() + useState pattern in GraphPage.
 *
 * @param {string|null} folderId - Folder to fetch graph for
 * @param {object} options - { limit, enabled }
 */
export function useGraphData(folderId, options = {}) {
  const { limit = 500, enabled = true } = options;

  return useQuery({
    queryKey: ['graph', 'folder', folderId, limit],
    queryFn: () => graphService.getFolder(folderId, limit),
    enabled: !!folderId && enabled,
    staleTime: GRAPH_STALE_TIME,
    placeholderData: { nodes: [], links: [] },
    select: (data) => data || { nodes: [], links: [] },
  });
}

/**
 * Fetches node details by ID with caching.
 */
export function useNodeDetails(nodeId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['graph', 'node', nodeId],
    queryFn: () => graphService.getNodeDetails(nodeId),
    enabled: !!nodeId && enabled,
    staleTime: GRAPH_STALE_TIME,
  });
}

/**
 * Fetches node neighbors by ID with caching.
 */
export function useNodeNeighbors(nodeId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['graph', 'neighbors', nodeId],
    queryFn: () => graphService.getNodeNeighbors(nodeId),
    enabled: !!nodeId && enabled,
    staleTime: GRAPH_STALE_TIME,
  });
}

/**
 * Fetches available node types.
 */
export function useNodeTypes(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['graph', 'node-types'],
    queryFn: () => graphService.getNodeTypes(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches available relationship types.
 */
export function useRelationshipTypes(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['graph', 'relationship-types'],
    queryFn: () => graphService.getRelationshipTypes(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
