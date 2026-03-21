import api from './api';

export const analyticsService = {
  async getAnomalies(parameter = 'LST', city = 'Ahmedabad') {
    const { data } = await api.post('/analytics/anomalies', { parameter, city });
    return data;
  },

  async getTrends(parameter = 'LST', city = 'Ahmedabad') {
    const { data } = await api.post('/analytics/trends', { parameter, city });
    return data;
  },

  async getHotspots(parameter = 'LST', city = 'Ahmedabad') {
    const { data } = await api.post('/analytics/hotspots', { parameter, city });
    return data;
  },

  async getSummary(city = 'Ahmedabad') {
    const { data } = await api.get(`/analytics/summary/${city}`);
    return data;
  },
};
