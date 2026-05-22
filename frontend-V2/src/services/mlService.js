import api from './api';

export const mlService = {
  async getModels() {
    const response = await api.get('/ml/models');
    return response.data;
  },

  async dropModel(modelName) {
    const response = await api.delete(`/ml/model/${encodeURIComponent(modelName)}`);
    return response.data;
  },

  async trainLinkPrediction(folderId, pipelineName, modelName) {
    const response = await api.post('/ml/link-prediction/train', null, {
      params: {
        folder_id: folderId,
        pipeline_name: pipelineName,
        model_name: modelName,
      },
    });
    return response.data;
  },

  async predictLinks(folderId, modelName, threshold = 0.5, topN = 50) {
    const response = await api.get('/ml/link-prediction/predict', {
      params: {
        folder_id: folderId,
        model_name: modelName,
        threshold,
        top_n: topN,
      },
    });
    return response.data;
  },

  async trainNodeClassification(pipelineName, modelName) {
    const response = await api.post('/ml/node-classification/train', null, {
      params: {
        pipeline_name: pipelineName,
        model_name: modelName,
      },
    });
    return response.data;
  },

  async predictNodeClasses(modelName, topN = 100) {
    const response = await api.get('/ml/node-classification/predict', {
      params: {
        model_name: modelName,
        top_n: topN,
      },
    });
    return response.data;
  },

  async generateEmbeddings(folderId, method = 'fastRP', dim = 128) {
    const response = await api.get('/ml/embeddings/generate', {
      params: {
        folder_id: folderId,
        method,
        dim,
        top_k: 200,
      },
    });
    return response.data;
  },

  async nodeSimilarity(folderId, topK = 10, cutoff = 0.1) {
    const response = await api.get('/ml/node-similarity', {
      params: {
        folder_id: folderId,
        top_k: topK,
        cutoff,
      },
    });
    return response.data;
  },
};

export default mlService;
