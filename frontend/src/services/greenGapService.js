import api from './api';

export const greenGapService = {
  async analyse(city = 'ahmedabad') {
    const { data } = await api.get(`/green-gap/analyse?city=${city}`);
    return data;
  },
};
