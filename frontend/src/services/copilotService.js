import api from './api';

export const copilotService = {
  async chat({ city = 'ahmedabad', page = 'dashboard', question, parameter = null, date_range = null }) {
    const { data } = await api.post('/copilot/chat', {
      city,
      page,
      question,
      parameter,
      date_range,
    });
    return data;
  },
};
