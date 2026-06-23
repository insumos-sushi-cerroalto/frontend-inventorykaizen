// src/api/inventario.js
import apiClient from './config';

// Obtener inventario
export const fetchInventario = async () => {
  try {
    const response = await apiClient.get('/api/inventario/');
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    throw error;
  }
};

// Obtener reporte financiero
export const fetchReporteFinanciero = async () => {
  try {
    const response = await apiClient.get('/api/inventario/reporte_financiero/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener reporte financiero:', error);
    throw error;
  }
};
