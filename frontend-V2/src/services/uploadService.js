import api from './api';

export const uploadService = {
  // Upload files to a folder
  async uploadFiles(folderId, files, onProgress) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post(`/upload/${folderId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  },

  // Ingest direct Cypher query
  async ingestCypher(folderId, query, filename, fileId = null) {
    const payload = {
      query: String(query || ''),
      folder_id: String(folderId || ''),
      filename: String(filename || 'Direct Cypher Ingestion'),
    };
    if (fileId) {
      payload.file_id = String(fileId);
    }

    const response = await api.post('/upload/cypher', payload);
    return response.data;
  },

  // Ingest direct text
  async ingestText(folderId, content, filename) {
    const response = await api.post('/upload/text', {
      content: String(content || ''),
      filename: String(filename || `Text Ingestion ${new Date().toLocaleString()}`),
      folder_id: String(folderId || ''),
    });
    return response.data;
  },

  // Preview Cypher query
  async previewCypher(folderId, query) {
    const response = await api.post('/upload/cypher/preview', {
      query: String(query || ''),
      folder_id: String(folderId || ''),
    });
    return response.data;
  },
};

