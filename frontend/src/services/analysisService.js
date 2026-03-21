import api from './api';

export const analysisService = {
  async getVegetation(city = 'Ahmedabad') {
    const { data } = await api.get(`/analysis/vegetation?city=${city}`);
    return data;
  },
  async getLandConversion(city = 'Ahmedabad') {
    const { data } = await api.get(`/analysis/land-conversion?city=${city}`);
    return data;
  },
  async getFarmland(city = 'Ahmedabad') {
    const { data } = await api.get(`/analysis/farmland?city=${city}`);
    return data;
  },
  async getHeat(city = 'Ahmedabad') {
    const { data } = await api.get(`/analysis/heat?city=${city}`);
    return data;
  },
  async getFullReport(city = 'Ahmedabad') {
    const { data } = await api.get(`/analysis/full-report?city=${city}`);
    return data;
  },
};
