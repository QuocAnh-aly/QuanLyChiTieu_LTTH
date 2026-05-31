import axiosClient from './axiosClient';

export const accountApi = {
  getAll(params = {}) {
    return axiosClient.get('/api/accounts', { params });
  },

  getByType(typeId, params = {}) {
    return axiosClient.get(`/api/accounts/type/${typeId}`, { params });
  },

  getById(id) {
    const url = `/api/accounts/${id}`;
    return axiosClient.get(url);
  },

  getWalletSummary() {
    const url = '/api/accounts/wallet-summary';
    return axiosClient.get(url);
  },

  create(data) {
    const url = '/api/accounts';
    return axiosClient.post(url, data);
  },

  update(id, data) {
    const url = `/api/accounts/${id}`;
    return axiosClient.put(url, data);
  },

  delete(id) {
    const url = `/api/accounts/${id}`;
    return axiosClient.delete(url);
  },
};
