/**
 * useGraphData — Phase 2 TanStack Query hooks for all graph data fetching.
 *
 * Replaces the manual readCache/writeCache pattern in graphService.js with
 * TanStack Query's built-in caching, background-refetching, and invalidation.
 *
 * Usage:
 *   const { data, isLoading, error } = useGraphFolder(folderId);
 *   queryClient.invalidateQueries({ queryKey: graphKeys.folder(folderId) });
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ── Query key factory ─────────────────────────────────────────────────────
export const graphKeys = {
  all:               ()                   => ['graph'],
  lists:             ()                   => ['graph', 'list'],
  folder:            (folderId, limit)    => ['graph', 'folder', folderId, limit],
  folderPage:        (folderId, offset, limit) => ['graph', 'folder', folderId, offset, limit],
  file:              (fileId)             => ['graph', 'file', fileId],
  node:              (nodeId)             => ['graph', 'node', nodeId],
  nodeNeighbors:     (nodeId)             => ['graph', 'node', nodeId, 'neighbors'],
  nodeTypes:         ()                   => ['graph', 'nodeTypes'],
  relationshipTypes: ()                   => ['graph', 'relationshipTypes'],
  search:            (q, limit)           => ['graph', 'search', q, limit],
  expand:            (nodeId, depth, rel) => ['graph', 'expand', nodeId, depth, rel],
  path:              (src, tgt)           => ['graph', 'path', src, tgt],
};

const STALE_TIME = {
  graph:  10 * 60 * 1000, // 10 min
  types:  10 * 60 * 1000,
  search:  2 * 60 * 1000, // 2 min
};

// ── Fetcher helpers ───────────────────────────────────────────────────────
const fetchFolder = async (folderId, limit, offset = 0) => {
  const q = new URLSearchParams();
  if (limit)    q.set('limit',  String(limit));
  if (offset)   q.set('offset', String(offset));
  const res = await api.get(`/graph/folder/${folderId}${q.toString() ? `?${q}` : ''}`);
  return res.data;
};

const fetchFile = async (fileId) => {
  const res = await api.get(`/graph/file/${fileId}`);
  return res.data;
};

const fetchNodeDetails = async (nodeId) => {
  const res = await api.get(`/graph/node/${nodeId}/details`);
  return res.data;
};

const fetchNodeNeighbors = async (nodeId) => {
  const res = await api.get(`/graph/node/${nodeId}/neighbors`);
  return res.data;
};

const fetchNodeTypes = async () => {
  const res = await api.get('/graph/node-types');
  return res.data;
};

const fetchRelationshipTypes = async () => {
  const res = await api.get('/graph/relationship-types');
  return res.data;
};

const fetchSearch = async (q, limit) => {
  const res = await api.get(`/graph/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return res.data;
};

const fetchExpand = async (nodeId, depth, relationshipTypes) => {
  const q = new URLSearchParams();
  if (depth) q.append('depth', String(depth));
  if (relationshipTypes?.length) q.append('relationship_types', relationshipTypes.join(','));
  const res = await api.get(`/graph/expand/${nodeId}${q.toString() ? `?${q}` : ''}`);
  return res.data;
};

const fetchPath = async (sourceId, targetId) => {
  const res = await api.get(`/graph/path/${encodeURIComponent(sourceId)}/${encodeURIComponent(targetId)}`);
  return res.data;
};

// ── Query hooks ───────────────────────────────────────────────────────────

/** Fetch all graph data for a folder (progressive: specify limit for pagination). */
export function useGraphFolder(folderId, limit, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.folder(folderId, limit),
    queryFn:   () => fetchFolder(folderId, limit),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(folderId) && enabled,
  });
}

/** Fetch a specific page of folder graph data for progressive loading. */
export function useGraphFolderPage(folderId, offset, limit, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.folderPage(folderId, offset, limit),
    queryFn:   () => fetchFolder(folderId, limit, offset),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(folderId) && enabled,
  });
}

/** Fetch graph data scoped to a file. */
export function useGraphFile(fileId, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.file(fileId),
    queryFn:   () => fetchFile(fileId),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(fileId) && enabled,
  });
}

