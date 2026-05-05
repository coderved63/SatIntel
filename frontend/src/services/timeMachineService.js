import api from './api';

export const timeMachineService = {
  async compare(param = 'LST', city = 'ahmedabad', dateRange) {
    const { data } = await api.get(`/time-machine/compare`, { params: { param, city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
  async getParams() {
    const { data } = await api.get('/time-machine/params');
    return data;
  },
};
