import api from './api';

export const weightsService = {
  async discoverProperties(folderId) {
    const response = await api.get(`/weights/properties/${folderId}`);
    return response.data;
  },
};
