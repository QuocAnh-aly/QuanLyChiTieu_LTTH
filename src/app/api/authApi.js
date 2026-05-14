import axiosClient from './axiosClient';

export const authApi = {
  login(data) {
    const url = '/api/auth/signin';
    return axiosClient.post(url, data);
  },

  register(data) {
    const url = '/api/auth/signup';
    return axiosClient.post(url, data);
  },

  refresh() {
    const url = '/api/auth/refresh';
    return axiosClient.get(url);
  },

  getProfile() {
    const url = '/api/auth/profile';
    return axiosClient.get(url);
  },

  updateProfile(data) {
    const url = '/api/auth/profile';
    return axiosClient.put(url, data);
  },

  changePassword(data) {
    const url = '/api/auth/password';
    return axiosClient.put(url, data);
  },
};
