import axiosClient from './axiosClient';

export const dashboardApi = {
  getSummary() {
    const url = '/api/dashboard';
    return axiosClient.get(url);
  },

  getRecentTransactions(count = 5) {
    const url = '/api/dashboard/recent';
    return axiosClient.get(url, { params: { count } });
  },

  getSpendingByCategory(from, to) {
    const url = '/api/dashboard/spending';
    return axiosClient.get(url, { params: { from, to } });
  },

  getMonthlyTrend(months = 6) {
    const url = '/api/dashboard/trend';
    return axiosClient.get(url, { params: { months } });
  },
};
