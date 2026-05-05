import api from './api';

export const analyticsService = {
  async getAnomalies(parameter = 'LST', city = 'ahmedabad', dateRange) {
    const { data } = await api.post('/analytics/anomalies', { parameter, city, date_range: dateRange });
    return data;
  },

  async getTrends(parameter = 'LST', city = 'ahmedabad', dateRange) {
    const { data } = await api.post('/analytics/trends', { parameter, city, date_range: dateRange });
    return data;
  },

  async getHotspots(parameter = 'LST', city = 'ahmedabad', dateRange) {
    const { data } = await api.post('/analytics/hotspots', { parameter, city, date_range: dateRange });
    return data;
  },

  async getSummary(city = 'ahmedabad', dateRange) {
    const { data } = await api.get(`/analytics/summary/${city}`, { params: dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {} });
    return data;
  },
};
