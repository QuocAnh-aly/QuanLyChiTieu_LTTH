import axiosClient from './axiosClient';

export const accountApi = {
  getAll() {
    const url = '/api/accounts';
    return axiosClient.get(url);
  },

  getByType(typeId) {
    const url = `/api/accounts/type/${typeId}`;
    return axiosClient.get(url);
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
