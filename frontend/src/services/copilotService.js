import api from './api';

export const copilotService = {
  async chat({ city, page, question, parameter, dateRange }) {
    const { data } = await api.post('/copilot/chat', {
      city,
      page,
      question,
      parameter,
      date_range: dateRange,
    });
    return data;
  },
};
