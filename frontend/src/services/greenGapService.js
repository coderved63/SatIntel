import api from './api';

export const greenGapService = {
  async analyse(city = 'ahmedabad', dateRange) {
    const { data } = await api.get(`/green-gap/analyse`, { params: { city, ...(dateRange ? { start_date: dateRange.start_date, end_date: dateRange.end_date } : {}) } });
    return data;
  },
};
