import axiosClient from './axiosClient';

export const walletApi = {
  getSummary(params = {}) {
    return axiosClient.get('/api/accounts/wallet-summary', { params });
  },

  getAll(params = {}) {
    return axiosClient.get('/api/accounts', { params });
  },

  getByType(typeId) {
    return axiosClient.get(`/api/accounts/type/${typeId}`);
  },

  getById(id) {
    return axiosClient.get(`/api/accounts/${id}`);
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
