import api from './api';

export const fileService = {
  // Get file details
  async get(fileId) {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  // Get file processing status (for polling)
  async getStatus(fileId) {
    const response = await api.get(`/files/${fileId}/status`);
    return response.data;
  },

  // List pending files (ready for review)
  async listPending() {
    const response = await api.get('/files/pending');
    return response.data;
  },

  // Get extraction preview
  async getExtractionPreview(fileId) {
    const response = await api.get(`/files/${fileId}/extraction-preview`);
    return response.data;
  },

  // Update extraction data
  async updateExtraction(fileId, entities, relationships) {
    const response = await api.put(`/files/${fileId}/extraction`, { entities, relationships });
    return response.data;
  },

  // Approve file ingestion
  async approve(fileId) {
    const response = await api.post(`/files/${fileId}/approve`);
    return response.data;
  },

  // Reject file ingestion
  async reject(fileId, reason = null) {
    const response = await api.post(`/files/${fileId}/reject`, null, {
      params: reason ? { reason } : {},
    });
    return response.data;
  },

  // Delete file
  async delete(fileId) {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  // Rename file
  async rename(fileId, newFilename) {
    const response = await api.patch(`/files/${fileId}`, { filename: newFilename });
    return response.data;
  },
};
