import api from './api';

export const satelliteService = {
  async fetchData(city = 'ahmedabad', parameters = ['LST', 'NDVI', 'NO2', 'SOIL_MOISTURE'], dateRange = {}) {
    const { data } = await api.post('/satellite/fetch', { city, parameters, date_range: dateRange });
    return data;
  },

  async getParameters() {
    const { data } = await api.get('/satellite/parameters');
    return data;
  },

  async getTimeSeries(parameter, city = 'ahmedabad') {
    const { data } = await api.get(`/satellite/timeseries/${parameter}?city=${city}`);
    return data;
  },
};
