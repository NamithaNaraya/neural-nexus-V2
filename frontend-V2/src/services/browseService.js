import api from './api';
import { readCache, writeCache, clearCache } from '../utils/cache';

const TTL = 5 * 60 * 1000;

export const browseService = {
  async getNodeTypes(folderId, { force = false } = {}) {
    const cacheKey = folderId ? `nnv2:browse:types:${folderId}` : 'nnv2:browse:types:global';
    if (!force) {
      const cached = readCache(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
    }

    const url = folderId ? `/browse/types?folder_id=${encodeURIComponent(folderId)}` : '/browse/types';
    const response = await api.get(url);
    writeCache(cacheKey, response.data, TTL);
    return response.data;
  },

  async getNodesByType(nodeType, folderId, page = 1, pageSize = 20, q = '', { force = false } = {}) {
    const cacheKey = `nnv2:browse:nodes:${folderId || 'global'}:${nodeType}:${page}:${pageSize}:${q}`;
    if (!force) {
      const cached = readCache(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
    }

    const encodedType = encodeURIComponent(nodeType);
    let url = `/browse/nodes/${encodedType}?page=${page}&page_size=${pageSize}`;
    if (folderId) url += `&folder_id=${encodeURIComponent(folderId)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    const response = await api.get(url);
    writeCache(cacheKey, response.data, TTL);
    return response.data;
  },

  clearBrowseCache(folderId) {
    clearCache(folderId ? `nnv2:browse:types:${folderId}` : 'nnv2:browse:types:global');
  },
};
