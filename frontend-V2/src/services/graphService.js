import api from './api';
import { clearCache, readCache, writeCache } from '../utils/cache';

const TTL = {
  graph: 10 * 60 * 1000,
  details: 10 * 60 * 1000,
  types: 10 * 60 * 1000,
  search: 2 * 60 * 1000,
};

const keyFor = {
  all: (limit) => `nnv2:graph:all:${limit || 'full'}`,
  folder: (folderId, limit, offset = 0) => `nnv2:graph:folder:${folderId}:${offset}:${limit || 'full'}`,
  file: (fileId) => `nnv2:graph:file:${fileId}`,
  nodeDetails: (nodeId) => `nnv2:graph:node-details:${nodeId}`,
  nodeNeighbors: (nodeId) => `nnv2:graph:node-neighbors:${nodeId}`,
  nodeTypes: () => 'nnv2:graph:node-types',
  relationshipTypes: () => 'nnv2:graph:relationship-types',
};

async function cached(key, ttl, fetcher, force = false) {
  if (!force) {
    const cachedValue = readCache(key);
    if (cachedValue !== null && cachedValue !== undefined) return cachedValue;
  }

  const data = await fetcher();
  writeCache(key, data, ttl);
  return data;
}

function invalidateGraphCaches(folderId) {
  const keys = [
    keyFor.all(),
    keyFor.all(10000),
    keyFor.folder(folderId, 10000),
    keyFor.folder(folderId, 600),
    keyFor.nodeTypes(),
    keyFor.relationshipTypes(),
  ];

  keys.forEach((key) => clearCache(key));
  if (folderId) {
    clearCache(`nnv2:browse:types:${folderId}`);
    clearCache(`nnv2:browse:nodes:${folderId}:all:1:20:`);
  }
}

function emitGraphCrudEvent(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('nnv2:graph-crud', { detail }));
}

export const graphService = {
  async getAll(limit, { force = false } = {}) {
    return cached(keyFor.all(limit), TTL.graph, async () => {
      const response = await api.get(`/graph/all${limit ? `?limit=${limit}` : ''}`);
      return response.data;
    }, force);
  },

  async getFolder(folderId, limit, { force = false, offset = 0 } = {}) {
    return cached(keyFor.folder(folderId, limit, offset), TTL.graph, async () => {
      const query = new URLSearchParams();
      if (limit) query.set('limit', String(limit));
      if (offset > 0) query.set('offset', String(offset));
      const response = await api.get(`/graph/folder/${folderId}${query.toString() ? `?${query.toString()}` : ''}`);
      return response.data;
    }, force);
  },

  async getFile(fileId, { force = false } = {}) {
    return cached(keyFor.file(fileId), TTL.graph, async () => {
      const response = await api.get(`/graph/file/${fileId}`);
      return response.data;
    }, force);
  },

  async search(query, limit = 20) {
    const response = await api.get(`/graph/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },

  async getNodeDetails(nodeId, { force = false } = {}) {
    return cached(keyFor.nodeDetails(nodeId), TTL.details, async () => {
      const response = await api.get(`/graph/node/${nodeId}/details`);
      return response.data;
    }, force);
  },

  async getNodeNeighbors(nodeId, { force = false } = {}) {
    return cached(keyFor.nodeNeighbors(nodeId), TTL.details, async () => {
      const response = await api.get(`/graph/node/${nodeId}/neighbors`);
      return response.data;
    }, force);
  },

  async expandNode(nodeId, { depth = 1, relationshipTypes = null, force = false } = {}) {
    const query = new URLSearchParams();
    if (depth) query.append('depth', String(depth));
    if (relationshipTypes && relationshipTypes.length) query.append('relationship_types', relationshipTypes.join(','));
    const cacheKey = `nnv2:graph:expand:${nodeId}:${depth}:${relationshipTypes?.join('|') || 'all'}`;
    return cached(cacheKey, TTL.details, async () => {
      const response = await api.get(`/graph/expand/${nodeId}${query.toString() ? `?${query.toString()}` : ''}`);
      return response.data;
    }, force);
  },

  async getNodeTypes({ force = false } = {}) {
    return cached(keyFor.nodeTypes(), TTL.types, async () => {
      const response = await api.get('/graph/node-types');
      return response.data;
    }, force);
  },

  async getRelationshipTypes({ force = false } = {}) {
    return cached(keyFor.relationshipTypes(), TTL.types, async () => {
      const response = await api.get('/graph/relationship-types');
      return response.data;
    }, force);
  },

  async findPath(sourceId, targetId) {
    const response = await api.get(`/graph/path/${encodeURIComponent(sourceId)}/${encodeURIComponent(targetId)}`);
    return response.data;
  },

  async searchForCrud(q, folderId, limit = 20) {
    const params = new URLSearchParams();
    params.append('q', q);
    if (folderId) params.append('folder_id', folderId);
    if (limit) params.append('limit', String(limit));
    const response = await api.get(`/graph/nodes/search?${params.toString()}`);
    return response.data;
  },

  async createNode(data) {
    const response = await api.post('/graph/nodes', data);
    invalidateGraphCaches(data?.folder_id);
    emitGraphCrudEvent({ type: 'node:create', folderId: data?.folder_id, nodeId: response.data?.node?.id });
    return response.data;
  },

  async updateNode(nodeId, data) {
    const response = await api.put(`/graph/nodes/${nodeId}`, data);
    invalidateGraphCaches(data?.folder_id);
    clearCache(`nnv2:graph:node-details:${nodeId}`);
    emitGraphCrudEvent({ type: 'node:update', folderId: data?.folder_id, nodeId });
    return response.data;
  },

  async deleteNode(nodeId, folderId) {
    const response = await api.delete(`/graph/nodes/${nodeId}`);
    invalidateGraphCaches(folderId);
    clearCache(`nnv2:graph:node-details:${nodeId}`);
    clearCache(`nnv2:graph:node-neighbors:${nodeId}`);
    emitGraphCrudEvent({ type: 'node:delete', folderId, nodeId });
    return response.data;
  },

  async createRelationship(data) {
    const response = await api.post('/graph/relationships', data);
    invalidateGraphCaches(data?.folder_id);
    emitGraphCrudEvent({ type: 'relationship:create', folderId: data?.folder_id });
    return response.data;
  },

  async deleteRelationship(relationshipId, folderId) {
    const response = await api.delete(`/graph/relationships/${relationshipId}`);
    invalidateGraphCaches(folderId);
    emitGraphCrudEvent({ type: 'relationship:delete', folderId, relationshipId });
    return response.data;
  },

  async updateRelationship(relationshipId, data) {
    const response = await api.put(`/graph/relationships/${relationshipId}`, data);
    invalidateGraphCaches(data?.folder_id);
    emitGraphCrudEvent({ type: 'relationship:update', folderId: data?.folder_id, relationshipId });
    return response.data;
  },
};
