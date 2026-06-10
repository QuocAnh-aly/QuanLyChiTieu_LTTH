import axiosClient from './axiosClient';

export const accountApi = {
  getAll(params = {}) {
    return axiosClient.get('/api/accounts', { params });
  },

  getByType(typeId, params = {}) {
    return axiosClient.get(`/api/accounts/type/${typeId}`, { params });
  },

  getById(id) {
    return axiosClient.get(`/api/accounts/${id}`);
  },

  getSummary(params = {}) {
    return axiosClient.get('/api/accounts/wallet-summary', { params });
  },

  create(data) {
    return axiosClient.post('/api/accounts', data);
  },

  update(id, data) {
    return axiosClient.put(`/api/accounts/${id}`, data);
  },

  delete(id) {
    return axiosClient.delete(`/api/accounts/${id}`);
  },
};
