// src/api/config.js
import axios from 'axios';

// Si VITE_API_URL no existe, usará la de producción por defecto
const API_URL = import.meta.env.VITE_API_URL || 'https://backend-inventorykaizen.onrender.com';

const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor para agregar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
