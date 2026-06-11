import axiosClient from './axiosClient';

export const transactionApi = {
  getAll(params) {
    const url = '/api/transactions';
    return axiosClient.get(url, { params });
  },

  getByRange(from, to) {
    const url = '/api/transactions/range';
    return axiosClient.get(url, { params: { from, to } });
  },

  getByRangeAndAccount(accountId, from, to) {
    const url = '/api/transactions/range/account';
    return axiosClient.get(url, { params: { accountId, from, to } });
  },

  getByRangeAndBudget(budgetId, from, to) {
    const url = '/api/transactions/range/budget';
    return axiosClient.get(url, { params: { budgetId, from, to } });
  },

  getByRangeAndBudgetWithUntracked(budgetId, accountId, from, to) {
    const url = '/api/transactions/range/budget/untracked';
    return axiosClient.get(url, { params: { budgetId, accountId, from, to } });
  },

  getById(id) {
    const url = `/api/transactions/${id}`;
    return axiosClient.get(url);
  },

  getCashFlow(from, to) {
    const url = '/api/transactions/cashflow';
    return axiosClient.get(url, { params: { from, to } });
  },

  create(data) {
    const url = '/api/transactions';
    return axiosClient.post(url, data);
  },

  update(id, data) {
    const url = `/api/transactions/${id}`;
    return axiosClient.put(url, data);
  },

  delete(id) {
    const url = `/api/transactions/${id}`;
    return axiosClient.delete(url);
  },
};
