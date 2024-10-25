import axios from 'axios';

const API_URL = 
  process.env.NODE_ENV === 'production'
    ? 'https://intense-inlet-27210-0519dd6f66ca.herokuapp.com/'
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
