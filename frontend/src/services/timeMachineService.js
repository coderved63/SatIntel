import api from './api';

export const timeMachineService = {
  async compare(param = 'LST', city = 'ahmedabad') {
    const { data } = await api.get(`/time-machine/compare?param=${param}&city=${city}`);
    return data;
  },
  async getParams() {
    const { data } = await api.get('/time-machine/params');
    return data;
  },
};
