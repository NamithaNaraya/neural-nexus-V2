import api from './api';

export const folderService = {
  // List all folders
  async list() {
    const response = await api.get('/folders');
    return response.data;
  },

  // Get single folder
  async get(folderId) {
    const response = await api.get(`/folders/${folderId}`);
    return response.data;
  },

  // Create folder
  async create(name, description = null) {
    const response = await api.post('/folders', { name, description });
    return response.data;
  },

  // Update folder
  async update(folderId, data) {
    const response = await api.put(`/folders/${folderId}`, data);
    return response.data;
  },

  // Delete folder
  async delete(folderId) {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
  },

  // List files in folder
  async listFiles(folderId) {
    const response = await api.get(`/folders/${folderId}/files`);
    return response.data;
  },

  // Get folder permissions
  async getPermissions(folderId) {
    const response = await api.get(`/folders/${folderId}/permissions`);
    return response.data;
  },

  // Grant permission
  async grantPermission(folderId, userEmail, permission = 'read') {
    const response = await api.post(`/folders/${folderId}/permissions`, {
      user_email: userEmail,
      permission,
    });
    return response.data;
  },

  // Revoke permission
  async revokePermission(folderId, targetUserId) {
    const response = await api.delete(`/folders/${folderId}/permissions/${targetUserId}`);
    return response.data;
  },
};
