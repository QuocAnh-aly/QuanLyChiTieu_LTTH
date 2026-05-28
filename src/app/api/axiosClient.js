import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5229', // APIGateway URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for requests
axiosClient.interceptors.request.use(
  (config) => {
    // You can attach token here later if needed
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor for responses
axiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      return response.data;
    }
    return response;
  },
  (error) => {
    // Handle errors globally
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default axiosClient;
