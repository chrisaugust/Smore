import axios from 'axios';

const API_URL = 
  process.env.NODE_ENV === 'production'
    ? 'http://localhost:3005'
    : 'http://localhost:3005';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
