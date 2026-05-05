import api from './api';

export const analysisService = {
  async getVegetation(city = 'Ahmedabad', dateRange) {
    const { data } = await api.get(`/analysis/vegetation`, { params: { city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
  async getLandConversion(city = 'Ahmedabad', dateRange) {
    const { data } = await api.get(`/analysis/land-conversion`, { params: { city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
  async getFarmland(city = 'Ahmedabad', dateRange) {
    const { data } = await api.get(`/analysis/farmland`, { params: { city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
  async getHeat(city = 'Ahmedabad', dateRange) {
    const { data } = await api.get(`/analysis/heat`, { params: { city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
  async getFullReport(city = 'Ahmedabad', dateRange) {
    const { data } = await api.get(`/analysis/full-report`, { params: { city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
};
