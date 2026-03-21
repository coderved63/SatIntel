import api from './api';

export const actionPlanService = {
  async generatePlan(city = 'ahmedabad', parameters = ['LST', 'NDVI', 'NO2', 'SOIL_MOISTURE']) {
    const { data } = await api.post('/action-plan/generate', { city, parameters });
    return data;
  },

  async getPlanHistory() {
    const { data } = await api.get('/action-plan/history');
    return data;
  },
};