/** Fetch detailed info for a single node. */
export function useNodeDetails(nodeId, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.node(nodeId),
    queryFn:   () => fetchNodeDetails(nodeId),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(nodeId) && enabled,
  });
}

/** Fetch direct neighbors of a node. */
export function useNodeNeighbors(nodeId, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.nodeNeighbors(nodeId),
    queryFn:   () => fetchNodeNeighbors(nodeId),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(nodeId) && enabled,
  });
}

/** Fetch available node types. */
export function useNodeTypes() {
  return useQuery({
    queryKey:  graphKeys.nodeTypes(),
    queryFn:   fetchNodeTypes,
    staleTime: STALE_TIME.types,
  });
}

/** Fetch available relationship types. */
export function useRelationshipTypes() {
  return useQuery({
    queryKey:  graphKeys.relationshipTypes(),
    queryFn:   fetchRelationshipTypes,
    staleTime: STALE_TIME.types,
  });
}

/** Search nodes by text. */
export function useGraphSearch(query, limit = 20, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.search(query, limit),
    queryFn:   () => fetchSearch(query, limit),
    staleTime: STALE_TIME.search,
    enabled:   Boolean(query) && enabled,
  });
}

/** Expand a node's neighbourhood graph. */
export function useExpandNode(nodeId, depth = 1, relationshipTypes = null, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.expand(nodeId, depth, relationshipTypes?.join('|')),
    queryFn:   () => fetchExpand(nodeId, depth, relationshipTypes),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(nodeId) && enabled,
  });
}

/** Find the shortest path between two nodes. */
export function useGraphPath(sourceId, targetId, { enabled = true } = {}) {
  return useQuery({
    queryKey:  graphKeys.path(sourceId, targetId),
    queryFn:   () => fetchPath(sourceId, targetId),
    staleTime: STALE_TIME.graph,
    enabled:   Boolean(sourceId) && Boolean(targetId) && enabled,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────

/** Create a node — invalidates folder graph on success. */
export function useCreateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/graph/nodes', data).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: graphKeys.all() });
      if (variables.folder_id) {
        queryClient.invalidateQueries({ queryKey: graphKeys.folder(variables.folder_id) });
      }
    },
  });
}

/** Update a node — invalidates folder graph and node details on success. */
export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, data }) => api.put(`/graph/nodes/${nodeId}`, data).then((r) => r.data),
    onSuccess: (_, { nodeId, data }) => {
      queryClient.invalidateQueries({ queryKey: graphKeys.all() });
      queryClient.invalidateQueries({ queryKey: graphKeys.node(nodeId) });
      if (data.folder_id) {
        queryClient.invalidateQueries({ queryKey: graphKeys.folder(data.folder_id) });
      }
    },
  });
}

/** Delete a node — invalidates folder graph on success. */
export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId }) => api.delete(`/graph/nodes/${nodeId}`).then((r) => r.data),
    onSuccess: (_, { nodeId, folderId }) => {
      queryClient.invalidateQueries({ queryKey: graphKeys.all() });
      queryClient.removeQueries({ queryKey: graphKeys.node(nodeId) });
      if (folderId) {
        queryClient.invalidateQueries({ queryKey: graphKeys.folder(folderId) });
      }
    },
  });
}

/** Create a relationship — invalidates folder graph. */
export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/graph/relationships', data).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: graphKeys.all() });
      if (variables.folder_id) {
        queryClient.invalidateQueries({ queryKey: graphKeys.folder(variables.folder_id) });
      }
    },
  });
}

/** Delete a relationship — invalidates folder graph. */
export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ relationshipId }) =>
      api.delete(`/graph/relationships/${relationshipId}`).then((r) => r.data),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: graphKeys.all() });
      if (folderId) {
        queryClient.invalidateQueries({ queryKey: graphKeys.folder(folderId) });
      }
    },
  });
}

/** Update a relationship — invalidates folder graph. */
export function useUpdateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ relationshipId, data }) =>
      api.put(`/graph/relationships/${relationshipId}`, data).then((r) => r.data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: graphKeys.all() });
      if (data.folder_id) {
        queryClient.invalidateQueries({ queryKey: graphKeys.folder(data.folder_id) });
      }
    },
  });
}
