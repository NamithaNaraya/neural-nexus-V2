import api from './api';

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          query.append(key, item);
        }
      });
      return;
    }

    query.append(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const analyticsService = {
  async runAlgorithm(endpoint, params) {
    const response = await api.get(`${endpoint}${buildQuery(params)}`);
    return response.data;
  },
};
